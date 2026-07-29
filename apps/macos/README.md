# Dark Mode Lite for macOS

The native controller is a sandboxed, Dockless macOS 14+ menu-bar app. It embeds
the Safari companion extension and accepts paired Chrome and Firefox companions
on `ws://127.0.0.1:59387/v1`.

## Run locally

From the repository root:

```sh
make run
```

The command builds the controller JavaScript, synchronizes Safari resources,
performs an unsigned Debug build, and opens the app. Select the moon icon in the
menu bar to open the 360-point controller.

For first-run setup:

1. Open the app and use **Safari Settings** to enable the bundled extension.
2. For Chrome or Firefox, run `pnpm run package:controllers`.
3. Install the matching package from `release/controller` as an
   unpacked/development extension.
4. Return to the menu-bar app and accept the one-time pairing request.

Safari pairs automatically after its permission is enabled. Chrome and Firefox
store their accepted 256-bit pairing token in extension-local storage while the
native copy remains device-local in Keychain.

The app reports Safari permission, browser disconnection, unsupported pages,
and loopback port conflicts directly in the controller.

## Verification

```sh
make macos-test
make macos-format
```

Signed Developer ID, notarized, and Mac App Store builds require an Apple team,
matching certificates, profiles, and store credentials. Unsigned local builds
do not require those credentials.
