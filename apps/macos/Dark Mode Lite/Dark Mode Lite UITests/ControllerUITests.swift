import XCTest

final class ControllerUITests: XCTestCase {
  @MainActor
  func testControllerControlsAndPresetLifecycle() {
    continueAfterFailure = false
    let app = launch(scenario: "baseline")
    defer { app.terminate() }

    XCTAssertTrue(app.windows["Dark Mode Lite Preview"].waitForExistence(timeout: 3))
    XCTAssertTrue(app.switches["global-toggle"].exists)

    app.buttons["mode-invert"].click()
    XCTAssertTrue(app.staticTexts["Invert mode"].waitForExistence(timeout: 1))

    app.buttons["preset-reading"].click()
    XCTAssertEqual(sliderValue("brightness-slider", in: app), 96)
    XCTAssertEqual(sliderValue("contrast-slider", in: app), 88)
    XCTAssertEqual(sliderValue("sepia-slider", in: app), 18)

    app.buttons["save-preset"].click()
    XCTAssertTrue(app.staticTexts["Custom 1 saved"].waitForExistence(timeout: 1))

    app.scrollViews.firstMatch.swipeUp()
    let deleteCustomPreset = app.buttons
      .matching(NSPredicate(format: "identifier BEGINSWITH %@", "delete-custom-"))
      .firstMatch
    XCTAssertTrue(deleteCustomPreset.waitForExistence(timeout: 2))
    deleteCustomPreset.click()
    XCTAssertTrue(app.staticTexts["Custom 1 deleted"].waitForExistence(timeout: 1))

    app.buttons["reset-everything"].click()
    XCTAssertEqual(sliderValue("brightness-slider", in: app), 100)
    XCTAssertEqual(sliderValue("contrast-slider", in: app), 92)
    XCTAssertEqual(sliderValue("sepia-slider", in: app), 0)
  }

  @MainActor
  func testManagedTabSiteAndBlocklistControls() {
    continueAfterFailure = false
    let app = launch(scenario: "connected")
    defer { app.terminate() }

    XCTAssertTrue(app.popUpButtons["browser-selector"].waitForExistence(timeout: 3))
    XCTAssertTrue(app.popUpButtons["tab-selector"].exists)
    XCTAssertTrue(app.buttons["toggle-selected-tab"].exists)

    app.buttons["toggle-selected-tab"].click()
    XCTAssertTrue(app.staticTexts["Dark mode applied to tab"].waitForExistence(timeout: 1))

    app.switches["site-toggle"].click()
    XCTAssertTrue(app.staticTexts["example.com blocked"].waitForExistence(timeout: 1))

    app.switches["site-toggle"].click()
    XCTAssertTrue(app.staticTexts["example.com enabled"].waitForExistence(timeout: 1))

    app.scrollViews.firstMatch.swipeUp()
    app.buttons["reset-everything"].click()
    XCTAssertTrue(app.staticTexts["All settings reset"].waitForExistence(timeout: 1))
  }

  @MainActor
  func testOnboardingPairingAndPortConflictStates() {
    continueAfterFailure = false
    let app = launch(scenario: "pairing-error")
    defer { app.terminate() }

    XCTAssertTrue(app.buttons["pair-browser"].waitForExistence(timeout: 3))
    XCTAssertTrue(app.staticTexts["Firefox 128"].exists)
    XCTAssertTrue(app.staticTexts["Port 59387 is already in use"].exists)
    XCTAssertTrue(app.staticTexts["Port conflict"].exists)
  }

  @MainActor
  private func launch(scenario: String) -> XCUIApplication {
    let app = XCUIApplication()
    app.launchEnvironment["DML_SHOW_POPOVER_ON_LAUNCH"] = "1"
    app.launchEnvironment["DML_UI_TEST_SCENARIO"] = scenario
    app.launch()
    return app
  }

  @MainActor
  private func sliderValue(_ identifier: String, in app: XCUIApplication) -> Double? {
    if let number = app.sliders[identifier].value as? NSNumber {
      return number.doubleValue
    }

    guard let text = app.sliders[identifier].value as? String else {
      return nil
    }

    return Double(text.replacingOccurrences(of: "%", with: ""))
  }
}
