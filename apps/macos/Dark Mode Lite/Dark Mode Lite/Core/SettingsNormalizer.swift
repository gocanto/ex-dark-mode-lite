import Foundation

/// Normalizes all settings received from storage or a companion extension.
public enum SettingsNormalizer {
  public static func normalize(_ input: ControllerSettings) -> ControllerSettings {
    var output = input
    output.brightness = clamp(input.brightness, minimum: 50, maximum: 150)
    output.contrast = clamp(input.contrast, minimum: 50, maximum: 150)
    output.sepia = clamp(input.sepia, minimum: 0, maximum: 100)
    output.settingsVersion = ControllerSettings.defaults.settingsVersion
    output.siteOverrides = input.siteOverrides.keys.sorted().reduce(into: [:]) {
      normalizedOverrides, key in
      let host = normalizeHost(key)
      if !host.isEmpty {
        normalizedOverrides[host] = input.siteOverrides[key]
      }
    }

    var presetIds = Set<String>()
    output.customPresets = input.customPresets.compactMap { preset in
      guard !preset.id.isEmpty, presetIds.insert(preset.id).inserted else {
        return nil
      }

      return ThemePreset(
        id: preset.id,
        name: preset.name.isEmpty ? preset.id : preset.name,
        mode: preset.mode,
        brightness: clamp(preset.brightness, minimum: 50, maximum: 150),
        contrast: clamp(preset.contrast, minimum: 50, maximum: 150),
        sepia: clamp(preset.sepia, minimum: 0, maximum: 100),
        dot: preset.dot.isEmpty ? "#2FE0CE" : preset.dot,
        builtin: false
      )
    }

    let validPresetIds = Set(
      ControllerSettings.builtInPresets.map(\.id) + output.customPresets.map(\.id))
    if let activePresetId = output.activePresetId, !validPresetIds.contains(activePresetId) {
      output.activePresetId = nil
    }

    return output
  }

  public static func normalizeHost(_ host: String) -> String {
    let normalized = host.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    return normalized.hasPrefix("www.") ? String(normalized.dropFirst(4)) : normalized
  }

  public static func isInjectableURL(_ input: String) -> Bool {
    guard let components = URLComponents(string: input),
      let scheme = components.scheme?.lowercased()
    else {
      return false
    }

    return (scheme == "http" || scheme == "https") && components.host != nil
  }

  private static func clamp(_ value: Double, minimum: Double, maximum: Double) -> Double {
    guard value.isFinite else {
      return minimum
    }

    return min(maximum, max(minimum, value))
  }
}
