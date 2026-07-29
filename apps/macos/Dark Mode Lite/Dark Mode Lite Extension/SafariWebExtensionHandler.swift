//
//  SafariWebExtensionHandler.swift
//  Dark Mode Lite Extension
//
//  Created by Gus on 29/07/2026.
//

import SafariServices

final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {

  func beginRequest(with context: NSExtensionContext) {
    let response = NSExtensionItem()
    response.userInfo = [SFExtensionMessageKey: ["status": "unsupported"]]

    context.completeRequest(returningItems: [response], completionHandler: nil)
  }
}
