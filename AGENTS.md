# ewpassext

Chrome/Firefox extension that derives website-specific passwords from a single master password. React 19 + TypeScript, built with Vite.

## Build

```
pnpm build              # Chromium (main) -- runs tsc --noEmit && vite build + vite build for script injections
pnpm build-firefox      # Firefox patch + xpi pack
pnpm typecheck          # tsc --noEmit (standalone, also runs as part of build)
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

Vitest is configured in `vite.config.ts` (`test.environment: 'happy-dom'`). `@testing-library/*` deps are present. Add `.test.tsx` alongside components.

`src/lib/derivation.test.ts` covers both derivation paths: golden-value tests for the legacy path (4 combinations of special-chars/extra-long) and the modern path (golden values, determinism, length, charset membership, flag-ignoring, bias sanity).

## Code structure

| Directory | Purpose |
|---|---|
| `src/components/` | React UI (popup views + shared uiutils) |
| `src/components/contexts/` | React context providers (`ConfigurationContext`, `PasswordContext`, `PageContext`, `PasswordChecksumContext`, `TotpContext`) |
| `src/components/totp/` | TOTP UI (`Totp`) |
| `src/components/backupoptions/` | Backup/restore UI (`BackupOptions`) |
| `src/lib/` | Core logic: derivation (`derivation.ts`, `hexutils.ts`), storage, domain helpers, TOTP (`totp.ts`), base32 (`base32.ts`) |
| `src/internalapi/` | Types/requests/handler for popup ↔ content script IPC |
| `src/serviceworker/` | Chrome background service worker logic |
| `src/scriptinjections/` | Content script injection code |
| `public/manifest.json` | Extension manifest (V3, Chromium) |

**Entry points:**
- `src/index.tsx` → Popup page entrypoint (exposes `window.storage` with `dump` / `import` / `importLegacy` for backup & restore)
- Components consume React context: `ConfigurationContext`, `PasswordContext`, `PageContext`, `PasswordChecksumContext`, `TotpContext`

## Password derivation

Core logic lives in `src/lib/derivation.ts`. The master password is expanded into derivation entropy via **PBKDF2** (SHA-256, 100k iterations) in `deriveMasterEntropy`; per-domain password entropy is then derived with **HKDF** (SHA-256) in `getDomainIds` / `derivePassword`. Hex ↔ buffer helpers live in `src/lib/hexutils.ts`.

A legacy derivation path (plain SHA-256) is retained alongside the modern KDFs so existing site-specific passwords keep working when `legacyDerivation` is set. `deriveMasterEntropy` / `getDomainIds` return both modern and legacy inputs for this reason.

The two paths use different character-mapping strategies:
- **Modern** (`derivePasswordModern`): requests `size * 4` bytes from HKDF in a single call, then maps each character via **partial rejection sampling** on 16-bit values — the first 16-bit value is checked against a modulo-bias threshold; if it falls in the rejection range, the second 16-bit value is used with plain modulo (the probability of both being biased is negligible). This is unbiased for all practical purposes and supports passwords up to `MAX_MODERN_PASSWORD_SIZE` (64). The `allowExtraLongPasswords` flag is **ignored** by the modern path.
- **Legacy**: extracts characters from a fixed 256-bit SHA-256 hash via `calcRounds` (repeated `x % map.length` division). Without `allowExtraLongPasswords`, extraction stops when the remaining value drops below the map length (avoiding modulo bias but capping length at `getMaxPasswordSize`); with it enabled, extraction continues past that point, accepting modulo bias in the trailing characters to allow longer passwords.

The `Long passwords` toggle in the UI (`DerivationOptions`) is shown only when the current domain uses legacy derivation (`useLegacyDerivation` is true). New (modern) configs always write `allowExtraLongPasswords: false`; the field is retained in `IDomainConfig` and the backup serialization format for compatibility with existing legacy configs and backups.

## Storage & backup format

Per-domain configuration (`IDomainConfig` in `src/lib/storage.ts`) is persisted as JSON under the `metadata` key in `storage.local` (see `load`/`store` in `src/lib/storage.ts`). Fields:

- `passwordLength`, `passwordIteration` — derivation parameters.
- `useSpecialCharacters`, `allowExtraLongPasswords` — derivation flags.
- `totpSecret?: string` — optional per-domain TOTP secret, stored as the hex-encoded XOR-encrypted ciphertext of the raw secret bytes (see `encryptTotpSecret`/`decryptTotpSecret` in `src/lib/totp.ts`). Omitted / empty when the domain has no TOTP secret configured. The plaintext is never persisted; it is decrypted in memory by `TotpContext` only while master entropy is available.

The backup/restore feature (`serializeAll`, `preParseBackup`, `importBackup`) serializes each domain config as a record inside a compact hex string. The record format is:

```
domainId (4 bytes / 8 hex) | length (1B) | iteration (1B) | flags (1B) [ | totpSize (1B) | totpSecret (totpSize bytes) ]
```

The fixed 7-byte prefix (14 hex chars) is followed, conditionally, by a TOTP section. Flags byte values:

- `0x01` — `useSpecialCharacters`
- `0x02` — `allowExtraLongPasswords`
- `0x04` — `totpSecret`. Enabled the optional TOTP section.

Backwards compatibility:
- Configs without a `totpSecret` (or with an empty one) serialize to byte-identical output as the pre-TOTP format (exactly 14 hex chars). Old backups therefore remain readable.
- New backups that include a TOTP secret are **not** readable by older versions of the extension, which treated records as fixed 14-hex-char and will reject the variable-length records via `preParseBackup`. This is intentional and unavoidable given the format extension.

`preParseBackup` walks the backup string record-by-record (variable-length, honoring `FLAG_TOTP_SECRET`) and returns the record count, or `undefined` on any malformed input (truncated size/secret, non-hex characters, trailing garbage). It is consumed by `BackupOptions.component.tsx` to render "Import contents: N configurations" and to gate the Import button.

## TOTP

Per-domain TOTP secrets and code generation are implemented in `src/lib/totp.ts` on top of the per-domain HKDF key (`deriveTotpKey` in `src/lib/derivation.ts`):

- `generateTotp(secret, timeSeconds, settings)` — RFC 6238 TOTP, HMAC-SHA-1, 6 digits, 30 s period, t0 = 0 (`TOTP_DEFAULT_SETTINGS`). Settings are hardcoded; non-default digits/period/algorithm are not supported.
- `encryptTotpSecret(rawSecret, domain, entropy)` / `decryptTotpSecret(storedHex, domain, entropy)` — XOR the raw secret against `deriveTotpKey(...)` so the persisted `IDomainConfig.totpSecret` never contains the plaintext secret. Encryption is deterministic given (entropy, domain); the raw secret is recoverable only while master entropy is in memory.

Secret input is parsed by `parseTotpConfiguratonString(input)` in `src/lib/totp.ts`. It accepts either a bare RFC 4648 base32 secret (case-insensitive, padding/whitespace tolerated) or an `otpauth://totp/...?secret=...` URL. URL `digits`, `period`, and `algorithm` parameters are validated against the defaults; any non-default value causes the parser to throw (per the "defaults only" decision). Base32 decoding lives in the generic `src/lib/base32.ts` (`decodeBase32`, `isBase32`).

The in-memory TOTP state for the popup is exposed to the UI via `TotpContext` (`src/components/contexts/TotpContext.component.tsx`), which nests inside `ConfigurationContextProvider` (it consumes both `PasswordContext` and `ConfigurationContext`).

## Extension privileges

The manifest (`public/manifest.json`) requests the following permissions and host permissions. Each is listed with the code that consumes it.

### `permissions`

- **`activeTab`** — Grants temporary access to the currently active tab when the user invokes the popup. Consumed via `browser.tabs.query({ windowId: ..., active: true })` in `src/components/contexts/PageContext.component.tsx:10` to read the active tab's `id` and `url`, which the popup then uses to derive the domain-specific password and target injection.
- **`alarms`** — Used in `src/serviceworker/storage.ts` to expire the in-memory master-password entropy. `alarms.create(CLEAR_PASSWORD_ALARM, { delayInMinutes: ... })` at line 40 schedules a delayed wipe; `alarms.onAlarm` at line 23 fires the wipe when the alarm elapses, ensuring derived entropy isn't kept in session storage beyond the user-requested TTL.
- **`scripting`** — Backs `scripting.executeScript`, which injects `contentscript.js` and invokes the injected `injectPassword` function on the page. Two call sites:
  - `src/serviceworker/index.ts:11` — auto-injects the content script into the tab whenever a top-level `https://` navigation completes (driven by `webNavigation.onCompleted` above it).
  - `src/components/passwordgenerator/PasswordGenerator.component.tsx:43,47` — when the user clicks "Inject automatically", the popup injects `contentscript.js` into the active tab and then calls `(window as InjectionContextHolder).ewpassext!.injectPassword!(password)`.
- **`storage`** — Persistence layer for configuration and ephemeral derivation state, accessed via `chrome.storage`/`browser.storage` aliased in `src/lib/browsercompat.ts:5`:
  - `storage.local` — persists the per-domain configuration map under the `metadata` key across browser sessions; see `load`/`store` in `src/lib/storage.ts:20,36`.
  - `storage.session` — holds the derived master-password entropy for the current session only (cleared on browser close and by the alarms mechanism above); see `src/serviceworker/storage.ts:18,20`.
- **`webNavigation`** — Reacts to page navigations:
  - `src/serviceworker/index.ts:7` — `webNavigation.onCompleted` triggers auto-injection of the content script into newly-loaded HTTPS pages.
  - `src/components/contexts/PageContext.component.tsx:51` — `webNavigation.onCommitted` refreshes the popup's cached tab/domain info when the active tab navigates.

### `host_permissions`

- **`https://*/*`** — Required so the `scripting.executeScript` calls above can inject `contentscript.js` and run `injectPassword` on any HTTPS page. Also gates `activeTab` access to the URL of the active HTTPS tab.

### `optional_permissions`

- **`clipboardRead`** — Requested on-demand, inside the user gesture fired when the user clicks the "backup options" link in `src/components/derivationoptions/DerivationOptions.component.tsx`. The click handler `showBackupOptionsTrigger` in `src/components/popup/Popup.component.tsx` calls `permissions.request({ permissions: ['clipboardRead'] })` (via the `permissions` accessor in `src/lib/browsercompat.ts`) before opening the `BackupOptions` panel. Once granted, it backs `navigator.clipboard.readText()` in `src/components/backupoptions/BackupOptions.component.tsx`, which reads a serialized configuration backup string off the clipboard for parsing/import. If the user denies the prompt (or revokes the permission later), the `BackupOptions` "Import status:" row shows `Clipboard permission not granted — click "backup options" again to enable` and the "Import from Clipboard" button stays disabled. (Clipboard *writes* via `navigator.clipboard.writeText()` in the same file and in `src/components/passwordgenerator/PasswordGenerator.component.tsx` are user-gesture-initiated and don't require a declared permission.)

## Style & conventions

- ESLint extends `"react-app"` / `"react-app/jest"` -- no extra config files.
- Strict TypeScript (`strict: true`). JSX transforms via `react-jsx`.
- Component files use `.component.tsx` + `.module.scss` pairing.
- `pnpm` for package management -- check `pnpm-workspace.yaml`.

## Documentation

`README.md` (user manual, technical reference, developer guide), `AGENTS.md` (this file, agent-oriented project map), and `doc/submission-requirements/privacy-policy.md` (AMO/CWS submission privacy policy) describe the extension's behaviour, permissions, and derivation algorithm in prose. When a change touches any of these areas -- derivation parameters, permission model, storage layout, build outputs, feature set -- check all three documents for staleness and update them in the same commit. The privacy policy is only required when the change is user-facing or affects data handling; internal refactors that leave observable behaviour unchanged do not require a privacy-policy edit.
