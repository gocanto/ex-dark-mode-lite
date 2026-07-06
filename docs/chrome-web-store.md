# Publishing to the Chrome Web Store

How to package **Dark Mode — Lite** and ship it to the Chrome Web Store — both the
one-command packaging step and the automated publish workflow, plus a manual
dashboard fallback.

## What gets shipped

`pnpm package:store` builds the extension and zips **only** the runtime files the
store needs:

```text
manifest.json
index.html
content.js
icons/icon-16.png  icons/icon-32.png  icons/icon-48.png  icons/icon-128.png
assets/…            # popup JS/CSS + fonts
```

Marketing assets in [`storage/`](../storage) (screenshots, promo tile, social images,
and their HTML/CSS sources) live outside the build entirely, so they never enter the
package — they are listing collateral, not part of the extension.

The command also validates the built `dist/manifest.json` against
[`store-package-policy.ts`](../scripts/package-store/domain/store-package-policy.ts):
name, description, `homepage_url`, icons, host permissions, and that the disallowed
`tabs` permission is absent. A policy failure aborts the package.

## One-time setup

1. **Developer account.** Register at the
   [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   (one-time US$5 registration fee).
2. **Create the listing once, manually.** Upload a first build by hand (see
   [Manual upload](#manual-upload-fallback)) so the store mints an **item ID** — the
   automated workflow updates that existing item, it cannot create one.
3. **OAuth credentials** for the API (used by the workflow):
   - In [Google Cloud Console](https://console.cloud.google.com/), create a project
     and **enable the Chrome Web Store API**.
   - Create an **OAuth client ID** of type *Desktop app*. Note the **client ID** and
     **client secret**.
   - Generate a **refresh token** for the `https://www.googleapis.com/auth/chromewebstore`
     scope (e.g. via the OAuth Playground or a one-off local script), authorizing with
     the same Google account that owns the listing.

## Packaging locally

```bash
pnpm package:store
# → release/dark-mode-lite-<version>.zip  (release/ is gitignored)
```

By default the zip is written to `release/` at the repo root. Override the output
directory with `STORE_RELEASES_DIR` if needed:

```bash
STORE_RELEASES_DIR=/tmp/cws pnpm package:store
```

The `<version>` comes from `public/manifest.json`. Bump it there before cutting a new
release — the store rejects re-uploads of an already-published version.

## Trust and compliance audit

Chrome's Enhanced Safe Browsing warning is not controlled by a manifest flag. Before
uploading a new package, verify the extension and publisher state are aligned with the
Chrome Web Store trust requirements:

- **Single purpose** — the listing must state one clear purpose: apply and adjust a
  dark-mode theme to web pages that do not offer one.
- **Permissions** — keep `storage`, `activeTab`, `scripting`, and the broad
  `http://*/*` / `https://*/*` host permissions documented in
  [`store-listing.md`](store-listing.md). Broad host access is required because the
  content script must run on arbitrary sites the user chooses to darken.
- **Privacy** — the listing and privacy policy must continue to state that there are
  no analytics, no accounts, no network requests to the publisher or third parties,
  and that settings remain in Chrome's `storage.sync`.
- **Publisher account** — confirm 2-Step Verification is enabled, publisher/contact
  details are current, and there are no unresolved Chrome Web Store policy violations.
- **Package drift** — run `pnpm package:store` and rely on the package policy check to
  block unexpected manifest changes, including the disallowed `tabs` permission.

If the warning remains after review approval and these checks pass, treat it as Chrome's
developer/item trust-age state and monitor future installs instead of changing
functionality blindly.

## Automated publish (GitHub Actions)

The [`Release to Chrome Web Store`](../.github/workflows/release.yml) workflow packages
the zip and talks to the Web Store REST API — no extra dependencies.

**Add these repository secrets** (Settings → Secrets and variables → Actions). The
workflow reads them via a `chrome-web-store` environment, so you can also scope them
there:

| Secret | Value |
| --- | --- |
| `CWS_EXTENSION_ID` | Item ID from the dashboard URL |
| `CWS_CLIENT_ID` | OAuth client ID |
| `CWS_CLIENT_SECRET` | OAuth client secret |
| `CWS_REFRESH_TOKEN` | OAuth refresh token (chromewebstore scope) |

**Run it:** Actions → *Release to Chrome Web Store* → **Run workflow**, then pick a mode:

- **`draft-only`** (default) — builds, uploads the new zip to the item as a **draft**,
  and stops. Nothing goes public; review the draft in the dashboard. Safe to run anytime.
- **`publish`** — does the upload **and** submits the item for review. Once Google
  approves it, the new version goes live.

Every run also attaches the packaged zip as a build artifact. A run with missing
secrets fails fast at the first step with a clear message.

## Manual upload (fallback)

1. `STORE_RELEASES_DIR=./release pnpm package:store`
2. Open the [Developer Dashboard](https://chrome.google.com/webstore/devconsole) and
   select the item (or **Add new item** for the first upload).
3. **Package → Upload new package** → choose `release/dark-mode-lite-<version>.zip`.
4. Fill in the store listing from [`store-listing.md`](store-listing.md) and attach the
   screenshots / promo tile from [`storage/`](../storage).
5. **Submit for review**.

## Releasing: checklist

- [ ] Bump `version` in `public/manifest.json`.
- [ ] Complete the trust and compliance audit above.
- [ ] `pnpm check` is green.
- [ ] `pnpm package:store` succeeds (policy passes).
- [ ] Listing copy in [`store-listing.md`](store-listing.md) is current.
- [ ] Run the workflow (`draft-only`), verify the draft, then `publish`.
