# Privacy Policy

**E. W. Password Generator** (the "Extension") is a browser extension that derives website-specific passwords from a single master password using local cryptographic key derivation. This policy describes what data the Extension handles, how it is stored, and how it is shared.

**Last updated:** 14 July 2026

## Summary

The Extension does **not** collect, transmit, sell, or share any personal data. All cryptographic operations and storage occur locally on the user's device. The Extension makes no outbound network requests of any kind.

## Data handled by the Extension

### 1. The master password

The master password is the password the user types into the Extension's popup to derive per-site passwords.

- The master password is **processed in memory only** and is **never written to persistent storage** (neither to disk, nor to `storage.local`, nor to `storage.session`).
- Immediately after the master password is entered, it is run through **PBKDF2** (SHA-256, 100 000 iterations) to produce a derived *master entropy* value. The master password itself is discarded at this point.
- The derived master entropy — not the master password — is what the Extension retains for the duration of the session.

### 2. Derived master entropy (session-only, time-limited)

The PBKDF2-derived master entropy is the intermediate value from which per-domain passwords are derived.

- Stored in `browser.storage.session`, which is cleared when the browser closes and is not persisted to disk.
- Held for a maximum of **180 seconds** (3 minutes) from the moment the master password is entered.
- An `alarms`-driven timer (`alarms.create` with a `delayInMinutes` of 3) overwrites this value in `storage.session` when the timer elapses.
- The user may also clear it immediately by clicking the applicable button in the popup.

### 3. Per-domain derivation configuration (persistent)

For each website the Extension is used with, the user may configure derivation parameters (password length, iteration number, and whether special characters are used).

- Stored locally under the `metadata` key in `browser.storage.local`, which persists across browser sessions.
- **Does not store plaintext domain names.** The configuration map is keyed by 32-bit identifiers derived from the master password and the domain name via HKDF/SHA-256, not by the domain names themselves. Without the master password, the stored keys are opaque and reveal nothing about which websites the user has configured.
- **Contains no passwords, no master password, no master entropy, and no per-site derived passwords** — only the numeric/boolean parameters used to derive a password on demand.
- Remains on the user's device and is never transmitted anywhere.
- The user may export or import this configuration map via the clipboard (the "Backup & Restore" feature). An exported backup string contains only these derivation parameters and never any password material.

### 4. Derived site-specific passwords

Per-site passwords are computed on demand from the master entropy and the per-domain configuration.

- Computed in memory when the user requests a password and **never written to persistent storage**.
- Delivered to the user in one of two ways, both user-initiated:
  - copied to the clipboard via `navigator.clipboard.writeText()` under a user gesture, or
  - injected directly into password input fields on the active web page via a content script that the Extension injects into the page.
- Once handed to the clipboard or the page, the Extension retains no copy.

## Data the Extension does **not** collect or transmit

The Extension does **not**:

- make any outbound network requests (no `fetch`, `XMLHttpRequest`, `navigator.sendBeacon`, or any other networking API is used anywhere in the source);
- collect, transmit, or sell analytics, telemetry, crash reports, or usage statistics;
- transmit the master password, derived entropy, derived site passwords, or per-domain configuration to any server;
- use any third-party service, SDK, or library that performs network communication;
- read or modify page content on sites other than the active HTTPS tab where the user has invoked the Extension.

The complete source code is available at https://github.com/nuc1e4r5n4k3/ewpassext and may be inspected to verify any of the above.

## Permissions and their justification

The Extension requests the following permissions. Required permissions are needed for the Extension's core functionality; optional permissions are requested on-demand only when the user invokes the corresponding feature.

### Required permissions

| Permission | Justification |
|---|---|
| `activeTab` | Read the active tab's `id` and `url` so the Extension can derive the domain-specific password and target injection on the page the user is viewing. |
| `alarms` | Schedule the automatic wipe of the in-session master entropy after 180 seconds. |
| `scripting` | Inject `contentscript.js` into the active tab and invoke the injected `injectPassword` function to fill password input fields. |
| `storage` | Persist the per-domain derivation configuration map in `storage.local`, and hold the time-limited derived master entropy in `storage.session`. |
| `webNavigation` | Detect when an HTTPS page has finished loading so the content script can be auto-injected, and refresh the popup's cached tab/domain info when the active tab navigates. |
| `https://*/*` (host permission) | Required so the `scripting.executeScript` calls can inject the content script and run `injectPassword` on any HTTPS page the user logs into. |

### Optional permissions

| Permission | Justification |
|---|---|
| `clipboardRead` | Read a serialized configuration backup string from the clipboard for import. Requested on-demand, inside the user gesture fired when the user clicks the "backup options" link in the popup, via `permissions.request`. If the user denies the prompt, the "Import from Clipboard" button stays disabled. The user may revoke this permission at any time through the browser's extension management interface. (Clipboard *writes* for backup export and password copy are user-gesture-initiated and do not require this permission.) |

No permission is used for any purpose other than its stated justification.

## Third-party services

The Extension uses **no third-party services**. All cryptography is performed locally via the browser's native Web Crypto API (`crypto.subtle`) and the bundled `sha256` library, which operates entirely on-device.

## User choices and data control

- The user controls whether the master entropy is in session by entering or clearing the master password in the popup.
- The user controls the per-domain configuration map and may export, import, or clear it at any time via the Backup & Restore UI.
- The user may uninstall the Extension at any time, which removes the persistent per-domain configuration from `storage.local`.
- The user may review the Extension's permissions in their browser's extension management interface and revoke them at any time.

## Children's privacy

The Extension is not directed at children and is not intended for use by children under the age of 13 (or the applicable age of digital consent in the user's jurisdiction). The Extension does not knowingly collect any personal data from anyone, including children.

## Changes to this policy

Any changes to this policy will be reflected by an updated "Last updated" date above and, where the change is material, will accompany a new version of the Extension submitted to the relevant browser extension store.

## Contact

This Extension is developed and maintained by Erik van `t Wout. Source code and issue tracking are available at the project's public repository: https://github.com/nuc1e4r5n4k3/ewpassext. Please use the repository's issue tracker to report privacy concerns or ask questions about this policy.
