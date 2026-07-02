# Dark Mode — Lite

A compact Chrome (MV3) extension that adds a real dark mode to sites that don't ship one.

## What it does

- **Global + per‑site toggle** — turn dark mode on everywhere, then keep a per‑site
  blocklist for pages you'd rather leave untouched.
- **Three modes**
  - **Smart** — analyzes each element and darkens only the light surfaces (best default).
  - **Invert** — flips the whole page, re‑inverting images/video/SVG so media looks right.
  - **Soft** — applies a gentle dark palette without scanning the DOM (fast, simple pages).
- **Fine‑tuning** — brightness, contrast, and sepia sliders, each with a one‑tap reset.
- **Presets** — built‑in *Default / Reading / Night Owl*, plus save your own.
- **Syncs** — settings persist to `chrome.storage.sync`, so they follow your Chrome profile.

## Why

Most dark‑mode extensions are either heavy (parsing every CSS rule, shipping site‑specific
fixes) or crude (a blunt `invert()` over everything). **Dark Mode Lite** aims for the middle:
small enough to read and audit in an afternoon, but smart enough to look good on real pages.
It's a compact, hackable extension — not a Dark Reader clone.

## Install (from source)

```bash
pnpm install
pnpm build      # emits the extension into dist/
```

Then load it in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select the `dist/` folder

## How it works

Two independent pieces talk over Chrome's messaging APIs:

- **Popup** (`src/popup/`) — a Vue 3 + Tailwind 4 UI. State lives in a `PopupController`
  class that reads/writes settings and mirrors them to the active tab.
- **Content script** (`src/content.ts`) — a `ContentScript` class that injects the CSS/JS
  that actually darkens the page, per the selected mode.

Both share the same `Settings` shape (`src/types/settings.ts`). All non‑component logic is
class‑based (`SettingsCodec`, `ChromeRuntimeAdapter`, `SettingsGateway`, `PopupStateBuilder`,
`ContentScript`); Vue single‑file components and the `usePopupController` composable stay
idiomatic.

> Note: the content script keeps its own copy of the settings parser and **overwrites
> storage** on every change, so any new persisted field must be added to *both*
> `SettingsCodec` and `ContentScript`.

## Development

Requires **Node 24+** and **pnpm 11+**.

```bash
pnpm install        # install dependencies
pnpm dev            # run the popup in a Vite dev server (preview mode)
pnpm build          # build the loadable extension into dist/
pnpm test           # run unit/feature tests (Vitest)
pnpm typecheck      # vue-tsc type check
pnpm check          # paths + tests + typecheck + build (run before pushing)
pnpm format-all     # format the whole tree
```

`pnpm dev` runs the popup standalone (no extension runtime), so it renders in "Live preview"
mode against default settings — handy for iterating on the UI.

### Project layout

```
src/
  content.ts                     # page dark-mode engine (ContentScript class)
  types/settings.ts              # shared Settings model + SettingsCodec
  popup/
    App.vue                      # popup root
    components/                  # UI (popup sections + shadcn-vue primitives)
    composables/PopupController/ # controller, runtime adapter, settings gateway
manifest.json                    # MV3 manifest
```

## Contributing

1. Branch off `main` (or fork).
2. Make your change and keep it covered by tests where it matters.
3. Before pushing, run:
   ```bash
   pnpm check
   pnpm format-all
   ```
4. Use clear, conventional commit messages (`feat:`, `fix:`, `refactor:`, `chore:`) and
   split work by concern.
5. Open a PR.

Conventions worth knowing:

- **TypeScript** follows `.agents/skills/typescript-coding-standards`.
- **Imports** use repo path aliases (`@popup`, `@components`, `@composables`, `@lib`, `@/…`) —
  never `./` or `../` (see `.agents/skills/no-relative-module-specifiers`).
- CI details (labels, coverage gates, E2E) live in `AGENTS.md`.

## License

[MIT](LICENSE).

## Author

Built by **[gocanto.sh](https://gocanto.sh)** ❤️
