# Chrome Web Store listing copy

Paste-ready text for the [Developer Dashboard](https://chrome.google.com/webstore/devconsole)
listing. Keep this file in sync with what's published.

## Product name

```text
Dark Mode - Lite
```

## Summary

_(store limit: 132 characters)_

```text
A real dark mode for sites that don't ship one — smart per-element darkening, invert, and soft modes, with per-site control.
```

## Category

**Accessibility** (alternate fit: Tools).

## Language

English (United States).

## Detailed description

```text
Dark Mode — Lite adds a genuine dark mode to websites that don't provide one,
without the weight of a full CSS-rewriting engine.

THREE MODES
• Smart — analyzes each element and darkens only the light surfaces, for the most
  natural-looking result on real pages.
• Invert — flips the whole page and re-inverts images, video, and SVG so media still
  looks right.
• Soft — applies a gentle dark palette without scanning the DOM. Fast, ideal for
  simple pages.

CONTROL WHERE IT RUNS
• One global on/off switch.
• A per-site blocklist for pages you'd rather leave untouched.

FINE-TUNING
• Brightness, contrast, and sepia sliders, each with a one-tap reset.
• Built-in presets — Default, Reading, Night Owl — plus save your own.

SETTINGS THAT FOLLOW YOU
Your preferences sync through your Chrome profile (chrome.storage.sync).

PRIVACY
Dark Mode — Lite collects nothing. There are no analytics, no accounts, and no
network requests to our servers. Your settings live only in your browser profile.

It's a compact, hackable extension — small enough to read and audit in an afternoon,
but smart enough to look good on real pages.

Open source: https://github.com/gocanto/ex-dark-mode-lite
```

## Single purpose

```text
Apply and adjust a dark-mode theme to web pages that do not offer one.
```

## Permission justifications

- **storage** — persist the user's mode, slider values, presets, and per-site
  blocklist across sessions and Chrome profiles.
- **activeTab** — apply and update dark mode on the page the user is currently
  interacting with, triggered from the popup.
- **scripting** — inject the dark-mode content script/styles into the active tab.
- **Host permissions (`http://*/*`, `https://*/*`)** — the content script must be able
  to run on any site the user chooses to darken; the extension does not target a fixed
  list of domains.

## Data usage disclosures

- Does the extension collect user data? **No.**
- Not sold to third parties, not used for unrelated purposes, not used for
  creditworthiness/lending.

## Assets

Located in [`storage/`](../storage):

| Asset | File |
| --- | --- |
| Screenshot — controls | `screenshot-controls.png` |
| Screenshot — modes | `screenshot-modes.png` |
| Screenshot — per-site toggle | `screenshot-site-toggle.png` |
| Small promo tile (440×280) | `promo-440x280.png` |
| Store icon (128×128) | `icon-128.png` |
| Social — X / LinkedIn | `social/` |

Regenerate them from the HTML/CSS sources in `storage/source/`.
