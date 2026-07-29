import Foundation

/// Rendering modes shared by the native controller and companion extensions.
public enum ThemeMode: String, Codable, CaseIterable, Sendable {
  case smart
  case invert
  case soft

  public var title: String {
    rawValue.capitalized
  }
}

/// A named bundle of rendering adjustments.
public struct ThemePreset: Codable, Equatable, Identifiable, Sendable {
  public var id: String
  public var name: String
  public var mode: ThemeMode
  public var brightness: Double
  public var contrast: Double
  public var sepia: Double
  public var dot: String
  public var builtin: Bool

  public init(
    id: String,
    name: String,
    mode: ThemeMode,
    brightness: Double,
    contrast: Double,
    sepia: Double,
    dot: String,
    builtin: Bool
  ) {
    self.id = id
    self.name = name
    self.mode = mode
    self.brightness = brightness
    self.contrast = contrast
    self.sepia = sepia
    self.dot = dot
    self.builtin = builtin
  }

  public init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    id = try container.decodeIfPresent(String.self, forKey: .id) ?? ""
    name = try container.decodeIfPresent(String.self, forKey: .name) ?? id
    mode =
      ThemeMode(
        rawValue: try container.decodeIfPresent(String.self, forKey: .mode)
          ?? ThemeMode.smart
          .rawValue
      ) ?? .smart
    brightness = try container.decodeIfPresent(Double.self, forKey: .brightness) ?? 100
    contrast = try container.decodeIfPresent(Double.self, forKey: .contrast) ?? 92
    sepia = try container.decodeIfPresent(Double.self, forKey: .sepia) ?? 0
    dot = try container.decodeIfPresent(String.self, forKey: .dot) ?? "#2FE0CE"
    builtin = try container.decodeIfPresent(Bool.self, forKey: .builtin) ?? false
  }
}

/// Complete settings payload exchanged over the controller protocol.
public struct ControllerSettings: Codable, Equatable, Sendable {
  public var enabled: Bool
  public var mode: ThemeMode
  public var brightness: Double
  public var contrast: Double
  public var sepia: Double
  public var settingsVersion: Int
  public var siteOverrides: [String: Bool]
  public var customPresets: [ThemePreset]
  public var activePresetId: String?

  public init(
    enabled: Bool = true,
    mode: ThemeMode = .smart,
    brightness: Double = 100,
    contrast: Double = 92,
    sepia: Double = 0,
    settingsVersion: Int = 3,
    siteOverrides: [String: Bool] = [:],
    customPresets: [ThemePreset] = [],
    activePresetId: String? = "default"
  ) {
    self.enabled = enabled
    self.mode = mode
    self.brightness = brightness
    self.contrast = contrast
    self.sepia = sepia
    self.settingsVersion = settingsVersion
    self.siteOverrides = siteOverrides
    self.customPresets = customPresets
    self.activePresetId = activePresetId
  }

  public init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    enabled = try container.decodeIfPresent(Bool.self, forKey: .enabled) ?? true
    mode =
      ThemeMode(
        rawValue: try container.decodeIfPresent(String.self, forKey: .mode)
          ?? ThemeMode.smart
          .rawValue
      ) ?? .smart
    brightness = try container.decodeIfPresent(Double.self, forKey: .brightness) ?? 100
    contrast = try container.decodeIfPresent(Double.self, forKey: .contrast) ?? 92
    sepia = try container.decodeIfPresent(Double.self, forKey: .sepia) ?? 0
    settingsVersion = try container.decodeIfPresent(Int.self, forKey: .settingsVersion) ?? 3
    siteOverrides =
      try container.decodeIfPresent([String: Bool].self, forKey: .siteOverrides) ?? [:]
    customPresets =
      try container.decodeIfPresent([ThemePreset].self, forKey: .customPresets) ?? []
    activePresetId =
      if container.contains(.activePresetId) {
        try container.decodeIfPresent(String.self, forKey: .activePresetId)
      } else {
        "default"
      }
  }

  public static let defaults = ControllerSettings()

  public static let builtInPresets = [
    ThemePreset(
      id: "default", name: "Default", mode: .smart, brightness: 100, contrast: 92, sepia: 0,
      dot: "#2FE0CE", builtin: true),
    ThemePreset(
      id: "reading", name: "Reading", mode: .soft, brightness: 96, contrast: 88, sepia: 18,
      dot: "#7C8CF8", builtin: true),
    ThemePreset(
      id: "night-owl", name: "Night Owl", mode: .smart, brightness: 78, contrast: 100, sepia: 0,
      dot: "#B084F5", builtin: true),
  ]
}

/// Browsers certified by the v1 native controller.
public enum BrowserFamily: String, Codable, CaseIterable, Sendable {
  case safari
  case chromium
  case firefox

  public var title: String {
    switch self {
    case .safari: "Safari"
    case .chromium: "Chrome"
    case .firefox: "Firefox"
    }
  }
}

/// Safe tab metadata exposed only by an authenticated companion extension.
public struct BrowserTab: Codable, Equatable, Identifiable, Sendable {
  public var tabId: Int
  public var windowId: Int
  public var title: String
  public var url: String
  public var active: Bool
  public var injectable: Bool

  public var id: Int { tabId }

  public init(tabId: Int, windowId: Int, title: String, url: String, active: Bool, injectable: Bool)
  {
    self.tabId = tabId
    self.windowId = windowId
    self.title = title
    self.url = url
    self.active = active
    self.injectable = injectable
  }

  public var normalizedHost: String {
    guard let url = URL(string: url), let host = url.host else {
      return ""
    }

    return SettingsNormalizer.normalizeHost(host)
  }
}

/// Session state cached by one companion extension.
public struct ControllerSnapshot: Codable, Equatable, Sendable {
  public var revision: Int
  public var settings: ControllerSettings
  public var managedTabIds: [Int]

  public init(revision: Int, settings: ControllerSettings, managedTabIds: [Int]) {
    self.revision = revision
    self.settings = settings
    self.managedTabIds = managedTabIds
  }
}

/// Authentication helpers kept independent from Keychain persistence.
public enum PairingAuthenticator {
  public static func matches(expected: String?, presented: String?) -> Bool {
    guard let expected, let presented,
      !expected.isEmpty, expected.utf8.count == presented.utf8.count
    else {
      return false
    }

    return zip(expected.utf8, presented.utf8)
      .reduce(UInt8(0)) { difference, pair in
        difference | (pair.0 ^ pair.1)
      } == 0
  }
}

/// Selects the newest valid settings replica across local and iCloud storage.
public enum SettingsReplicaResolver {
  public static func newest(
    local: ControllerSnapshot?,
    cloud: ControllerSnapshot?
  ) -> ControllerSnapshot {
    let selected =
      [local, cloud]
      .compactMap(\.self)
      .max { $0.revision < $1.revision }
      ?? ControllerSnapshot(revision: 0, settings: .defaults, managedTabIds: [])

    return ControllerSnapshot(
      revision: max(0, selected.revision),
      settings: SettingsNormalizer.normalize(selected.settings),
      managedTabIds: []
    )
  }
}
