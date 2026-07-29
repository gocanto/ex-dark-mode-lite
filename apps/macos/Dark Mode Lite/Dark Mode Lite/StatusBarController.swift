import AppKit
import SwiftUI

/// Owns the menu-bar status item and its SwiftUI popover.
@MainActor
final class StatusBarController: NSObject {
  private let popover = NSPopover()
  private let statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)

  init(model: AppModel) {
    super.init()

    popover.behavior = .transient
    popover.animates = true
    popover.contentSize = NSSize(width: 360, height: 660)
    popover.contentViewController = NSHostingController(rootView: ControllerView(model: model))

    if let button = statusItem.button {
      let image = NSImage(
        systemSymbolName: "moon.stars.fill", accessibilityDescription: "Dark Mode Lite")
      image?.isTemplate = true
      button.image = image
      button.toolTip = "Dark Mode Lite"
      button.target = self
      button.action = #selector(togglePopover)
      button.sendAction(on: [.leftMouseUp, .rightMouseUp])
      button.setAccessibilityIdentifier("dark-mode-lite-menu-item")
    }
  }

  func showPopover() {
    guard let button = statusItem.button, !popover.isShown else {
      return
    }

    popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
    popover.contentViewController?.view.window?.makeKey()
  }

  @objc private func togglePopover() {
    guard statusItem.button != nil else {
      return
    }

    if popover.isShown {
      popover.performClose(nil)
    } else {
      showPopover()
    }
  }
}
