# E. W. Password Generator

A Chromium/Firefox browser extension that derives website-specific passwords from a single master password. Everything is derived on demand — the extension stores no passwords, only a small set of per-domain options. The same master password and the same options always reproduce the same passwords on any install, so the backup/restore feature is a convenience, not a necessity.

- **No network.** The extension makes no outbound requests. All cryptography and storage happen locally on the device.
- **No password storage.** Neither the master password nor any derived site password is ever written to disk.
- **Time-limited session.** The PBKDF2-derived master entropy is kept in `storage.session` (cleared when the browser closes) for at most 180 seconds after the master password is entered, then wiped by an `alarms`-driven timer.
- **Per-domain configuration only.** The only thing persisted across browser sessions is a map of derivation parameters keyed by derived domain identifiers. No passwords, no master password, no entropy, and no plaintext domain names are stored.
- **Fully stateless derivation.** Passwords are never stored anywhere — they are recomputed from the master password and the per-domain options every time. The same master password and the same options produce the same passwords on any device, with nothing to sync. The backup/restore feature exists purely as a UX convenience for re-applying your preferred per-domain options to a fresh install; it is not required to reproduce your passwords.

## Overview

The extension turns one master password into a unique, reproducible password for every website you use. You enter your master password into the popup; the extension derives the site-specific password on demand and either copies it to your clipboard or injects it directly into the page's password field. The derived master entropy is held in session storage for at most 180 seconds, after which you re-enter your master password. Because the derivation is deterministic, the same master password and the same per-domain configuration always produce the same site password — there is nothing to sync across devices beyond the (small) per-domain configuration map, which you can back up to the clipboard.

Because passwords are never stored — only derived — the extension is effectively stateless. A fresh install on a new device, given the same master password and the same per-domain options, will produce byte-for-byte identical passwords. The per-domain configuration map and its backup/restore feature exist purely as a UX convenience so you don't have to re-enter your preferred length, iteration, and character-set choices for each site; they contain no secret material and are not required to reproduce your passwords.

The master password itself is never persisted. After entry it is immediately run through PBKDF2 to produce *master entropy*, which is held in session storage for at most 180 seconds and then wiped. Neither the master password nor any derived site password is ever written to disk.

A legacy derivation path (plain SHA-256) is retained alongside the modern KDFs so that site-specific passwords created with older versions of the extension keep working when `legacyDerivation` is set for a domain.

## Features

- **Domain picker** — select which domain the password is derived for, with automatic parent-domain matching (e.g. `login.example.com` → `example.com`).
- **Configurable derivation** — per-domain password length, iteration count, special-character usage, and (legacy only) an extra-long mode.
- **Automatic injection** — on HTTPS pages, a content script detects focused password fields and either auto-fills the derived password (if the master entropy is still in session) or opens the popup so you can enter your master password.
- **Backup & restore** — export and import the per-domain configuration map via the clipboard. Backups contain only derivation parameters, never passwords.
- **Checksum** — a short 2-character checksum derived from the master entropy is displayed (and optionally stored) so the popup can detect whether the entered master password matches the one used to create the stored configuration.
- **Multiple master passwords** — although designed around a single master password, the extension supports using more than one. Each master password produces its own independent set of domain configurations, and the extension automatically detects the right configs for whichever password is in session. The only caveat: the checksum feature has a single slot, so with multiple master passwords you leave it unset and verify the 2-character value yourself.
- **Time-limited session** — the derived master entropy is held in `storage.session` for at most 180 seconds, then wiped by an `alarms`-driven timer. You can also clear it immediately from the popup.

## AI disclosure

This is a long running project: the current codebase was started in 2022, descending from a predecessor project dating to 2019. The architecture is entirely hand-designed, the code is largely hand-written, and every line is manually reviewed and frequently hand-edited. LLMs are used for tedious or mechanical work: getting dependency bumps right, swapping build systems, generating boilerplate, andwriting documentation like this one. They are not used for designing or unsupervised authoring of core logic.

The use of LLMs is a deliberate choice, and one that some may reasonably object to; that is a legitimate position. That said, the use of LLMs for this project has been subject to specific choices and limitations: the exclusive open-weight models used here are hosted on [Scaleway](https://www.scaleway.com) infrastructure, a hosting provider specifically selected for environmental reasons, as Scaleway's data centres are among the lower-carbon-intensity options available. Secondly, they are fully under EU jurisdiction. These claims can be verified against Scaleway's published sustainability reporting. The codebase itself remains fully under the author's manual control; the AI tooling never commits or ships anything without explicit human review.

## User manual

### Entering your master password

Type your master password into the popup and submit. The extension runs it through PBKDF2 (SHA-256, 100 000 iterations) to produce *master entropy*, then discards the password itself. The master entropy is kept in `storage.session` for at most 180 seconds, after which an `alarms`-driven timer wipes it. You can also clear it immediately via the button in the popup. While the master entropy is in session, the popup can derive passwords for any domain you have configured.

### Multiple master passwords

Although the extension is designed around a single master password, nothing prevents you from using more than one. Because domain identifiers are derived from the master password (see [How passwords are derived](#how-passwords-are-derived)), each master password produces its own independent set of domain identifiers. Configurations created with master password A and configurations created with master password B coexist in the same `storage.local` map without interfering with each other — the only risk is the 32-bit domain-ID collision described in the technical section, which is negligible in practice. When you enter master password A, the extension computes A's domain identifiers and finds A's configurations; when you enter master password B, it finds B's.

The one caveat is the **checksum feature**. The checksum slot in `storage.local` holds a single 2-character value, so it can only validate one master password at a time. If you use multiple master passwords, leave the checksum unsaved (don't click "Save") and verify the displayed 2-character value yourself each time you enter your master password — it will be the same for a given master password on every device.

### Selecting a domain

The domain picker automatically detects the current tab's HTTPS domain and walks up to its parent domain (e.g. `login.example.com` → `example.com`) to find a matching configuration. You can also select a domain manually from the list of configured domains.

### Derivation options

For each domain, the following parameters can be configured:

- **`Password length:`** — the length of the derived password, between 10 and the maximum supported by the derivation path (64 for modern; 32–48 for legacy depending on the character set and long-password mode).
- **`Iteration:`** — an integer (1–100) that selects which *version* of the password to derive for this domain. Changing the iteration produces a completely different password for the same domain, without changing your master password. This is intended for sites that enforce periodic password rotation: when you are forced to change your password, increment the iteration and you get a new, independent password. **This is not a KDF iteration count.** The PBKDF2 iteration count (100 000) is a fixed internal constant; the per-domain `Iteration:` value is mixed into the derivation input as a label and has nothing to do with PBKDF2.
- **`Special Chars:`** — when enabled, derived passwords use the extended character set (lowercase, uppercase, digits, and 32 punctuation characters). When disabled, only lowercase, uppercase, and digits are used.
- **`Long passwords:`** *(legacy derivation only)* — when the current domain uses legacy derivation, this toggle appears. It controls how much entropy is extracted from the fixed 256-bit legacy hash. When *off*, extraction stops as soon as the remaining value is too small to map without modulo bias, leaving some entropy unused but keeping every character unbiased. When *on*, extraction continues past that point, mapping all remaining entropy to characters at the cost of modulo bias in the trailing characters, which allows longer passwords. The modern derivation path does not have this option: it can simply request more entropy from HKDF, so the toggle is hidden and the flag is always written as `false` for modern configurations.

### Generating, copying, and injecting

Once a domain is selected and configured, the derived password is shown in the popup. You can copy it to the clipboard, or on most pages click "Inject automatically" (or just press ENTER) to have the the extension fill it directly into the page's password input fields.

### Backup & restore

The per-domain configuration map can be exported to the clipboard as a compact hex string and re-imported on another device or after a reinstall. Exporting requires no special permission. Importing from the clipboard requires the optional `clipboardRead` permission, which is requested on-demand the first time you click "backup options" — see [Privacy & security](#privacy--security) and the [privacy policy](doc/submission-requirements/privacy-policy.md) for details. Backups contain only derivation parameters (length, iteration, flags) keyed by derived domain identifiers; they never contain passwords, the master password, or master entropy and they can't be used (without knowing the master password) to know which domains the configs are for.

**The backup is a convenience, not a necessity.** Because passwords are never stored and instead derived on demand from the master password and the per-domain options, a fresh install with the same master password and the same options will reproduce your passwords exactly, even with no backup at all. The backup simply spares you from re-entering your preferred length, iteration, and character-set choices for each domain; you would get the same passwords by recreating the same options manually. The backup contains no secret material and losing it changes nothing about your ability to derive your passwords.

## Privacy & security

- **No network access.** The extension uses no `fetch`, `XMLHttpRequest`, `sendBeacon`, or any other networking API. All cryptography is performed locally via the browser's native Web Crypto API (`crypto.subtle`) and the bundled `sha256` library.
- **No password storage.** The master password is processed in memory only and discarded immediately after PBKDF2. Derived site passwords are computed on demand and never written to persistent storage.
- **Time-limited session.** The derived master entropy lives in `storage.session` (cleared on browser close) for at most 180 seconds, then wiped by an `alarms` timer; you can also clear it immediately from the popup.
- **Domain configurations are keyed by derived identifiers, not plaintext domain names.** This is a deliberate privacy feature. The per-domain configuration map stored in `storage.local` is keyed by 32-bit domain identifiers derived from your master password and the domain name (see [How passwords are derived](#how-passwords-are-derived)). Without the master password, the stored configuration reveals nothing about which websites you use — the keys are opaque. Domain lookup works by computing the identifier for a candidate domain and checking for membership in the map, similar to a Bloom filter. See the technical section for the collision implications.

See [`doc/submission-requirements/privacy-policy.md`](doc/submission-requirements/privacy-policy.md) for the full privacy policy submitted to extension stores.

## How passwords are derived

This section describes the derivation algorithm in full detail. All cryptography is performed with the browser's native Web Crypto API (`crypto.subtle`) and the bundled `sha256` library. The reference implementation is in `src/lib/derivation.ts`; hex ↔ buffer helpers are in `src/lib/hexutils.ts`. Golden-value tests for both paths are in `src/lib/derivation.test.ts`.

### Pipeline

```
master password ──PBKDF2──▶ master entropy ──┬──HKDF(domain)──▶ domain ID (config key)
 (discarded)      SHA-256    (2048-bit)      │
                                             └──HKDF(iteration/domain)──▶ key material ──rejection sampling──▶ password
```

Two derivation paths exist: a **modern** path (PBKDF2 + HKDF, the default for new configurations) and a **legacy** path (plain SHA-256, retained for configurations created with older versions of the extension). `deriveMasterEntropy` and `getDomainIds` return both modern and legacy inputs so both paths can coexist.

### Constants and character maps

- `SEED_PREFIX = "E. W. Password Generator Seed"` — PBKDF2 salt and HKDF salt for master entropy and domain ID derivation.
- `DERIVE_PREFIX = "Domain Password"` — HKDF salt for password derivation; also the legacy SHA-256 input prefix.
- `BASIC_MAP` — the 62 alphanumeric characters (`a-z`, `A-Z`, `0-9`).
- `EXTENDED_MAP` — `BASIC_MAP` plus 32 ASCII punctuation characters (backtick, tilde, `!`, `@`, `#`, `$`, `%`, `^`, `&`, `*`, `(`, `)`, `-`, `_`, `=`, `+`, `[`, `{`, `]`, `}`, `\`, `|`, `;`, `:`, `'`, `"`, `,`, `<`, `.`, `>`, `/`, `?`), for a total of 94 characters.
- PBKDF2 iteration count: **100 000** (fixed internal constant; unrelated to the per-domain `Iteration:` option).

### Step 1: Master entropy

The master password is run through **PBKDF2-HMAC-SHA-256** (`deriveMasterEntropy`):

- salt: UTF-8 bytes of `SEED_PREFIX`
- iterations: 100 000
- output: 2048 bits (256 bytes)

The master password is discarded immediately; only the derived entropy (stored as hex) is retained in `storage.session`. A legacy derivation input is also computed as `sha256(SEED_PREFIX + '/' + password)` and kept alongside it.

### Step 2: Domain identifier (configuration key)

The per-domain configuration is stored in `storage.local` under a key derived from the master entropy and the domain name (`getDomainIds`). Both the modern and legacy identifiers are **32-bit** values, represented as 8 hex characters:

- **Modern domain ID** — HKDF-SHA-256, salt = UTF-8(`SEED_PREFIX`), info = UTF-8(domain), output = 32 bits.
- **Legacy domain ID** — first 4 bytes of `sha256(legacyDerivationInput + '/' + domain)` = 32 bits.

Both identifiers are 32-bit and therefore collision-prone (≈ 50% collision probability at roughly 65 536 domains). This is by design: the configuration store is treated as a Bloom-filter-like membership structure. To look up a domain's configuration, the extension computes the domain's identifier and checks whether it is a key in the stored map. Plaintext domain names are never stored. Because the identifiers are derived from the master password, the configuration map is opaque without it — an attacker with access to `storage.local` cannot determine which domains you have configured.

### Step 3: Password derivation (modern)

`derivePasswordModern` derives the site password from master entropy, the domain, and the per-domain configuration:

- **HKDF-SHA-256**, salt = UTF-8(`DERIVE_PREFIX`), info = UTF-8(`"{iteration}/{domain}"`), output = `size * 4` bytes (i.e. `size * 32` bits).
- Each output character consumes a 4-byte window. The first two bytes form a 16-bit big-endian value; the next two bytes form a second 16-bit big-endian value.
- **Partial rejection sampling:** let `mapLength` be the character-map length (62 or 94) and `threshold = floor(65536 / mapLength) * mapLength`. If the first 16-bit value is less than `threshold`, it is used directly; otherwise it falls in the rejection range (size `65536 % mapLength`, i.e. at most `mapLength - 1` values) and the second 16-bit value is used instead with plain modulo. The probability that *both* values fall in the rejection range is negligible — bounded by `((mapLength - 1) / 65536)²` per character, which is at most ~2e-6 — making the output unbiased for all practical purposes. The character is selected as `map[value % mapLength]`.
- `allowExtraLongPasswords` is **ignored** by the modern path. It is always written as `false` for modern configurations. Maximum length: 64.

### Step 3b: Password derivation (legacy)

`derivePasswordLegacy` derives the site password using plain SHA-256:

- Input: `sha256("{DERIVE_PREFIX}/{legacyDerivationInput}/{iteration}/{domain}")` — a 256-bit (32-byte / 64-hex-char) hash.
- The hash is split into 8 chunks of 8 hex characters (32 bits each). Each 32-bit chunk is used to extract a sequence of characters via `calcRoundsLegacy`: repeatedly take `x % map.length` to select a character, then `x = floor(x / map.length)`, until `x` reaches 0.
- **Unbiased boundary:** when `Long passwords:` is *off*, extraction stops as soon as `x < map.length` (the remaining value can no longer be mapped without modulo bias). This caps the password length but keeps every character unbiased.
- **Extra-long mode:** when `Long passwords:` is *on*, extraction continues past the unbiased boundary, mapping all remaining entropy to characters. The trailing characters accept modulo bias in exchange for using the full 256-bit hash and allowing longer passwords.
- Maximum password lengths for legacy derivation (per `getMaxPasswordSizeLegacy`):

  | Special chars | Long passwords | Max length |
  |---|---|---|
  | no  | no  | 40 |
  | yes | no  | 32 |
  | no  | yes | 48 |
  | yes | yes | 40 |

### Determinism

Both derivation paths are deterministic: the same master password, domain, iteration, and configuration always produce the same password. There is no randomness involved. The test suite in `src/lib/derivation.test.ts` locks in golden-value outputs for both paths and verifies character-distribution sanity (modern within 15% deviation, legacy within 25% due to its inherent modulo bias).

## Browser support

- Chromium-based browsers (Chrome, Edge, Brave, etc.) — Manifest V3, signed with the Chrome Web Store publisher key.
- Firefox — Manifest V3, built via `pnpm build-firefox` (patches the manifest for Firefox compatibility and packs a signed `.xpi`).

## Developer guide

### Requirements

Node.js and [pnpm](https://pnpm.io).

### Build

```
pnpm install
pnpm build              # Chromium build → build/
pnpm build-firefox      # Firefox build → build/{6d1f30b1-2f6d-48f9-a01a-c32a0c27d12d}.xpi
pnpm typecheck          # tsc --noEmit (standalone, also runs as part of build)
pnpm test               # vitest (watch mode)
```

### Build outputs

The main popup is a React 19 + Vite app built into `build/index.html` and `build/static/js/[name]-[hash].js`. Two additional entrypoints are bundled into `build/`:

- `serviceworker.js` — background service worker (via `vite.config.ts`)
- `contentscript.js` — content script injected into HTTPS pages (via `vite.scriptinjections.config.ts`)

### Firefox build

The Chrome manifest carries a `"key"` field (the Chrome Web Store publisher key) that Firefox rejects, so the Firefox build patches `build/manifest.json` via `firefox/manifest.json.patch` before packing the `.xpi`. The patch makes four changes:

- Renames the extension from "Chromium Extension Edition" to "Firefox Extension Edition"
- Removes the `"key"` field
- Removes the `"title"` field from `"action"`
- Replaces `"background.service_worker"` with `"background.scripts"` (Firefox MV3 uses `"scripts"` instead of `"service_worker"`)

### Code structure

| Directory | Purpose |
|---|---|
| `src/components/` | React UI (popup views and shared UI utilities) |
| `src/components/contexts/` | React context providers (`ConfigurationContext`, `PasswordContext`, `PageContext`, `PasswordChecksumContext`) |
| `src/components/backupoptions/` | Backup/restore UI |
| `src/components/derivationoptions/` | Per-domain derivation parameter UI |
| `src/components/domainpicker/` | Domain selection UI |
| `src/components/masterpassword/` | Master password entry UI |
| `src/components/passwordgenerator/` | Password generation, copy, and injection UI |
| `src/components/checksum/` | Master password checksum UI |
| `src/lib/` | Core logic: derivation (`derivation.ts`, `hexutils.ts`), storage, domain helpers |
| `src/internalapi/` | Types, requests, and handler for popup ↔ content script ↔ service worker IPC |
| `src/serviceworker/` | Background service worker logic |
| `src/scriptinjections/` | Content script injection code |
| `public/manifest.json` | Extension manifest (V3, Chromium) |
| `firefox/` | Firefox build patch |

### Entry points

- `src/index.tsx` — popup page entrypoint (also exposes `window.storage` with `dump` / `import` / `importLegacy` for backup & restore via the developer console)
- `src/serviceworker/index.ts` — background service worker
- `src/scriptinjections/contentscript/index.ts` — content script

Components consume React context: `ConfigurationContext`, `PasswordContext`, `PageContext`, `PasswordChecksumContext`.

### Extension permissions

The manifest (`public/manifest.json`) requests the following permissions and host permissions. Each is listed below with the code that consumes it.

#### Required permissions

- **`activeTab`** — Grants temporary access to the currently active tab when the user invokes the popup. Consumed via `browser.tabs.query({ windowId: ..., active: true })` in `src/components/contexts/PageContext.component.tsx` to read the active tab's `id` and `url`, which the popup then uses to derive the domain-specific password and target injection.
- **`alarms`** — Used in `src/serviceworker/storage.ts` to expire the in-memory master-password entropy. `alarms.create(CLEAR_PASSWORD_ALARM, { delayInMinutes: ... })` schedules a delayed wipe; `alarms.onAlarm` fires the wipe when the alarm elapses, ensuring derived entropy isn't kept in session storage beyond the user-requested TTL (180 seconds).
- **`scripting`** — Backs `scripting.executeScript`, which injects `contentscript.js` and invokes the injected `injectPassword` function on the page. Two call sites:
  - `src/serviceworker/index.ts` — auto-injects the content script into the tab whenever a top-level `https://` navigation completes (driven by `webNavigation.onCompleted` above it).
  - `src/components/passwordgenerator/PasswordGenerator.component.tsx` — when the user clicks "Inject automatically", the popup injects `contentscript.js` into the active tab and then calls `(window as InjectionContextHolder).ewpassext!.injectPassword!(password)`.
- **`storage`** — Persistence layer for configuration and ephemeral derivation state, accessed via `chrome.storage`/`browser.storage` aliased in `src/lib/browsercompat.ts`:
  - `storage.local` — persists the per-domain configuration map under the `metadata` key across browser sessions; see `load`/`store` in `src/lib/storage.ts`.
  - `storage.session` — holds the derived master-password entropy for the current session only (cleared on browser close and by the alarms mechanism above); see `src/serviceworker/storage.ts`.
- **`webNavigation`** — Reacts to page navigations:
  - `src/serviceworker/index.ts` — `webNavigation.onCompleted` triggers auto-injection of the content script into newly-loaded HTTPS pages.
  - `src/components/contexts/PageContext.component.tsx` — `webNavigation.onCommitted` refreshes the popup's cached tab/domain info when the active tab navigates.

#### Host permissions

- **`https://*/*`** — Required so the `scripting.executeScript` calls above can inject `contentscript.js` and run `injectPassword` on any HTTPS page. Also gates `activeTab` access to the URL of the active HTTPS tab.

#### Optional permissions

- **`clipboardRead`** — Requested on-demand, inside the user gesture fired when the user clicks the "backup options" link in `src/components/derivationoptions/DerivationOptions.component.tsx`. The click handler `showBackupOptionsTrigger` in `src/components/popup/Popup.component.tsx` calls `permissions.request({ permissions: ['clipboardRead'] })` (via the `permissions` accessor in `src/lib/browsercompat.ts`) before opening the `BackupOptions` panel. Once granted, it backs `navigator.clipboard.readText()` in `src/components/backupoptions/BackupOptions.component.tsx`, which reads a serialized configuration backup string off the clipboard for parsing/import. If the user denies the prompt (or revokes the permission later), the `BackupOptions` "Import status:" row shows `Missing permission` and the "Import from Clipboard" button stays disabled. (Clipboard *writes* via `navigator.clipboard.writeText()` in the same file and in `src/components/passwordgenerator/PasswordGenerator.component.tsx` are user-gesture-initiated and don't require a declared permission.)

## License

Copyright (C) Erik van `t Wout. Distributed under the terms of the **GNU General Public License v2**. See [`COPYING`](COPYING) for the full license text.
