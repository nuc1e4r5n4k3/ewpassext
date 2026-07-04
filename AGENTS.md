# ewpassext

Chrome/Firefox extension that derives website-specific passwords from a single master password. React 18 + TypeScript, built with CRA and Webpack.

## Build

```
yarn build              # Chromium (main) -- runs react-scripts build + 4 webpack bundles
yarn build-firefox      # Firefox patch + xpi pack
```

**Main popup** is a React app baked by `react-scripts build` → `build/index.html`, `build/static/js/main*.js`.

Four non-react entrypoints are bundled separately into `build/`:
- `serviceworker.js` -- background service worker
- `keepalivetab.js` + `keepalivetab.html` -- keep-alive tab
- `scriptinjections/popuphook.js`, `injectpassword.js` -- content scripts

Webpack configs: `webpack.makeconfig.js` (template), `webpack.*-config.js` (consumers). Output goes to `build/`.

**Why tsconfig excludes certain files:** The service worker, keep-alive tab, and script injections compile to plain JS via Babel. React is not used there; they are excluded from `tsc` and bundled by webpack instead.

## Firefox

The Chrome manifest has a `"key"` field (Chrome Web Store publisher key) that must be removed for Firefox, so the Firefox build patches it out:

```
yarn build-firefox
```

This patches `build/manifest.json` via `firefox/manifest.json.patch`, then zips into `{6d1f30b1-2f6d-48f9-a01a-c32a0c27d12d}.xpi`. The patch also removes `"background.service_worker"` (Firefox doesn't need the keep-alive).

## Test

```
yarn test           # react-scripts test (watch mode)
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
- `yarn` (not npm) for package management -- check `yarn.lock`.
