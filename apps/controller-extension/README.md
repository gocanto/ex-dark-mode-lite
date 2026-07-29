# Dark Mode Lite Controller Extensions

These WebExtensions connect Safari, Chrome, and Firefox tabs to the native
Dark Mode Lite macOS menu-bar app. They do not expose a browser toolbar action.

The shared TypeScript sources build from `apps/extension/src/controller*`.
`scripts/package-controller-extensions.ts` stages each browser-specific
Chrome/Firefox manifest with the shared background/content bundles and icons.
The Safari manifest is synchronized directly into the Xcode app-extension
target by `scripts/sync-safari-controller.ts`.

The extension sends no tab metadata until the native app accepts its pairing
token. Private browsing tabs and non-HTTP(S) pages are excluded. A low-frequency
extension alarm wakes suspended MV3 backgrounds so they reconnect after the
native app returns.

Safari, Chrome, and Firefox are the certified v1 runtimes. Edge, Brave, Arc,
and other Chromium browsers may work with the Chromium package but remain
best-effort.
