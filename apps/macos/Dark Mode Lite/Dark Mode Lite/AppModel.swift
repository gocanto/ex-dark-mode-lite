import AppKit
import Combine
import Foundation
import ServiceManagement

struct BrowserClientState: Identifiable, Equatable {
  let id: String
  var peerId: UUID
  var family: BrowserFamily
  var browserVersion: String
  var extensionVersion: String
  var tabs: [BrowserTab]
  var managedTabIds: Set<Int>
  var connected: Bool
}

struct PairingRequest: Identifiable, Equatable {
  let id: UUID
  let peerId: UUID
  let clientId: String
  let family: BrowserFamily
  let browserVersion: String
}

enum SafariExtensionPermission: Equatable, Sendable {
  case checking
  case enabled
  case disabled
  case unavailable
}

private enum SafariExtensionClient {
  static func fetchPermission(
    _ completion: @escaping @Sendable (SafariExtensionPermission) -> Void
  ) {
    DMLGetSafariExtensionPermission("sh.gocanto.darkmodelite.Extension") {
      available, enabled in
      if !available {
        completion(.unavailable)
      } else {
        completion(enabled ? .enabled : .disabled)
      }
    }
  }

  static func showPreferences(_ completion: @escaping @Sendable (Bool) -> Void) {
    DMLOpenSafariExtensionPreferences("sh.gocanto.darkmodelite.Extension") { succeeded in
      completion(succeeded)
    }
  }
}

/// Main-actor source of truth for the native controller and menu-bar UI.
@MainActor
final class AppModel: ObservableObject {
  @Published private(set) var settings: ControllerSettings
  @Published private(set) var revision: Int
  @Published private(set) var clients: [BrowserClientState] = []
  @Published private(set) var pairingRequests: [PairingRequest] = []
  @Published var selectedClientId: String?
  @Published var selectedTabId: Int?
  @Published private(set) var bridgeStatus: BridgeServer.Status = .stopped
  @Published private(set) var statusMessage = "Starting controller…"
  @Published private(set) var safariExtensionPermission: SafariExtensionPermission = .checking
  @Published var launchAtLogin = false

  private let bridge: BridgeServer
  private let store: SettingsStore
  private let tokenStore: PairingTokenStore
  private var authenticatedPeers: [UUID: String] = [:]
  private var helloByPeer: [UUID: Hello] = [:]
  private var statusTask: Task<Void, Never>?

  init(
    bridge: BridgeServer = BridgeServer(),
    store: SettingsStore = SettingsStore(),
    tokenStore: PairingTokenStore = PairingTokenStore()
  ) {
    self.bridge = bridge
    self.store = store
    self.tokenStore = tokenStore

    let stored = store.load()
    settings = stored.settings
    revision = stored.revision
    launchAtLogin = SMAppService.mainApp.status == .enabled

    bridge.onEvent = { [weak self] peerId, event in
      Task { @MainActor in
        self?.handle(event, from: peerId)
      }
    }
    bridge.onDisconnect = { [weak self] peerId in
      Task { @MainActor in
        self?.handleDisconnect(peerId)
      }
    }
    bridge.onStatus = { [weak self] status in
      Task { @MainActor in
        self?.handleBridgeStatus(status)
      }
    }

    store.observeExternalChanges { [weak self] state in
      guard let self, state.revision > revision else {
        return
      }

      revision = state.revision
      settings = state.settings
      broadcastSettings()
      showStatus("Settings updated from iCloud")
    }
  }

  deinit {
    statusTask?.cancel()
    bridge.stop()
  }

  var selectedClient: BrowserClientState? {
    clients.first { $0.id == selectedClientId }
  }

  var selectedTab: BrowserTab? {
    selectedClient?.tabs.first { $0.tabId == selectedTabId }
  }

  var presets: [ThemePreset] {
    ControllerSettings.builtInPresets + settings.customPresets
  }

  var selectedTabIsManaged: Bool {
    guard let selectedTabId else {
      return false
    }

    return selectedClient?.managedTabIds.contains(selectedTabId) ?? false
  }

  func start() {
    refreshSafariExtensionPermission()
    bridge.start()
  }

  func pair(_ request: PairingRequest) {
    guard helloByPeer[request.peerId]?.clientId == request.clientId else {
      pairingRequests.removeAll { $0.id == request.id }
      return
    }

    do {
      let token = try tokenStore.createToken(for: request.clientId)
      authenticate(
        peerId: request.peerId, hello: helloByPeer[request.peerId]!,
        command: .pairingAccepted(token: token))
      pairingRequests.removeAll { $0.id == request.id }
      showStatus("\(request.family.title) paired")
    } catch {
      showStatus("Pairing failed: Keychain unavailable")
    }
  }

  func reject(_ request: PairingRequest) {
    pairingRequests.removeAll { $0.id == request.id }
    helloByPeer.removeValue(forKey: request.peerId)
    showStatus("Pairing request dismissed")
  }

  func toggleSelectedTab() {
    guard let client = selectedClient, let tab = selectedTab else {
      showStatus("Choose a browser tab first")
      return
    }

    guard tab.injectable else {
      showStatus("This page cannot be styled")
      return
    }

    if client.managedTabIds.contains(tab.tabId) {
      bridge.send(.unmanage(tabId: tab.tabId), to: client.peerId)
      updateManagedTab(clientId: client.id, tabId: tab.tabId, managed: false)
      showStatus("Dark mode disabled for tab")
    } else {
      bridge.send(.manage(tabId: tab.tabId), to: client.peerId)
      updateManagedTab(clientId: client.id, tabId: tab.tabId, managed: true)
      showStatus("Dark mode applied to tab")
    }
  }

  func setEnabled(_ enabled: Bool) {
    mutateSettings("Global dark mode \(enabled ? "enabled" : "disabled")") {
      $0.enabled = enabled
    }
  }

  func setSiteEnabled(_ enabled: Bool) {
    guard let host = selectedTab?.normalizedHost, !host.isEmpty else {
      showStatus("Choose a supported page first")
      return
    }

    mutateSettings("\(host) \(enabled ? "enabled" : "blocked")") {
      $0.siteOverrides[host] = enabled
      $0.activePresetId = nil
    }
  }

  func removeSiteOverride(_ host: String) {
    mutateSettings("Removed \(host) override") {
      $0.siteOverrides.removeValue(forKey: host)
    }
  }

  func selectMode(_ mode: ThemeMode) {
    mutateSettings("\(mode.title) mode") {
      $0.mode = mode
      $0.activePresetId = nil
    }
  }

  func previewAdjustment(_ keyPath: WritableKeyPath<ControllerSettings, Double>, value: Double) {
    settings[keyPath: keyPath] = value
    settings.activePresetId = nil
    broadcastSettings()
  }

  func commitAdjustments() {
    revision += 1
    settings = SettingsNormalizer.normalize(settings)
    persistAndBroadcast()
    showStatus("Adjustments applied")
  }

  func resetAdjustment(_ keyPath: WritableKeyPath<ControllerSettings, Double>) {
    mutateSettings("Adjustment reset") {
      $0[keyPath: keyPath] = ControllerSettings.defaults[keyPath: keyPath]
      $0.activePresetId = nil
    }
  }

  func resetAdjustments() {
    mutateSettings("Adjustments reset") {
      $0.brightness = ControllerSettings.defaults.brightness
      $0.contrast = ControllerSettings.defaults.contrast
      $0.sepia = ControllerSettings.defaults.sepia
      $0.activePresetId = nil
    }
  }

  func applyPreset(_ preset: ThemePreset) {
    mutateSettings("\(preset.name) preset applied") {
      $0.mode = preset.mode
      $0.brightness = preset.brightness
      $0.contrast = preset.contrast
      $0.sepia = preset.sepia
      $0.activePresetId = preset.id
    }
  }

  func saveCustomPreset() {
    let usedNames = Set(settings.customPresets.map(\.name))
    var index = 1
    while usedNames.contains("Custom \(index)") {
      index += 1
    }

    let preset = ThemePreset(
      id: "custom-\(UUID().uuidString.lowercased())",
      name: "Custom \(index)",
      mode: settings.mode,
      brightness: settings.brightness,
      contrast: settings.contrast,
      sepia: settings.sepia,
      dot: "#F0B45A",
      builtin: false
    )

    mutateSettings("\(preset.name) saved") {
      $0.customPresets.append(preset)
      $0.activePresetId = preset.id
    }
  }

  func deletePreset(_ preset: ThemePreset) {
    guard !preset.builtin else {
      return
    }

    mutateSettings("\(preset.name) deleted") {
      $0.customPresets.removeAll { $0.id == preset.id }
      if $0.activePresetId == preset.id {
        $0.activePresetId = nil
      }
    }
  }

  func resetEverything() {
    revision += 1
    settings = .defaults
    persistAndBroadcast()
    showStatus("All settings reset")
  }

  func setLaunchAtLogin(_ enabled: Bool) {
    do {
      if enabled {
        try SMAppService.mainApp.register()
      } else {
        try SMAppService.mainApp.unregister()
      }

      launchAtLogin = enabled
      showStatus("Launch at login \(enabled ? "enabled" : "disabled")")
    } catch {
      launchAtLogin = SMAppService.mainApp.status == .enabled
      showStatus("Could not update login item")
    }
  }

  func openSafariPreferences() {
    SafariExtensionClient.showPreferences { [weak self] succeeded in
      Task { @MainActor [weak self] in
        self?.showStatus(
          succeeded ? "Safari extension settings opened" : "Could not open Safari settings")
        self?.refreshSafariExtensionPermission()
      }
    }
  }

  func refreshSafariExtensionPermission() {
    safariExtensionPermission = .checking
    SafariExtensionClient.fetchPermission { [weak self] permission in
      Task { @MainActor [weak self] in
        guard let self else {
          return
        }

        self.safariExtensionPermission = permission
      }
    }
  }

  #if DEBUG
    func configureForUITesting(_ scenario: String) {
      settings = .defaults
      revision = 0
      clients = []
      pairingRequests = []
      selectedClientId = nil
      selectedTabId = nil
      safariExtensionPermission = .disabled
      bridgeStatus = .ready
      statusMessage = "Controller ready on localhost"

      if scenario == "connected" {
        let clientId = UUID().uuidString
        clients = [
          BrowserClientState(
            id: clientId,
            peerId: UUID(),
            family: .chromium,
            browserVersion: "130",
            extensionVersion: "1.0",
            tabs: [
              BrowserTab(
                tabId: 41,
                windowId: 1,
                title: "Example article",
                url: "https://www.example.com/article",
                active: true,
                injectable: true
              )
            ],
            managedTabIds: [],
            connected: true
          )
        ]
        selectedClientId = clientId
        selectedTabId = 41
      } else if scenario == "pairing-error" {
        pairingRequests = [
          PairingRequest(
            id: UUID(),
            peerId: UUID(),
            clientId: UUID().uuidString,
            family: .firefox,
            browserVersion: "128"
          )
        ]
        bridgeStatus = .portConflict
        statusMessage = "Port 59387 is already in use"
      }
    }
  #endif

  private func handle(_ event: ExtensionEvent, from peerId: UUID) {
    if case .hello = event {
      // The initial hello is the only event accepted before authentication.
    } else if authenticatedPeers[peerId] == nil {
      bridge.send(
        .error(code: "pairing-required", message: "Pair this browser before sending events."),
        to: peerId
      )
      return
    }

    switch event {
    case .hello(let hello):
      handleHello(hello, peerId: peerId)
    case .tabsSnapshot(let snapshot):
      guard authenticatedPeers[peerId] == snapshot.clientId else {
        return
      }
      updateTabs(snapshot.tabs, clientId: snapshot.clientId)
    case .stateSnapshot(let snapshot):
      guard authenticatedPeers[peerId] == snapshot.clientId else {
        return
      }
      updateSnapshot(snapshot.state, clientId: snapshot.clientId)
    case .settingsProposal(let proposal):
      guard authenticatedPeers[peerId] == proposal.clientId else {
        return
      }
      revision = max(revision, proposal.baseRevision) + 1
      settings = SettingsNormalizer.normalize(proposal.settings)
      persistAndBroadcast()
      showStatus("Offline browser changes merged")
    case .heartbeat:
      bridge.send(.ping(at: Int64(Date().timeIntervalSince1970 * 1_000)), to: peerId)
    case .pong:
      break
    case .error(let error):
      showStatus(error.message)
    }
  }

  private func handleHello(_ hello: Hello, peerId: UUID) {
    guard UUID(uuidString: hello.clientId) != nil else {
      bridge.send(
        .error(code: "invalid-client-id", message: "The browser client ID is invalid."),
        to: peerId
      )
      return
    }

    helloByPeer[peerId] = hello

    if PairingAuthenticator.matches(
      expected: tokenStore.token(for: hello.clientId),
      presented: hello.token
    ) {
      authenticate(peerId: peerId, hello: hello, command: .helloAccepted())
      return
    }

    if hello.browserFamily == .safari {
      do {
        let token = try tokenStore.createToken(for: hello.clientId)
        authenticate(peerId: peerId, hello: hello, command: .pairingAccepted(token: token))
        showStatus("Safari connected")
      } catch {
        showStatus("Safari pairing failed")
      }
      return
    }

    pairingRequests.removeAll { $0.peerId == peerId || $0.clientId == hello.clientId }
    pairingRequests.append(
      PairingRequest(
        id: UUID(),
        peerId: peerId,
        clientId: hello.clientId,
        family: hello.browserFamily,
        browserVersion: hello.browserVersion
      )
    )
    showStatus("\(hello.browserFamily.title) requests pairing")
  }

  private func authenticate(peerId: UUID, hello: Hello, command: NativeCommand) {
    authenticatedPeers[peerId] = hello.clientId
    bridge.send(command, to: peerId)
    bridge.send(.replaceSettings(revision: revision, settings: settings), to: peerId)

    let existingIndex = clients.firstIndex { $0.id == hello.clientId }
    let client = BrowserClientState(
      id: hello.clientId,
      peerId: peerId,
      family: hello.browserFamily,
      browserVersion: hello.browserVersion,
      extensionVersion: hello.extensionVersion,
      tabs: existingIndex.map { clients[$0].tabs } ?? [],
      managedTabIds: existingIndex.map { clients[$0].managedTabIds } ?? [],
      connected: true
    )

    if let existingIndex {
      clients[existingIndex] = client
    } else {
      clients.append(client)
    }

    if selectedClientId == nil {
      selectedClientId = hello.clientId
    }
  }

  private func handleDisconnect(_ peerId: UUID) {
    helloByPeer.removeValue(forKey: peerId)
    pairingRequests.removeAll { $0.peerId == peerId }

    guard let clientId = authenticatedPeers.removeValue(forKey: peerId),
      let index = clients.firstIndex(where: { $0.id == clientId })
    else {
      return
    }

    clients[index].connected = false
    showStatus("\(clients[index].family.title) disconnected")
  }

  private func handleBridgeStatus(_ status: BridgeServer.Status) {
    bridgeStatus = status
    switch status {
    case .ready:
      showStatus("Controller ready on localhost")
    case .portConflict:
      showStatus("Port 59387 is already in use")
    case .failed(let message):
      showStatus("Controller error: \(message)")
    case .stopped:
      showStatus("Controller stopped")
    }
  }

  private func updateTabs(_ tabs: [BrowserTab], clientId: String) {
    guard let index = clients.firstIndex(where: { $0.id == clientId }) else {
      return
    }

    let safeTabs = tabs.filter {
      $0.tabId >= 0 && $0.windowId >= 0 && !$0.url.isEmpty
    }
    clients[index].tabs = safeTabs.sorted {
      if $0.active != $1.active {
        return $0.active
      }
      return $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending
    }
    clients[index].managedTabIds.formIntersection(Set(safeTabs.map(\.tabId)))

    if selectedClientId == clientId,
      selectedTabId == nil || !safeTabs.contains(where: { $0.tabId == selectedTabId })
    {
      selectedTabId =
        clients[index].tabs.first(where: \.active)?.tabId ?? clients[index].tabs.first?.tabId
    }
  }

  private func updateSnapshot(_ snapshot: ControllerSnapshot, clientId: String) {
    guard let index = clients.firstIndex(where: { $0.id == clientId }) else {
      return
    }

    clients[index].managedTabIds = Set(snapshot.managedTabIds.filter { $0 >= 0 })
  }

  private func updateManagedTab(clientId: String, tabId: Int, managed: Bool) {
    guard let index = clients.firstIndex(where: { $0.id == clientId }) else {
      return
    }

    if managed {
      clients[index].managedTabIds.insert(tabId)
    } else {
      clients[index].managedTabIds.remove(tabId)
    }
  }

  private func mutateSettings(_ message: String, mutation: (inout ControllerSettings) -> Void) {
    mutation(&settings)
    settings = SettingsNormalizer.normalize(settings)
    revision += 1
    persistAndBroadcast()
    showStatus(message)
  }

  private func persistAndBroadcast() {
    store.save(.init(revision: revision, settings: settings))
    broadcastSettings()
  }

  private func broadcastSettings() {
    let command = NativeCommand.replaceSettings(revision: revision, settings: settings)
    for client in clients where client.connected {
      bridge.send(command, to: client.peerId)
    }
  }

  private func showStatus(_ message: String) {
    statusTask?.cancel()
    statusMessage = message
    statusTask = Task { [weak self] in
      try? await Task.sleep(for: .seconds(4))
      guard !Task.isCancelled else {
        return
      }
      self?.statusMessage = ""
    }
  }
}
