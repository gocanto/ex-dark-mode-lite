import Foundation
import Security

/// Locally persisted controller settings with optional iCloud key-value mirroring.
@MainActor
final class SettingsStore: @unchecked Sendable {
  struct StoredState: Codable, Equatable {
    var revision: Int
    var settings: ControllerSettings
  }

  private let local: UserDefaults
  private let cloud: NSUbiquitousKeyValueStore?
  private let stateKey = "controller.settings.v1"
  nonisolated(unsafe) private var observer: NSObjectProtocol?

  init(local: UserDefaults = .standard, cloud: NSUbiquitousKeyValueStore? = nil) {
    self.local = local
    self.cloud = cloud ?? Self.entitledCloudStore()
  }

  deinit {
    if let observer {
      NotificationCenter.default.removeObserver(observer)
    }
  }

  func load() -> StoredState {
    let localState = decode(local.data(forKey: stateKey))
    let cloudState = cloud.flatMap { decode($0.data(forKey: stateKey)) }
    let resolved = SettingsReplicaResolver.newest(
      local: localState.map {
        ControllerSnapshot(revision: $0.revision, settings: $0.settings, managedTabIds: [])
      },
      cloud: cloudState.map {
        ControllerSnapshot(revision: $0.revision, settings: $0.settings, managedTabIds: [])
      }
    )

    return StoredState(
      revision: resolved.revision,
      settings: resolved.settings
    )
  }

  func save(_ state: StoredState) {
    guard let data = try? JSONEncoder().encode(state) else {
      return
    }

    local.set(data, forKey: stateKey)
    cloud?.set(data, forKey: stateKey)
    cloud?.synchronize()
  }

  func observeExternalChanges(_ handler: @escaping @MainActor (StoredState) -> Void) {
    guard let cloud else {
      return
    }

    observer = NotificationCenter.default.addObserver(
      forName: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
      object: cloud,
      queue: .main
    ) { [weak self] _ in
      Task { @MainActor in
        guard let self else {
          return
        }

        handler(self.load())
      }
    }

    cloud.synchronize()
  }

  private static func entitledCloudStore() -> NSUbiquitousKeyValueStore? {
    guard let task = SecTaskCreateFromSelf(nil),
      let identifier = SecTaskCopyValueForEntitlement(
        task,
        "com.apple.developer.ubiquity-kvstore-identifier" as CFString,
        nil
      ) as? String,
      !identifier.isEmpty
    else {
      return nil
    }

    return .default
  }

  private func decode(_ data: Data?) -> StoredState? {
    guard let data, let decoded = try? JSONDecoder().decode(StoredState.self, from: data) else {
      return nil
    }

    return decoded
  }
}

/// Device-local pairing token storage. Tokens never enter preferences or logs.
final class PairingTokenStore {
  private let service = "sh.gocanto.darkmodelite.controller-pairing"

  func token(for clientId: String) -> String? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: clientId,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne,
    ]

    var item: CFTypeRef?
    guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
      let data = item as? Data
    else {
      return nil
    }

    return String(data: data, encoding: .utf8)
  }

  func createToken(for clientId: String) throws -> String {
    var bytes = [UInt8](repeating: 0, count: 32)
    guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else {
      throw TokenError.randomGenerationFailed
    }

    let token = Data(bytes).base64EncodedString()
    try set(token, for: clientId)
    return token
  }

  func removeToken(for clientId: String) {
    SecItemDelete(query(for: clientId) as CFDictionary)
  }

  private func set(_ token: String, for clientId: String) throws {
    let baseQuery = query(for: clientId)
    let data = Data(token.utf8)
    let updateStatus = SecItemUpdate(
      baseQuery as CFDictionary,
      [kSecValueData as String: data] as CFDictionary
    )

    if updateStatus == errSecSuccess {
      return
    }

    var insert = baseQuery
    insert[kSecValueData as String] = data
    let status = SecItemAdd(insert as CFDictionary, nil)

    guard status == errSecSuccess else {
      throw TokenError.keychain(status)
    }
  }

  private func query(for clientId: String) -> [String: Any] {
    [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: clientId,
      kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
    ]
  }

  enum TokenError: Error {
    case randomGenerationFailed
    case keychain(OSStatus)
  }
}
