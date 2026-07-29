# macOS distribution

The native app, Safari WebExtension, and Chrome/Firefox companion packages share
one protocol and browser engine. All release workflows are manual so they do not
add jobs to pushes on `main`.

## Local unsigned build

```sh
make run
make macos-test
pnpm run package:controllers
```

`make run` writes Derived Data under
`/Users/gocanto/.codex/work/codex/dark-mode-lite-derived` and opens the Debug
app. Controller packages are written to `release/controller`.

## Manual workflows

- **Chrome and Firefox controller packages** builds their versioned store zip
  artifacts. Safari remains embedded in the macOS archive.
- **macOS release / unsigned** creates zipped unsigned `.xcarchive` and app artifacts.
- **macOS release / developer-id** signs an archive, creates a DMG, notarizes it,
  and staples the ticket.
- **macOS release / app-store** archives the sandboxed app and uploads it with
  App Store Connect API credentials.

Signed workflows require the repository secrets referenced directly in
`.github/workflows/macos-release.yml`:

- `APPLE_CERTIFICATE_BASE64`, `APPLE_CERTIFICATE_PASSWORD`, and
  `KEYCHAIN_PASSWORD`
- `APPLE_TEAM_ID`
- `APPLE_APP_PROFILE_BASE64` and `APPLE_EXTENSION_PROFILE_BASE64`
- `APPLE_ID` and `APPLE_APP_PASSWORD` for Developer ID notarization
- `APP_STORE_API_KEY_ID`, `APP_STORE_API_ISSUER_ID`, and
  `APP_STORE_API_PRIVATE_KEY` for App Store upload

The certificate secret must match the requested distribution route. The Apple
team must create matching bundle identifiers and provisioning profiles for:

- `sh.gocanto.darkmodelite`
- `sh.gocanto.darkmodelite.Extension`

No valid signing identity or provisioning profile is required for the local
unsigned build.
