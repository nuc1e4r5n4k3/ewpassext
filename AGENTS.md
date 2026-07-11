# ewpassext

Chrome/Firefox extension that derives website-specific passwords from a single master password. React 19 + TypeScript, built with Vite.

## Build

```
pnpm build              # Chromium (main) -- runs vite build + vite build for script injections
pnpm build-firefox      # Firefox patch + xpi pack
```

**Main popup** is a React app built by `vite build` → `build/index.html`, `build/static/js/[name]-[hash].js`.

Two additional entrypoints are bundled into `build/`:
- `serviceworker.js` -- background service worker (via `vite.config.ts`)
- `contentscript.js` -- content script (via `vite.scriptinjections.config.ts`)

Vite configs: `vite.config.ts` (main popup + service worker), `vite.scriptinjections.config.ts` (content script). Output goes to `build/`.

## Firefox

The Chrome manifest has a `"key"` field (Chrome Web Store publisher key) that must be removed for Firefox, so the Firefox build patches it out:

```
pnpm build-firefox
```

This patches `build/manifest.json` via `firefox/manifest.json.patch`, then zips into `{6d1f30b1-2f6d-48f9-a01a-c32a0c27d12d}.xpi`. The patch makes four changes for Firefox compatibility:
- Renames the extension from "Chromium Extension Edition" to "Firefox Extension Edition"
- Removes the `"key"` field (Chrome Web Store publisher key)
- Removes the `"title"` field from `"action"`
- Replaces `"background.service_worker"` with `"background.scripts"` (Firefox MV3 uses `"scripts"` instead of `"service_worker"`)

## Test

```
pnpm test           # vitest (watch mode)
```

No existing test files, but `@testing-library/*` deps are present. Add `.test.tsx` alongside components.

## Code structure

| Directory | Purpose |
|---|---|
| `src/components/` | React UI (popup views + shared uiutils) |
| `src/lib/` | Core logic: derivation, storage, domain helpers |
| `src/internalapi/` | Types/requests/handler for popup ↔ content script IPC |
| `src/serviceworker/` | Chrome background service worker logic |
| `src/scriptinjections/` | Content script injection code |
| `public/manifest.json` | Extension manifest (V3, Chromium) |

**Entry points:**
- `src/index.tsx` → Popup page entrypoint (exposes storage helpers on `window`)
- Components consume React context: `PasswordContext`, `StorageContext`, `PageContext`

## Style & conventions

- ESLint extends `"react-app"` / `"react-app/jest"` -- no extra config files.
- Strict TypeScript (`strict: true`). JSX transforms via `react-jsx`.
- Component files use `.component.tsx` + `.module.scss` pairing.
- `pnpm` for package management -- check `pnpm-workspace.yaml`.
