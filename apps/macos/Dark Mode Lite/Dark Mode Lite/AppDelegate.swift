import Cocoa
import SwiftUI

@main
enum DarkModeLiteApplication {
  @MainActor
  static func main() {
    let application = NSApplication.shared
    let delegate = AppDelegate()
    application.delegate = delegate

    withExtendedLifetime(delegate) {
      application.run()
    }
  }
}

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
  private var model: AppModel?
  private var statusBarController: StatusBarController?
  private var previewWindow: NSWindow?

  func applicationDidFinishLaunching(_: Notification) {
    NSApplication.shared.setActivationPolicy(.accessory)

    let model = AppModel()
    self.model = model
    statusBarController = StatusBarController(model: model)

    #if DEBUG
      if let scenario = ProcessInfo.processInfo.environment["DML_UI_TEST_SCENARIO"] {
        model.configureForUITesting(scenario)
      } else {
        model.start()
      }
    #else
      model.start()
    #endif

    if ProcessInfo.processInfo.environment["DML_SHOW_POPOVER_ON_LAUNCH"] == "1" {
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
        self?.showPreviewWindow(model: model)
      }
    }
  }

  func applicationShouldTerminateAfterLastWindowClosed(_: NSApplication) -> Bool {
    false
  }

  private func showPreviewWindow(model: AppModel) {
    NSApplication.shared.setActivationPolicy(.regular)
    let window = NSWindow(
      contentRect: NSRect(x: 0, y: 0, width: 360, height: 660),
      styleMask: [.titled, .closable],
      backing: .buffered,
      defer: false
    )
    window.title = "Dark Mode Lite Preview"
    window.contentViewController = NSHostingController(rootView: ControllerView(model: model))
    window.center()
    window.makeKeyAndOrderFront(nil)
    previewWindow = window
    NSApplication.shared.activate(ignoringOtherApps: true)
  }
}
