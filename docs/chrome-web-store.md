# Chrome Web Store Submission

## Submission Positioning

- Initial visibility: Unlisted beta
- Category: Accessibility
- Payments: No in-app purchases
- Store title: Dark Mode - Lite
- Summary: A compact dark-mode extension with smart, invert, and soft modes plus per-site controls.

## Store Description

Dark Mode - Lite adds a compact, adjustable dark mode to websites that do not provide one. It focuses on a single purpose: making pages more comfortable to read while giving users quick control from the browser popup.

Main features:

- Global on/off switch for dark mode.
- Per-site toggle and blocklist for pages that should stay untouched.
- Smart, Invert, and Soft modes for different page styles.
- Brightness, contrast, and sepia adjustments.
- Built-in and custom presets.
- Settings sync through the user's Chrome profile with `chrome.storage.sync`.

## Permission Justifications

- `storage`: Stores the user's dark-mode settings, presets, and per-site blocklist in `chrome.storage.sync`.
- `activeTab`: Lets the popup inspect and update the current tab after the user opens the extension.
- `scripting`: Injects the content script into an already-open tab when Chrome has not yet run the declarative content script.
- `http://*/*` and `https://*/*`: Required because the extension's single purpose is to apply dark mode across ordinary websites the user visits.

The extension does not request `tabs`. The popup only needs the active tab after direct user interaction with the extension action.

## Privacy Practices

- Single purpose: Apply configurable dark mode to websites.
- Remote code: None.
- Analytics: None.
- Ads: None.
- Data sale or sharing: None.
- User data collected: None sent to the developer or third parties.
- Local/browser storage: Settings, presets, and site blocklist entries are stored in `chrome.storage.sync`.
- Website content handling: The content script reads computed styles from the current page to apply visual changes locally in the browser. Page content is not transmitted.

## Required Listing Assets

All listing assets share the "Contrast disc" brand system (teal `#2FE0CE` on a dark
`#080B10` field, Geist typography). Editable sources live in `public/store-assets/source/`.

- Store icon: `public/store-assets/icon-128.png` (from `public/store-assets/source/icon.svg`, rasterized with `rsvg-convert`; also feeds `public/icons/icon-{16,32,48,128}.png`)
- Small promo tile: `public/store-assets/promo-440x280.png` (from `public/store-assets/source/promo-440x280.html`)
- Screenshots (1280×800):
  - `public/store-assets/screenshot-controls.png` (from `public/store-assets/source/screenshot-controls.html`)
  - `public/store-assets/screenshot-modes.png` (from `public/store-assets/source/screenshot-modes.html`)
  - `public/store-assets/screenshot-site-toggle.png` (from `public/store-assets/source/screenshot-site-toggle.html`)

## Social / Marketing Assets

Not part of the store listing, but kept alongside it for launch posts:

- LinkedIn (1200×1200): `public/store-assets/social/linkedin-1200x1200.png` (from `public/store-assets/source/linkedin-post.html`)
- X (1600×900): `public/store-assets/social/x-1600x900.png` (from `public/store-assets/source/x-post.html`)

### Regenerating the HTML-based assets

The promo, screenshots, and social posts are authored as self-contained HTML
(shared `public/store-assets/source/brand.css`, bundled Geist fonts in
`public/store-assets/source/fonts/`, and the shared popup mockup in
`public/store-assets/source/popup-card.js`). To re-render, serve `public/store-assets/source/`
over HTTP and screenshot each page at its exact viewport with headless Chromium
(e.g. Playwright), then save the PNG into `public/store-assets/` (or `public/store-assets/social/`).

## Package

Run:

```bash
pnpm run package:store
```

The package is written outside the repo:

```text
/Users/gocanto/.cache/codex/ex-dark-mode-lite/releases/dark-mode-lite-0.1.0.zip
```

The script also writes a `.contents.txt` file beside the ZIP so the uploaded files can be reviewed before submission.

## Manual Dashboard Steps

1. Open the Chrome Web Store Developer Dashboard.
2. Create a new extension item.
3. Upload the generated ZIP from `/Users/gocanto/.cache/codex/ex-dark-mode-lite/releases/`.
4. Fill the Store listing tab with the title, summary, description, category, and assets from this document.
5. Fill the Privacy practices tab using the answers above.
6. Set distribution visibility to Unlisted.
7. Add reviewer notes:
   - Open any normal `https://` page.
   - Click the extension action to open the popup.
   - Toggle global dark mode and switch between Smart, Invert, and Soft.
   - Use the per-site toggle to disable and re-enable the extension on that host.
   - Adjust brightness, contrast, and sepia sliders to confirm local visual changes.
8. Submit for review when all fields are complete.
