import Foundation

/// Pure state machine for revisions and the session-local managed-tab set.
public struct ManagedTabState: Equatable, Sendable {
  public private(set) var revision: Int
  public private(set) var settings: ControllerSettings
  public private(set) var managedTabIds: Set<Int>

  public init(
    revision: Int = 0,
    settings: ControllerSettings = .defaults,
    managedTabIds: Set<Int> = []
  ) {
    self.revision = max(0, revision)
    self.settings = SettingsNormalizer.normalize(settings)
    self.managedTabIds = Set(managedTabIds.filter { $0 >= 0 })
  }

  @discardableResult
  public mutating func replaceSettings(
    revision nextRevision: Int, settings nextSettings: ControllerSettings
  ) -> Bool {
    guard nextRevision >= revision else {
      return false
    }

    revision = nextRevision
    settings = SettingsNormalizer.normalize(nextSettings)
    return true
  }

  public mutating func manage(_ tabId: Int) {
    guard tabId >= 0 else {
      return
    }

    managedTabIds.insert(tabId)
  }

  public mutating func unmanage(_ tabId: Int) {
    managedTabIds.remove(tabId)
  }

  public mutating func removeStaleTabs(openTabIds: Set<Int>) {
    managedTabIds.formIntersection(openTabIds)
  }

  public func shouldApply(tabId: Int, url: String) -> Bool {
    guard managedTabIds.contains(tabId), settings.enabled, SettingsNormalizer.isInjectableURL(url),
      let host = URL(string: url)?.host
    else {
      return false
    }

    return settings.siteOverrides[SettingsNormalizer.normalizeHost(host)] ?? true
  }

  public var snapshot: ControllerSnapshot {
    ControllerSnapshot(
      revision: revision,
      settings: settings,
      managedTabIds: managedTabIds.sorted()
    )
  }
}
