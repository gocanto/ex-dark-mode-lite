import Foundation
import XCTest

@testable import DarkModeLiteCore

final class ControllerWireCodecTests: XCTestCase {
  func testDecodesHello() throws {
    let payload = Data(
      """
      {"version":1,"type":"hello","clientId":"browser-1","browserFamily":"chromium","browserVersion":"130","extensionVersion":"1.0","token":null}
      """.utf8
    )

    let event = try ControllerWireCodec.decode(payload)

    guard case .hello(let hello) = event else {
      return XCTFail("Expected hello")
    }

    XCTAssertEqual(hello.clientId, "browser-1")
    XCTAssertEqual(hello.browserFamily, .chromium)
    XCTAssertNil(hello.token)
  }

  func testRejectsUnknownVersionBeforePayloadExposure() {
    let payload = Data(
      #"{"version":2,"type":"tabs.snapshot","clientId":"browser-1","tabs":[]}"#.utf8)

    XCTAssertThrowsError(try ControllerWireCodec.decode(payload)) { error in
      XCTAssertEqual(error as? WireProtocolError, .unsupportedVersion(2))
    }
  }

  func testRejectsMalformedTypedPayload() {
    let payload = Data(#"{"version":1,"type":"hello","clientId":42}"#.utf8)

    XCTAssertThrowsError(try ControllerWireCodec.decode(payload)) { error in
      XCTAssertEqual(error as? WireProtocolError, .invalidPayload)
    }
  }

  func testEncodesSettingsReplacement() throws {
    let command = NativeCommand.replaceSettings(revision: 4, settings: .defaults)
    let object = try XCTUnwrap(
      JSONSerialization.jsonObject(with: ControllerWireCodec.encode(command)) as? [String: Any])

    XCTAssertEqual(object["version"] as? Int, 1)
    XCTAssertEqual(object["type"] as? String, "settings.replace")
    XCTAssertEqual(object["revision"] as? Int, 4)
    XCTAssertNil(object["token"])
  }

  func testEncodesTypedWireError() throws {
    let command = NativeCommand.error(code: "invalid-event", message: "Malformed event.")
    let object = try XCTUnwrap(
      JSONSerialization.jsonObject(with: ControllerWireCodec.encode(command)) as? [String: Any])

    XCTAssertEqual(object["type"] as? String, "error")
    XCTAssertEqual(object["code"] as? String, "invalid-event")
    XCTAssertEqual(object["message"] as? String, "Malformed event.")
  }

  func testDecodesLegacySettingsWithMigrationDefaults() throws {
    let settings = try JSONDecoder().decode(
      ControllerSettings.self,
      from: Data(#"{"enabled":false,"mode":"soft","brightness":91}"#.utf8)
    )

    XCTAssertFalse(settings.enabled)
    XCTAssertEqual(settings.mode, .soft)
    XCTAssertEqual(settings.brightness, 91)
    XCTAssertEqual(settings.contrast, 92)
    XCTAssertEqual(settings.activePresetId, "default")
    XCTAssertEqual(settings.settingsVersion, 3)
  }
}

final class SettingsNormalizerTests: XCTestCase {
  func testPreservesExactDefaultsAndBuiltInPresets() {
    XCTAssertEqual(ControllerSettings.defaults.mode, .smart)
    XCTAssertEqual(ControllerSettings.defaults.brightness, 100)
    XCTAssertEqual(ControllerSettings.defaults.contrast, 92)
    XCTAssertEqual(ControllerSettings.defaults.sepia, 0)
    XCTAssertEqual(
      ControllerSettings.builtInPresets.map(\.name), ["Default", "Reading", "Night Owl"])
  }

  func testNormalizesHostsAndUnsafeRanges() {
    var input = ControllerSettings.defaults
    input.brightness = 900
    input.contrast = 1
    input.sepia = -10
    input.siteOverrides = [" WWW.Example.com ": false]

    let output = SettingsNormalizer.normalize(input)

    XCTAssertEqual(output.brightness, 150)
    XCTAssertEqual(output.contrast, 50)
    XCTAssertEqual(output.sepia, 0)
    XCTAssertEqual(output.siteOverrides, ["example.com": false])
  }

  func testDuplicateNormalizedHostsDoNotCrash() {
    var input = ControllerSettings.defaults
    input.siteOverrides = ["example.com": true, "www.example.com": false]

    let output = SettingsNormalizer.normalize(input)

    XCTAssertEqual(output.siteOverrides, ["example.com": false])
  }

  func testRecognizesOnlyInjectableWebURLs() {
    XCTAssertTrue(SettingsNormalizer.isInjectableURL("https://example.com/page"))
    XCTAssertTrue(SettingsNormalizer.isInjectableURL("http://localhost:3000"))
    XCTAssertFalse(SettingsNormalizer.isInjectableURL("chrome://settings"))
    XCTAssertFalse(SettingsNormalizer.isInjectableURL("about:privatebrowsing"))
    XCTAssertFalse(SettingsNormalizer.isInjectableURL("not a URL"))
  }
}

final class ManagedTabStateTests: XCTestCase {
  func testRejectsStaleSettingsRevision() {
    var state = ManagedTabState(revision: 5)
    var next = ControllerSettings.defaults
    next.mode = .invert

    XCTAssertFalse(state.replaceSettings(revision: 4, settings: next))
    XCTAssertEqual(state.settings.mode, .smart)
  }

  func testManagedTabsRespectGlobalAndSiteRules() {
    var settings = ControllerSettings.defaults
    settings.siteOverrides = ["blocked.test": false]
    var state = ManagedTabState(revision: 1, settings: settings)
    state.manage(7)

    XCTAssertTrue(state.shouldApply(tabId: 7, url: "https://www.allowed.test/article"))
    XCTAssertFalse(state.shouldApply(tabId: 7, url: "https://www.blocked.test/article"))
    XCTAssertFalse(state.shouldApply(tabId: 8, url: "https://allowed.test"))
    XCTAssertFalse(state.shouldApply(tabId: 7, url: "chrome://settings"))
  }

  func testRemovesClosedTabsAndProducesStableSnapshot() {
    var state = ManagedTabState()
    state.manage(8)
    state.manage(2)
    state.manage(5)

    state.removeStaleTabs(openTabIds: [2, 8])

    XCTAssertEqual(state.snapshot.managedTabIds, [2, 8])
  }
}

final class PairingAndReplicaTests: XCTestCase {
  func testPairingRequiresAnExactNonEmptyToken() {
    XCTAssertTrue(PairingAuthenticator.matches(expected: "paired-token", presented: "paired-token"))
    XCTAssertFalse(
      PairingAuthenticator.matches(expected: "paired-token", presented: "paired-tokee"))
    XCTAssertFalse(PairingAuthenticator.matches(expected: nil, presented: nil))
    XCTAssertFalse(PairingAuthenticator.matches(expected: "", presented: ""))
  }

  func testNewestReplicaWinsAndManagedTabsRemainSessionLocal() {
    var cloudSettings = ControllerSettings.defaults
    cloudSettings.mode = .soft
    let local = ControllerSnapshot(revision: 2, settings: .defaults, managedTabIds: [1])
    let cloud = ControllerSnapshot(revision: 4, settings: cloudSettings, managedTabIds: [9])

    let restored = SettingsReplicaResolver.newest(local: local, cloud: cloud)

    XCTAssertEqual(restored.revision, 4)
    XCTAssertEqual(restored.settings.mode, .soft)
    XCTAssertEqual(restored.managedTabIds, [])
  }

  func testLocalReplicaIsFallbackWhenICloudIsUnavailable() {
    var localSettings = ControllerSettings.defaults
    localSettings.mode = .invert
    let local = ControllerSnapshot(revision: 3, settings: localSettings, managedTabIds: [2])

    let restored = SettingsReplicaResolver.newest(local: local, cloud: nil)

    XCTAssertEqual(restored.revision, 3)
    XCTAssertEqual(restored.settings.mode, .invert)
  }
}

final class BridgeServerTests: XCTestCase {
  func testStartsAndStopsOnTheFixedLoopbackPort() async {
    let server = BridgeServer()
    let ready = expectation(description: "listener ready")
    let stopped = expectation(description: "listener stopped")

    server.onStatus = { status in
      if status == .ready {
        ready.fulfill()
      } else if status == .stopped {
        stopped.fulfill()
      }
    }

    server.start()
    await fulfillment(of: [ready], timeout: 3)
    server.stop()
    await fulfillment(of: [stopped], timeout: 3)
  }

  func testCanRestartAfterACompleteStop() async {
    let server = BridgeServer()
    let firstReady = expectation(description: "first listener ready")
    server.onStatus = { status in
      if status == .ready {
        firstReady.fulfill()
      }
    }
    server.start()
    await fulfillment(of: [firstReady], timeout: 3)

    let firstStopped = expectation(description: "first listener stopped")
    server.onStatus = { status in
      if status == .stopped {
        firstStopped.fulfill()
      }
    }
    server.stop()
    await fulfillment(of: [firstStopped], timeout: 3)

    let secondReady = expectation(description: "second listener ready")
    server.onStatus = { status in
      if status == .ready {
        secondReady.fulfill()
      }
    }
    server.start()
    await fulfillment(of: [secondReady], timeout: 3)

    let secondStopped = expectation(description: "second listener stopped")
    server.onStatus = { status in
      if status == .stopped {
        secondStopped.fulfill()
      }
    }
    server.stop()
    await fulfillment(of: [secondStopped], timeout: 3)
  }
}
