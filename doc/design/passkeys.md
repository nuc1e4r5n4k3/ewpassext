# Passkeys (WebAuthn) — Design

**Status:** Proposal (ready for review)
**Scope:** Optional, experimental, strictly opt-in support for passkeys (WebAuthn) by intercepting `navigator.credentials` in the page main world
**Extension:** ewpassext (E. W. Password Generator)

---

## 0. Executive summary

TOTP works because the extension computes a code the *server* validates against a shared secret. Passkeys are different: the server validates a *signature* made with a private key, and the ceremony is driven by the website's own JavaScript calling `navigator.credentials.create()/get()`. There is no stable browser API that lets an extension act as a WebAuthn authenticator for arbitrary websites, so the only path that works on real sites today — and the one 1Password, Bitwarden, Dashlane and the "Linux Passkey Manager" add-on all use — is to **monkey-patch `navigator.credentials` from a script injected into the page's main world**, handle the ceremony ourselves, and return a fabricated-but-cryptographically-valid `PublicKeyCredential` to the page.

This design adds that as an **optional feature, disabled by default**. Passkeys are a possession-based credential class, so the per-domain private key is a **true random P-256 scalar generated at registration time and stored encrypted at rest** with a key derived from the master password (the same pattern the extension already uses for per-domain TOTP secrets). The key is recoverable only while master entropy is in memory, and it never leaves the device unless the user opts in. The feature is therefore deliberately stateful: the credential exists only where its encrypted key exists, guarded by the master password — a possession- and knowledge-based credential.

To keep an experimental feature from disturbing pages that never opt in, the monkey-patch is installed **only on frames whose domain has passkeys enabled**, decided at `document_start` by the service worker and mirrored to the main-world shim as a synchronous in-page flag. A single per-domain checkbox drives the feature through three states — off, "Allow PassKey registration", "Use PassKey" — which separates registration from sign-in and eliminates the "first `create()`, afterwards `get()`" deadlock.

Key decisions:

1. **Random per-domain key, encrypted at rest** with an HKDF-derived key (master password as the ultimate secret), exactly as per-domain TOTP secrets are stored today. `credentialId`/`userHandle` are derived from the generated public key (stable, independent of the master).
2. **Strict domain rule:** a passkey is bound to the exact page domain it was registered on; ceremonies for any other domain (including parent/sibling hosts) are **not** handled and are forwarded to the browser with an explanatory popup status. A user with a config on the wrong host must migrate it (typically to the domain matching the site's `rpId`).
3. **Three states, one checkbox:** `Off` (no patching) / `Allow PassKey registration` (patches; handles `create()`, forwards `get()`) / `Use PassKey` (patches; handles `get()`, forwards `create()`). The label flips when a `create()` succeeds.
4. **`@noble/curves` (pure JS) is the only new runtime dependency**, for P-256 key generation, scalar → key, and signing (WebCrypto cannot import a bare EC private scalar, and its ECDSA output is P1363 `r‖s`, not the DER encoding WebAuthn requires). `crypto.getRandomValues` provides the key randomness; WebCrypto provides SHA-256.
5. **Per-frame, per-domain patching:** `mainworld.js` is always injected at `document_start` (to beat page scripts) but idles unarmed. The service worker computes an armed flag per frame origin and the shim patches `navigator.credentials` only when armed; pages without passkeys enabled for their domain remain completely untouched. Arming requires master entropy; if the master is unlocked *after* a page has loaded, that page must be reloaded to be patched.
6. **Both Chrome (111+) and Firefox (128+) support `world: "MAIN"`** in `manifest.json` `content_scripts` — one manifest entry, no `web_accessible_resources`, no CSP workaround, no new permissions.
7. **Backup compatibility is preserved in the default state**, and divergence is opt-in: with "Back up PassKeys" off (the default), passkey configs serialize byte-identically to the current format. Turning the toggle on embeds the encrypted key blob in backups — a variable-length extension that older versions cannot parse (same precedent as the TOTP secret).

---

## 1. Context

- ewpassext currently derives per-site passwords (PBKDF2 + HKDF) and TOTP codes from a single master password. Per-domain config lives in `IDomainConfig` (`src/lib/storage.ts`), serialized by the backup format in `src/lib/backupformat.ts`.
- The popup is a React app (`src/components/popup/Popup.component.tsx`) with nested contexts; the service worker owns master entropy in `storage.session` with a TTL alarm; content scripts talk to the service worker over a typed message protocol (`src/internalapi/`).
- Per-domain TOTP secrets are stored as hex-encoded XOR ciphertext, encrypted with a master-derived HKDF key (`encryptTotpSecret` / `decryptTotpSecret` in `src/lib/totp.ts`; `xorBytes` / `encryptForStorage` in `src/lib/encryption.ts`). The plaintext secret exists in memory only while master entropy is present.
- Nothing in the codebase today touches WebAuthn, EC crypto, or CBOR (verified by repo-wide grep). `package.json` has no EC/CBOR libraries.

This document is the deliverable of an earlier feasibility investigation (three delivery options, cross-browser API research, and a codebase integration pass). Its purpose is to be complete and concrete enough to implement from directly.

---

## 2. Background: why passkeys are not "TOTP for logins"

| | TOTP | Passkey |
|---|---|---|
| Secret | Shared symmetric secret | Private key (server has only the public key) |
| What the server validates | A numeric code == HMAC output | A signature over (`authenticatorData ‖ SHA-256(clientDataJSON)`) |
| Who drives the ceremony | The extension (out-of-band) | The **website's JS** via `navigator.credentials.create/get` |
| Who the server trusts as origin | Nobody (code is origin-less) | The `origin` recorded in `clientDataJSON` |

A website that "supports passkeys" calls `navigator.credentials.get({ publicKey: { challenge, rpId, ... } })`, waits for a `PublicKeyCredential`, and POSTs `clientDataJSON` + `authenticatorData` + `signature` to its server. For an extension to provide that credential it must intercept that call and answer it. Browsers deliberately provide **no extension API** to:
- enumerate/manage passkeys, or
- act as a WebAuthn authenticator for arbitrary pages.

What they *do* allow (Chrome 111+, Firefox 128+: `world: "MAIN"` in `content_scripts`) is running a page-script in the main world before page scripts — which is precisely what enables `navigator.credentials` monkey-patching.

### The three delivery options (recap)

| Option | Works on arbitrary sites? | Notes |
|---|---|---|
| Native WebAuthn *from* the extension page (Firefox 150 / Chrome 122+) | No | `clientDataJSON.origin` is the extension's own origin (`moz-extension://…` / `chrome-extension://…`); servers validate the origin and will reject. Keys also live in the browser/OS, not bound to the extension's storage. |
| Companion native app registered as an OS WebAuthn plugin (Windows WebAuthn Plugin API, macOS Credential Provider extension) | Yes, but | Requires shipping a **separate desktop app**; **Linux has no such OS API at all**; not "built into the extension". |
| **Main-world monkey-patch of `navigator.credentials`** (1Password, Bitwarden, Dashlane, Linux Passkey Manager) | **Yes** | Fragile by nature, but the only browser-extension-only route; this is what we build. |

**Chosen: option 3**, as an optional feature.

---

## 3. Goals / Non-goals

**Goals**
- Optional, opt-in passkey *registration* and *sign-in* on sites that use WebAuthn, using a per-domain credential whose private key is a random value stored encrypted at rest (a possession-based credential guarded by the master password).
- A single per-domain checkbox with two enabled states — "Allow PassKey registration" and "Use PassKey" — so registration and sign-in are separate but driven by one control.
- Zero behavioral change for any page whose domain does not have passkeys enabled.
- Preserve native passkey autofill (never intercept `mediation: "conditional"`).
- No new required permissions; work on Chromium 111+/Firefox 128+ with one shared manifest entry.
- Default backups do not carry passkey keys ("device-bound"); including them in backups is an explicit, warned-about opt-in.

**Non-goals**
- Conditional-mediation autofill integration (forwarded to the browser).
- Attestation beyond `fmt: "none"` (`direct`/`enterprise` and `indirect` will be forwarded to the browser, not fabricated).
- Multiple passkeys per domain (one credential per `rpId`; see §7.5).
- Cross-platform (security-key) attachment, PRF/largeBlob/appid/uvm extensions.
- A companion native app / OS-level authenticator registration (out of scope; Linux has no such API anyway).
- Key derivation from the master password (passkeys are deliberately random and stored).

---

## 4. Assumptions — resolved by research

The following were the "unknown or unclear" bits; each is now resolved with authority cited:

1. **`world: "MAIN"` is available in both browsers in manifest-declared `content_scripts`.** Chrome 111+ (`crbug 1330986`), Firefox 128+ (`Bug 1736575`). Firefox MDN documents `content_scripts.[world] = "MAIN"` since 128. No `web_accessible_resources` needed for manifest-injected files; main-world browser-level injection is not blocked by page CSP. [1][2][3][4]
2. **Main-world scripts have no extension APIs** (no `chrome.runtime`/`browser.*`). Communication must go through `window.postMessage`/`CustomEvent` to an isolated-world content script. [1][2]
3. **`navigator.credentials.create/get` are writable+configurable data properties** on `CredentialsContainer.prototype` (WebIDL §3.7.7), so `navigator.credentials.get = shim` creates an own property on the instance and shadows the prototype method. This is the standard mechanism password-manager extensions use, and the Credential Management spec explicitly anticipates extension hooks (§8.3 "Browser Extensions" — "allowing extensions to overwrite the `get()` and `store()` endpoints"). `navigator.credentials` itself is a getter-only *attribute* and cannot be replaced by assignment. [5][6][7]
4. **Conditional mediation must be forwarded, not intercepted.** CM spec: `"conditional"` = non-modal autofill; a wrapper that forwards it unchanged behaves identically to no interception. Intercepting it (and re-triggering) is the 1Password bug class and the W3C's open complaint (w3c/webauthn#1976). [5][8]
5. **Exact WebAuthn byte formats** are pinned by W3C WebAuthn L3 §16.2 test vectors (see §7.6 for the byte recipes): 37-byte assertion `authData`, 77-byte canonical COSE P-256 key, 164-byte registration `authData` (32-byte credential ID), `{fmt:"none", attStmt:{}, authData}` CBOR attestation object, DER-encoded ECDSA signatures. [9][10][11][12]
6. **WebCrypto cannot import a bare 32-byte EC private scalar** (RAW imports only AES/HMAC/EC *public* keys; EC private needs JWK with `d`, `x`, `y`) and its ECDSA output is IEEE P1363 `r‖s`, **not** the DER form WebAuthn requires. → A tiny pure-JS lib (`@noble/curves`, `p256`) is needed for scalar→key and DER signing. `crypto.getRandomValues` covers key generation; `crypto.subtle` covers SHA-256. [13][14][15]
7. **A software credential satisfies `residentKey: "required"` and discoverable lookups** — there is no on-the-wire proof of residency; the shim behaves like an authenticator with durable local storage (the credential persists until the user disables it; report `credProps.rk: true` when requested). [16]
8. **`userHandle` must be echoed correctly.** Servers key account lookup on it in discoverable flows and may validate it equals the registered `user.id`. We must return a *stable, per-credential* handle — spec: ≤64 bytes, opaque, must be present when `allowCredentials` is empty. [10][17]
9. **Backup-format flags are tolerant of unknown bits.** `deserializeConfig` reads the whole flags byte and tests individual bits — it never rejects unknown bits, so old versions still parse records that only add flag bits. Fixed-length records remain fully readable across versions; a variable-length passkey payload (when "Back up PassKeys" is on) is the deliberate exception, mirroring the TOTP precedent. [18]
10. **No new permissions.** Existing `scripting` + `host_permissions: ["https://*/*"]` suffice; a static `content_scripts` entry needs only host permissions in both browsers. [2][3][4]

---

## 5. Supported browsers & capability floor

| Capability | Chrome | Firefox |
|---|---|---|
| `content_scripts` with `world: "MAIN"` + `run_at: "document_start"` | **111+** | **128+** (Jul 2024) |
| `scripting.executeScript({ world: "MAIN" })` | 95+ | 128+ |
| No `web_accessible_resources` for manifest-injected files | ✓ | ✓ |
| Main-world injection not blocked by strict page CSP | ✓ | ✓ |
| Main-world script has **no** extension APIs | ✓ | ✓ (must bridge via postMessage) |

Users on Firefox < 128 (pre-2024) are effectively unsupported for this feature; the script-tag `web_accessible_resources` fallback exists but is racy and out of scope. The browser floor applies to the *passkey feature only* — the rest of the extension is unchanged.

---

## 6. High-level architecture

```
 ┌────────────┐   runtime messaging (typed, TrustLevel.ExtensionContext)  ┌──────────────────┐
 │ Service    │ ◄────────────── src/internalapi ────────────────────────► │ Isolated content  │
 │ worker     │   passkeyCreate / passkeyAssertion / passkeyArm           │ script            │
 │ (SW)       │                                                            │ contentscript.js  │
 │ • entropy  │   ◄────────── window.postMessage (tagged `ewpassext:*) ──► │ (+ bridge)        │
 │ • crypto   │                                                            └────────▲─────────┘
 │ • config   │                                                                    │ postMessage (in-page)
 └──────▲─────┘                                                                    ▼
        │                                                        ┌──────────────────────────┐
        │ armed/unarmed per frame origin                        │ MAIN-world shim           │
   src/serviceworker/passkey.ts                                 │ mainworld.js  (doc_start, │
        └─ entropy (storage.session)          page JS calls ────►│  all_frames, world: MAIN) │
              config match (exact page domain)                   │ wraps navigator.credentials│
              decrypt stored key                                  │  only when armed           │
                                                                  └──────────────────────────┘
```

- **`mainworld.js`** — IIFE injected at `document_start` in all frames, main world. Installs/removes the `navigator.credentials` wrappers on **arm/disarm** commands from the bridge, and relays eligible ceremonies to the service worker. Has no extension APIs; does no crypto itself; never sees the master password, the entropy, or the stored key.
- **`contentscript.js` (existing)** — gains a small bridge that relays tagged `window.postMessage` traffic between the main-world shim and the service worker, and mirrors the per-frame armed flag into an in-page flag the shim can read synchronously.
- **Service worker** — new `src/serviceworker/passkey.ts` handlers make the arm decision, enforce the exact-domain rule, and perform all crypto against the decrypted key. Crypto code is shared/pure in `src/lib/passkey.ts` so it is unit-testable and SW/popup-agnostic.

---

## 7. Detailed design

### 7.1 Feature gating & settings

1. **Per-domain switch (the only enable control)** — new `IDomainConfig.passkeyEnabled?: boolean`, surfaced in the popup as a single checkbox (§7.10). It is the per-domain gate that decides whether that frame's `navigator.credentials` is patched at all. There is no global master switch: the feature is enabled per domain, and any page whose domain has not opted in is left completely untouched.
2. **Backup toggle** — a standalone `'backupPasskeys'` setting in `storage.local` (default: off), configured in `BackupOptions` (§7.10). When off, passkey material is omitted from every export (device-bound; §7.9).

To avoid the side effects of a broadly-injected experimental feature, the monkey-patch is applied **per frame, per domain**: a frame is patched only when its origin's domain has `passkeyEnabled` set and master entropy is available to make that decision (§7.2, §7.3).

### 7.2 Main-world shim lifecycle

State in `mainworld.js` (module-scoped):
- `sentinel` — check/set `window.__ewpassextMainWorldLoaded` to be idempotent against duplicate injection (extension reload).
- `orig = { get: cc.get.bind(cc), create: cc.create.bind(cc) }` captured once (never on `navigator.credentials` instance's own props).
- `armed: boolean` — set by **arm/disarm** commands. While unarmed the wrappers are absent and the page behaves exactly as if the extension were not installed.

The shim is always injected (it must be, to beat page scripts at `document_start`), but it idles unarmed and patches only on command. Commands over `postMessage` (tag `ewpassext.passkey.arm` / `.disarm` / results):
- **arm** → `cc.create = shimCreate; cc.get = shimGet`.
- **disarm** → restore `cc.create = orig.create; cc.get = orig.get`.

Enabling/disabling while a ceremony is in flight is handled naturally: wrappers delegate to `orig` whenever not handling.

### 7.3 Per-frame arm decision

The isolated content script runs at `document_start` in every frame and asks the service worker, once per navigation, whether the *current frame's* domain is armed:

```
passkeyArm(frameOrigin) → { armed: boolean }          // TrustLevel.ExtensionContext
```

Service worker logic:
1. Load master entropy from `storage.session`; if absent, `armed: false` (see reload note below).
2. Find the config whose domain **exactly equals** `parseDomainFromUrl(frameOrigin)` (no parent-domain walk — see §7.5). If none, or `passkeyEnabled` is not set, `armed: false`.
3. Otherwise `armed: true` (regardless of whether a key is already stored — both enabled states patch the page).

The content script mirrors the result into a synchronous in-page flag (e.g. `document.documentElement.dataset.ewpassextPasskey = '1'`); the main-world shim, which may start before the flag is set, briefly delays the patch and falls back to "not patched until told". Because passkey ceremonies are user-initiated (button clicks) and never fire during the `document_start` phase, this small start-of-load window is not observable in practice. On any later change (enable/disable/registration), the content script re-queries the service worker and posts **arm/disarm**, so already-loaded pages pick up the change immediately.

**Master entropy requirement:** the arm decision depends on entropy (it is needed to locate and decrypt the stored key and to sign). A page loaded while the master is locked is therefore *not* patched; after the user unlocks in the popup, that page must be **reloaded** before passkey ceremonies on it are intercepted. This is a documented, accepted limitation of per-domain patching: the shim never probes a page speculatively.

### 7.4 Crossing worlds: the bridge

- `mainworld.js` sends: `{ tag: 'ewpassext.passkey.request', id, op: 'create'|'assertion', payload: { origin, rpId, challenge, allowCredentials, options } }`.
- `contentscript.js` (all frames) listens on `window` `message`, filters the tag, forwards via a new typed request to the SW, and posts back `{ tag: 'ewpassext.passkey.response', id, result | error }`.
- Responses carry base64url strings for all binary fields (clientDataJSON, authenticatorData, attestationObject, signature, rawId, userHandle). `mainworld.js` decodes them with a small built-in base64url decoder and assembles the duck-typed `PublicKeyCredential`:

```js
{
  type: 'public-key',
  id: b64urlHex(rawId),
  rawId: Uint8Array,          // the credential ID bytes
  response: {
    // assertion:
    clientDataJSON, authenticatorData, signature, userHandle,
    // creation instead:
    // clientDataJSON, attestationObject
  }
}
```

WebAuthn defines `PublicKeyCredential` as non-constructible, so a plain object with matching properties is the standard technique (used by linux-passkey-manager and others). Sites almost always access properties only; `instanceof PublicKeyCredential` is rare and is a documented gap (§11).

### 7.5 Credential model & domain rule

**One credential per `rpId`.** A passkey is a possession-based credential bound to a specific relying party: the server stores the public key under the `rpId` for which it was registered, and on sign-in it verifies that `authenticatorData.rpIdHash` matches. Because each key is a random per-registration value with no recovery path other than its stored ciphertext, the extension must never present it for a `rpId` other than the one it was made for.

**Strict domain rule.** A ceremony is a candidate for handling only when:

```
page domain == passkey config domain == rpId
```

All three are compared with the exact host string from `parseDomainFromUrl` — **no parent-domain matching**. WebAuthn requires `rpId` to be a registrable suffix of the page origin and most sites publish the registrable domain as `rpId`; the rule therefore means the passkey config must live on the exact host that equals the site's `rpId` (typically the eTLD+1 itself). If a ceremony arrives whose `rpId` does not equal the frame's armed domain, or whose page does not equal the configured domain, the shim **errors out**: it does *not* handle, it forwards the ceremony to the browser's own flow, and the popup shows an explanatory status ("Passkeys not available here — configured domain X ≠ this page's domain"). A user who created the config on the wrong host can migrate it by re-creating it on the host that matches the site's `rpId`; the old config (and its stored key) can simply be removed.

**Registration state.** The two enabled states bind the rule to a recorded credential:

- `passkeyEnabled` set, **no stored key** → *Allow PassKey registration*. Handles `create()` (generates the key), forwards `get()` (no credential exists yet — the browser's native flow applies, so the user is never locked out).
- `passkeyEnabled` set, **stored key present** → *Use PassKey*. Handles `get()`, forwards `create()` (the extension manages exactly one credential per domain; a second registration is the browser's business).

This separation is what removes the "first `create()`, afterwards `get()`" deadlock: a domain that has never been registered can never be served a credential the server won't recognize, because `get()` is forwarded until a key actually exists.

**Disabling is gated on deletion.** `passkeyEnabled` is the single runtime enable/disable flag; a stored key (`passkeySecret`) is what grants *Use PassKey* status. Because removing a passkey is irreversible (no recovery path), clicking the checkbox of an enabled domain is intercepted rather than toggled: in *Use PassKey* state it reveals a mouseover **Delete PassKey** button (§7.10) that must be clicked to actually remove the key and return the domain to *Off*. In *Allow PassKey registration* state nothing is stored, so unchecking is immediate. Only real keys are ever backed up — the enable/disable state and the registration opt-in are not (§7.9).

### 7.6 Crypto design (`src/lib/passkey.ts`)

**Key generation & storage:**

```
scalar(32) = p256.utils.randomPrivateKey()          // crypto.getRandomValues; uniform in [1, n)
                                             ┌──────────────────────────────────────────────┐
passkeySecret (stored hex) = XOR( scalar,       HKDF(salt = PASSKEY_KEY_PREFIX,info = domain) )
                                             └──────────────────────────────────────────────┘
    PASSKEY_KEY_PREFIX = 'Domain Passkey Private Key'     // same HKDF family as deriveTotpKey, distinct salt
    HKDF-SHA-256, ikm = entropy.derivationInput, 32-byte output
publicKey = p256.getPublicKey(scalar, false)    // 65 bytes: 0x04 || x || y
credentialId(32) = SHA-256(publicKey)
userHandle(16)   = first 16 bytes of SHA-256(credentialId)
```

- The private key is **random**: its entropy does not depend on the master password. The stored vault keeps only the XOR-encrypted ciphertext, recoverable exclusively while master entropy is in memory — identical mechanics to `encryptTotpSecret`/`decryptTotpSecret` (`src/lib/totp.ts`, `src/lib/encryption.ts`).
- `credentialId`/`userHandle` are derived from the **public** key, so they are stable per credential, hold no secret, and do not require additional storage.
- The master password guards the stored key; it does not generate it. Offline brute-force of the master therefore requires possession of the ciphertext *and* can only recover the key, not recompute it from scratch.
- **No secret is ever persisted in plaintext**; `passkeySecret` is omitted/empty when the credential does not exist, and the plaintext scalar exists in memory only while a ceremony is being performed.

**Byte recipes** (from W3C L3 §16.2 vector shapes; `ES256`) — identical in the registration and assertion flows:

Assertion `authenticatorData` (37 bytes):
```
rpIdHash(32) = SHA-256(TextEncoder(rpId))   flags = 0x05 (UP 0x01 | UV 0x04)   signCount(4) = 0x00000000
```

Registration `authenticatorData` (164 bytes for a 32-byte credential ID):
```
rpIdHash(32) | flags = 0x45 (UP|UV|AT 0x40) | signCount(4) = 0
| AAGUID(16) = 0x00 × 16
| credentialIdLength(2, BE) = 0x0020
| credentialId(32)
| credentialPublicKey = COSE key (77 bytes):
     A5 01 02 03 26 20 01 21 58 20 <x(32)> 22 58 20 <y(32)>
```

`clientDataJSON` (fields serialized in this order, canonical):
```
{"type":"webauthn.create"|"webauthn.get","challenge":"<b64url no padding>","origin":"<window.location.origin>","crossOrigin":false}
```
The `origin` is read from the **page** (main world) and is therefore the real site origin the RP expects — the core reason this approach works where the extension-page WebAuthn path does not.

Attestation object (`fmt:"none"`, CBOR, canonical key order `fmt, attStmt, authData`):
```
A3 63 666d74 64 <len> "none" 67 61747453746d74 A0 68 6175746844617461 58 a4 <164B authData>
```

Signature (assertion only): `ECDSA-SHA256` over `authenticatorData ‖ SHA-256(clientDataJSON)`, ASN.1 **DER** `Ecdsa-Sig-Value` — `p256.sign(msgHash, privateKey).toDERRawBytes()`. In registration with `none` there is **no signature** (empty `attStmt`).

`handshake = authData(37) + clientDataHash(32) = 69 bytes` — that is everything the server verifies, so the shim signing it is cryptographically honest for the relying party (subject to the UV caveat in §10).

### 7.7 Interception rules

**Rule 1 — forward-to-browser is the default.** If any criterion says "can't confidently handle", call `orig.get/create(options)` and return its promise. This matches the industry pattern and the W3C-recommended stop-gap.

The tables below apply only when the **frame is armed** (its domain has passkeys enabled, §7.3) and `options?.publicKey` is present.

**`get(options)` decision table:**

| Condition | Action |
|---|---|
| `options.mediation === "conditional"` | **Forward to `orig.get`** (preserve autofill; never intercept) |
| Domain in *Allow PassKey registration* state (no stored key) | Forward (no credential exists yet) |
| `rpId` ≠ frame's configured passkey domain | **Error out**: forward + popup status (domain mismatch, §7.5) |
| `allowCredentials` present but none of the IDs equal our derived credential ID | Forward |
| No master entropy loaded in SW (`load_password_hash()` empty) | Trigger `openPopup` (best-effort), **forward to `orig.get`**, so the site falls back to its normal flow |
| Otherwise (domain in *Use PassKey* state) | **Handle**: SW decrypts key, signs challenge, returns assertion parts |

**`create(options)` decision table:**

| Condition | Action |
|---|---|
| `options?.publicKey` absent | Forward |
| Domain in *Use PassKey* state (a key is already stored) | Forward (one managed credential per domain) |
| `rpId` ≠ frame's configured passkey domain | **Error out**: forward + popup status (domain mismatch) |
| `authenticatorSelection.authenticatorAttachment === "cross-platform"` | Forward (can't honestly claim a security key) |
| `pubKeyCredParams` lacks ES256 (`alg: -7`) | Forward (`NotSupportedError` otherwise) |
| `attestation === "direct" \|\| "enterprise"` (and arguably `"indirect"`) | Forward (no attestation cert available) |
| Non-empty `extensions` we don't implement (anything besides `credProps`) | Forward (e.g. `appid`, `prf`, `largeBlob`) |
| No master entropy loaded | Trigger `openPopup`, **forward to `orig.create`** |
| Otherwise (domain in *Allow registration* state) | **Handle**: generate + store key, build attestation, return registration parts; **flip domain state to *Use PassKey*** |

Both wrappers must honor `options.signal` (AbortSignal) and `options.timeout` by rejecting with an `AbortError`/`NotAllowedError` rather than hanging (implement a timer; abort mid-messaging by correlating a request id).

### 7.8 Service worker flow & message protocol

New request types in `src/internalapi/types.ts` (`MessageType` union extended):

```ts
export type MessageType = ... | 'passkeyArm' | 'passkeyCreate' | 'passkeyAssertion';

interface PasskeyArmRequest extends Request { type: 'passkeyArm'; }
interface PasskeyArmResponse extends Response {
  type: 'passkeyArm';
  armed: boolean;
}

interface PasskeyCreateRequest extends Request {
  type: 'passkeyCreate';
  challenge: string;          // base64url, from page
  rpId: string;
  options?: { userVerification?: string };  // minimal set we forward
}
interface PasskeyCreateResponse extends Response {
  type: 'passkeyCreate';
  rawId: string;              // base64url (credentialId)
  clientDataJSON: string;     // base64url
  attestationObject: string;  // base64url
}

interface PasskeyAssertionRequest extends Request {
  type: 'passkeyAssertion';
  challenge: string;          // base64url
  rpId: string;
  allowCredentials?: string[]; // base64url credential ids, if any
  userVerification: string;
}
interface PasskeyAssertionResponse extends Response {
  type: 'passkeyAssertion';
  rawId: string;              // base64url
  clientDataJSON: string;     // base64url
  authenticatorData: string;  // base64url
  signature: string;          // base64url (DER)
  userHandle: string;         // base64url
}
```

Follow the existing convention: **`value | undefined` semantics**. A `passkeyCreate/passkeyAssertion` handler returns `undefined` fields when entropy is missing, the frame's domain has no exact config match, the domain is not armed, or the ceremony does not match the domain's state — the bridge then reports "not handled" and the main-world shim forwards to `orig`.

`src/serviceworker/passkey.ts` (new, registered via side-effect import in `src/serviceworker/index.ts`, mirroring `./totp`):

```
create() flow:
1. cached = await load_password_hash();                          // session-storage entropy
   if (!cached) { openPopup(); return { …, rawId: undefined }; }
2. config = configs[domainIdFor(exact pageDomain from sender.origin)];
   if (!config || !config.passkeyEnabled) return undefined-fields;
3. if (config.passkeySecret) return undefined-fields;            // already registered → forward
   if (rpId !== pageDomain) return undefined-fields;             // strict domain rule
4. scalar = p256.utils.randomPrivateKey();
   store config = { ..., passkeyEnabled: true, passkeySecret: encryptPasskeySecret(scalar, domain, entropy) };
5. build clientDataJSON (origin from request) + 164B authData +
   fmt:"none" attestation with COSE key → assemble response via src/lib/passkey.ts.

assertion() flow:
1. cached = await load_password_hash();  if (!cached) { openPopup(); return undefined-fields; }
2. config = configs[domainIdFor(exact pageDomain)];  if (!config || !config.passkeyEnabled) return;
3. if (!config.passkeySecret) return undefined-fields;           // not registered → forward
   if (rpId !== pageDomain) return undefined-fields;
4. rawId = SHA-256(pubkeyOf(config.passkeySecret, domain, entropy));
   if (allowCredentials?.length && !allowCredentials.includes(b64url(rawId))) return undefined-fields;
5. sign challenge (decrypt scalar via decryptPasskeySecret) → assertion parts.
```

`TrustLevel`: `ExtensionContext` (same as `getTotpCode`) — content-script-originated, `sender.origin` carries the frame origin.

### 7.9 Config & backup format changes

`IDomainConfig` (`src/lib/storage.ts`):
```ts
   passkeyEnabled?: boolean;   // new; single runtime enable/disable flag; undefined = Off
   passkeySecret?: string;     // new; hex-encoded XOR-encrypted P-256 scalar; present ⇒ "Use PassKey"
```

The service worker encounters passkeys in exactly two live states — `passkeyEnabled` on with or without a stored key — and `passkeySecret` presence determines use-vs-registration (§7.5).

`src/lib/backupformat.ts`:
- **One flag bit** — `FLAG_PASSKEY = 0x08`, set only when the record carries a passkey section.
- **Passkey section layout** (immediately after the fixed prefix):
  ```
  passkeyLength (1 byte) | passkeySecret (passkeyLength bytes)
  ```
  The length byte is both the enable/disable discriminator and the forward-compatibility hook: `0x00` decodes as *disabled* (no key follows); a non-zero value is the byte length of the encrypted key that follows (32 today). A future key type or size can ride the same length-prefixed section.
- **Only real keys are ever serialized.** `passkeyEnabled` is not backed up at all — a domain's passkey state is reconstructed purely from whether a key is present in the record:
  - `backupPasskeys` **off** (default): no passkey flag or payload — records stay byte-identical to the pre-passkey format (exactly 14 hex chars), and stored keys are **not part of any export** (device-bound, §10).
  - `backupPasskeys` **on** + a key exists: `FLAG_PASSKEY` set, `passkeyLength = 32`, followed by the encrypted key. Such a record is **unreadable by older versions** (variable length, the same precedent as `FLAG_TOTP_SECRET`). Portability of passkeys is an explicit, warned-about choice, not a silent default.
  - `backupPasskeys` **on** + enabled but no key yet (*Allow PassKey registration*): nothing is written; the registration opt-in is ephemeral and not worth backing up, so a restore yields an *Off* domain.

`deserializeConfig`: on `FLAG_PASSKEY`, read the length byte; if `0x00`, no key (`passkeyEnabled` stays unset, i.e. disabled); otherwise read that many bytes, validate the length is plausible (32), and set `passkeySecret`. `preParseBackup` (already variable-length aware via the TOTP flag) honors `FLAG_PASSKEY` the same way and continues to return `undefined` on malformed input.

Backward/forward compatibility summary (verified against `deserializeConfig`/`preParseBackup`, which test flag bits individually and never reject unknown bits):
- Old backup → new code: trivially readable; passkey state stays unset.
- New backup with `backupPasskeys` off → old code: byte-identical records, fully readable.
- New backup with `backupPasskeys` on and passkey records present → old code: rejected via `preParseBackup` (variable-length records), as with the TOTP format. Intended.

### 7.10 Popup UI changes

- **`DerivationOptions.component.tsx`**: add a single **Passkeys** checkbox row, mirroring the existing OTP MFA row in placement and style. The checkbox reflects `config.passkeyEnabled` (the only enable control — there is no global switch) and its label is one of two enabled texts:
  - `Allow PassKey registration` when no key is stored for the domain,
  - `Use PassKey` when a key is stored.
  The label switches automatically when a successful `create()` stores a key (the service worker writes `passkeySecret`, and the popup re-reads the config). `makeConfig`'s `...current` spread and `objectsAreEqual` dirty-detection already handle the new fields for free.
- **Disabling is gated on deletion.** Clicking the checkbox of an enabled domain is intercepted rather than toggled, because removing a passkey cannot be undone:
  - In *Use PassKey* state, clicking reveals a **Delete PassKey** button beneath the row that stays visible while the pointer remains over it (mouseover). Clicking that button deletes the stored key (clears `passkeySecret`) and returns the domain to *Off* (unchecks the box). If the pointer leaves without clicking, the button hides and the checkbox remains checked — nothing is altered.
  - In *Allow PassKey registration* state there is no key to lose, so unchecking takes effect immediately.
  - Checking an *Off* domain enables it (entering *Allow PassKey registration*).
- **`BackupOptions.component.tsx`**: add a **Back up PassKeys** checkbox (default unchecked) bound to the standalone `'backupPasskeys'` setting. While it is unchecked, show a **warning** (e.g. a ⚠ icon with tooltip) next to it: *"Passkeys are not included in backups. If you lose this device or its data, your passkeys cannot be recovered — re-register on each site to restore them."* Checking it includes the encrypted key in future exports (§7.9) and clears the warning.
- **Optional status line** (in the popup): when a ceremony was error-out'd due to the strict domain rule (§7.5), show "Passkeys not available here (domain mismatch)" so the migration path is discoverable.

### 7.11 Build & manifest changes

**Manifest** (`public/manifest.json`): add
```json
"content_scripts": [{
    "matches": ["https://*/*"],
    "js": ["mainworld.js"],
    "run_at": "document_start",
    "all_frames": true,
    "world": "MAIN"
}]
```
- Chrome 111+ and Firefox 128+ both accept `"world"` here, so **no Firefox patch hunk is needed** for this entry (verify during implementation; if any AMO lint friction appears, the fallback is a small `firefox/manifest.json.patch` hunk or `web_accessible_resources` script-tag bridge — documented, not shipped by default).
- No permission changes.

**Build**: new IIFE entrypoint, mirroring the contentscript pattern.
- New `vite.mainworld.config.ts`: `build.lib = { entry: resolve('src/scriptinjections/passkey/mainworld.ts'), name: 'PasskeyMainWorld', formats: ['iife'], fileName: () => 'mainworld.js' }`, `outDir: 'build'`, `emptyOutDir: false`.
- `package.json` build script: `"build": "tsc --noEmit && vite build && vite build --config vite.scriptinjections.config.ts && vite build --config vite.mainworld.config.ts"`.
- (Alternative, noted but not chosen: merge `contentscript` + `mainworld` into one multi-entry `vite.scriptinjections.config.ts` via a `lib.entry` object. Kept as a separate config for lowest risk, exactly as `contentscript.js` was added next to the popup build.)

---

## 8. File-by-file change list

| File | Change |
|---|---|
| `package.json` | Add `@noble/curves` dependency; extend `build` script (7.11) |
| `vite.mainworld.config.ts` | New — builds `build/mainworld.js` (7.11) |
| `public/manifest.json` | New `content_scripts` entry with `world: "MAIN"` (7.11) |
| `src/scriptinjections/passkey/mainworld.ts` | New — main-world shim: install/restore per armed flag, decision tables, bridge, duck-typed credential assembly |
| `src/scriptinjections/contentscript/index.ts` | Add the postMessage ↔ SW bridge + per-frame armed-flag mirroring (7.3, 7.4) |
| `src/internalapi/types.ts`, `requests.ts` | Add `passkeyArm`/`passkeyCreate`/`passkeyAssertion` types + helpers (7.8) |
| `src/serviceworker/passkey.ts` (+ import in `index.ts`) | New — arm decision, exact-domain check, create/assertion handlers (7.8) |
| `src/lib/passkey.ts` (+ `passkey.test.ts`) | New — key generation, encryption-at-rest helpers, byte formats, signing (7.6) |
| `src/lib/cbor.ts` (+ test) | New — minimal deterministic CBOR encoder for the attestation object + COSE key (fixed shapes only) |
| `src/lib/derivation.ts` | Add `PASSKEY_KEY_PREFIX` + `derivePasskeyKey` (HKDF for encrypt/decrypt of the stored scalar) |
| `src/lib/storage.ts` | `IDomainConfig.passkeyEnabled?`, `passkeySecret?` |
| `src/lib/backupformat.ts` | `FLAG_PASSKEY = 0x08`; passkey section `passkeyLength (1B) | secret` (length `0x00` = disabled); honor `backupPasskeys` in `serializeConfig`/`deserializeConfig`/`preParseBackup` |
| `src/components/derivationoptions/DerivationOptions.component.tsx` | Single "Passkeys" checkbox (3 states, switching label) + intercepted-click Delete PassKey flow (mouseover button) |
| `src/components/backupoptions/BackupOptions.component.tsx` | "Back up PassKeys" checkbox (backed by `'backupPasskeys'`) + warning icon when off |
| `src/lib/storage.test.ts`, `backupformat` tests | Flag `0x08` + length-byte round-trips; length `0x00` = disabled; backup-on/off serialization; old-version-reads-new-backup cases |
| `AGENTS.md`, `README.md`, `doc` index | Document the feature, the storage model, the backup flag, and the strict-domain rule (project policy: keep docs in sync in the same change set) |

---

## 9. Testing plan

- **`src/lib/passkey.test.ts`** (golden-value + property style, as `derivation.test.ts`):
  - Storage round-trip: `encryptPasskeySecret`→`decryptPasskeySecret` recovers the scalar for the same `(entropy, domain)`; wrong entropy/domain produces garbage.
  - Key validity: generated scalar is in `[1, n)`; `getPublicKey` yields the expected 65-byte form; repeated generation yields distinct keys (randomness).
  - Golden bytes: `clientDataJSON` exact serialization; 37-byte assertion authData; **77-byte COSE key** against the W3C §16.2 hex; **164-byte** registration authData for a 32-byte credential ID; `fmt:"none"` attestation object against `A3 63 66 6d 74 … 58 a4 <164B>` (§16.2 shape); signature decodes as ASN.1 DER and verifies with the stored credential's public key.
  - Identifier stability: `credentialId`/`userHandle` are stable across calls for the same scalar and differ across scalars.
  - `cbor.ts`: golden encode round-trips for the exact emitted shapes; rejects out-of-range ints.
- **Decision-table tests**: a pure `shouldHandleCreate/shouldHandleAssertion` predicate (extracted from the shim and unit-tested) covering every "forward"/"error out" row in §7.7, including conditional-mediation forwarding and both state gating rows (registration-only `get()` forwards; use-state `create()` forwards).
- **`src/lib/storage.test.ts`**: flag `0x08` + length-byte round-trips; a record with length `0x00` decodes as disabled (no key); a passkey record with `backupPasskeys` off is byte-identical to the fixed 14-hex record; with it on, the variable-length record parses in the new parser and is rejected by a simulated "old version" parser; enablement is reconstructed purely from key presence (no separate flag).
- **Delete-flow test (happy-dom)**: clicking a checked *Use PassKey* checkbox does not uncheck it; the **Delete PassKey** button appears on mouseover and hides on mouse leave without any state change; clicking Delete clears the key and unchecks; unchecking in *Allow PassKey registration* state (no key) takes effect immediately.
- **Bridge tests (happy-dom)**: `mainworld.ts` install/restore idempotence, arming only when the in-page flag is set, forwarding when unhandled, base64url decoding.
- **Manual matrix**: Chrome 111+/FF 128+; registration + login on a real WebAuthn demo (e.g. webauthn.io / passkeys.dev demo) with: no domain enabled (page untouched, unpatched), domain on (no patch on other pages, full create→state flip→get flow), conditional-autofill site (native autofill still appears), entropy expired (falls through, popup opens, no lockout), `cross-platform`-required site (forwards), **domain-mismatch site** (rpId ≠ configured domain → error out + popup status), **page loaded while locked then unlocked** (reload required before patch takes effect), **Use PassKey → click checkbox → Delete PassKey** (and mouse-leave leaves it unchanged), **restore from a backup with "Back up PassKeys" off** (passkeys not restored; warning path exercised), and **restore with it on** (key round-trips).

---

## 10. Security & privacy

- **Possession-based credential.** The private key is a random value generated at registration and stored only as ciphertext at rest; it cannot be recomputed from public information or from the master password. An offline attacker needs the stored ciphertext *and* the master to recover it — the standard password-manager vault model, as used by 1Password and Bitwarden, and the same protection the extension already applies to per-domain TOTP secrets.
- **Origin fidelity**: `clientDataJSON.origin` is read from the page's own main world, so it reflects the real site. The service worker derives/signs only when `page domain == passkey config domain == rpId` (strict equality, no parent-domain walk), so a malicious page cannot invoke a passkey bound to a different RP.
- **Strict domain enforcement in two layers**: the shim only patches armed frames, and the service worker independently re-checks the exact-domain rule and `sender.origin` before any crypto. A forged `window.postMessage` request (any same-frame page can post to the bridge) can never cause a signature over an out-of-scope `rpId`.
- **UV caveat (flag 0x04)**: WebAuthn's UV bit means "the authenticator locally authorized the user". We set UV only when master entropy is present in the session (the user typed the master password this session, or it is within the `PASSWORD_TTL` window). This is a conscious, documented trust-model assumption — the same one the extension already makes for password/TOTP auto-injection. When entropy is absent we never handle, we forward. This is undetectable server-side (without attestation) and must be stated in the README.
- **Device-bound by default.** With "Back up PassKeys" off, passkeys never leave the device; an exported backup string contains no passkey material, so a leaked backup cannot be used to brute-force or recover passkeys. The corresponding cost — passkeys are lost with the device — is surfaced as a warning in `BackupOptions` and is the reason a default-off setting protects the smaller attack surface while a warned opt-in trades it for portability.
- **Minimal exposure**: the main-world script contains no secrets, no crypto, no entropy, no keys; it only wraps `navigator.credentials` on armed frames and relays opaque options. All secrets and crypto live in the service worker. Main-world code is page-visible (it *is* page JS) and modifiable by the page — acceptable because it holds nothing sensitive; a page can tamper with its own wrappers, but that only affects that page's own ceremony, and the bridge + SW validate inputs (`rpId`, well-formed base64url, sizes) before doing any work.
- **Per-domain opt-in**: disabled means idling, unarmed script; only frames whose domain opted in are patched. No certificate/signature work happens without explicit per-domain opt-in.
- **No new permissions**: no `webNavigation` expansion, no `activeTab` change, no `web_accessible_resources`, no `nativeMessaging`.
- **Supply chain**: single pure-JS dependency (`@noble/curves`), audited, tree-shakeable; CBOR is hand-rolled and deterministic for the fixed shapes we emit; key randomness comes from the platform CSPRNG (`crypto.getRandomValues`).

---

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| **Conditional autofill breakage** (the 1Password/W3C complaint) | Never intercept `mediation: "conditional"`; forward unconditionally (§7.7). |
| **Passkey config on the wrong host** (site uses a subdomain, or rpId differs from the configured page) | Strict domain rule errors out and explains via popup status; user migrates the config to the host matching the site's `rpId` (§7.5, §10). |
| **Page loaded while the master is locked** → not patched until a reload | Documented: unlock, then reload the page. Ceremonies are user-triggered, so the first interception is always on a reloaded, armed page. |
| **Lockout before first registration** (user expects a passkey sign-in on a domain with no stored key) | The registration-only state forwards `get()` to the browser, so the native flow applies and the user is never given an unknown credential (§7.5). |
| **Loss of passkeys on a new/restored device** (no re-derivation path) | Default "Back up PassKeys" off is warned about in `BackupOptions`; opting in carries the encrypted key in backups so a restore is possible. |
| **Old extension version reading a key-bearing backup** | Intended divergence, same as the TOTP format: `preParseBackup` rejects it, which is the correct signal that the older version cannot handle passkey data. |
| Sites that feature-detect / snapshot `navigator.credentials` or use `instanceof PublicKeyCredential` | Documented gap; wrapped instances are plain objects. Detectability is inherent to the shim approach (same for 1Password/Bitwarden). Per-domain arming limits reach to opted-in domains. |
| **Future spec makes `navigator.credentials` immutable** (WebAppSec cm#63/#220 proposals, surfaced 2025) | The crypto layer (`src/lib/passkey.ts`) is delivery-agnostic — if intercepting dies, the same stored-key model plugs into the L4 hooks API or a native path. Watchlist, not a blocker. |
| WebAuthn L4 ships *proper* extension hooks (webextensions#361) eventually | Same mitigation: swapping the delivery layer is contained to `mainworld.ts` + handlers. |
| Some RPs require `direct`/`enterprise` attestation or verify AAGUIDs | Forward those; many RPs accept `none` (the WebAuthn default), as linux-passkey-manager demonstrates. |
| Always-injected main-world script (even when idle) is page-visible | Script idles unarmed when disabled; contains nothing sensitive; per-frame arming keeps patched pages limited to opted-in domains. |
| Firefox < 128 (no `world: MAIN`) | Out of scope; extension otherwise unchanged. |
| One-passkey-per-domain limit | Documented; a future extension could key a small stored index by credential ID to support multiple credentials per domain. |
| Master-password TTL expires mid-flow | Handler returns undefined → page forwarded to native flow, popup nudged to unlock; same degradation model as password/TOTP auto-injection. Stored key remains safe (it is never in plaintext). |

---

## 12. Rollout

1. Land the pure crypto layer (`src/lib/passkey.ts`, `cbor.ts`, `derivation.ts` `derivePasskeyKey` helper) + tests — no behavior change, fully testable in isolation.
2. Land config/backup changes (`passkeyEnabled`, `passkeySecret`, `FLAG_*`, `backupPasskeys`) + tests.
3. Land the delivery layer (`mainworld.ts`, bridge, SW handlers, IPC, manifest/build) behind the per-domain checkbox.
4. Popup UI (single 3-state checkbox incl. the Delete PassKey flow, backup toggle + warning), docs (README.md/AGENTS.md/backup-format section).
5. Manual cross-browser matrix (§9) before enabling the "Experimental" label anywhere user-facing.

**Version floor note:** the feature requires Chrome ≥ 111 / Firefox ≥ 128. Ship as an "Experimental" opt-in; consider a `minimum_chrome_version`/`strict_min_version` note in docs rather than a hard manifest floor (to avoid breaking the non-passkey parts for older browsers).

---

## 13. References

1. Chrome `content_scripts` manifest — `world` key, Chrome 111: https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts — and the chromium-extensions announcement (Chrome 111, `world` in manifest + `chrome.runtime` undefined in main world): https://groups.google.com/a/chromium.org/g/chromium-extensions/c/_zKyp9XvIzY/m/Pra2efOnAgAJ
2. MDN `content_scripts` manifest (`world`, `run_at: document_start`): https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_scripts ; `ExecutionWorld`: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/scripting/ExecutionWorld
3. Firefox 128 MV3 update — MAIN execution world (manifest + scripting), not blocked by strict page CSP: https://blog.mozilla.org/addons/2024/07/10/manifest-v3-updates-landed-in-firefox-128/ ; tracking Bug 1736575: https://bugzilla.mozilla.org/show_bug.cgi?id=1736575
4. Chrome `scripting.executeScript` (`world`, `target.allFrames`): https://developer.chrome.com/docs/extensions/reference/api/scripting ; MV3 content-script CSP/WAR rules: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts ; crbug 40724787 (main world, CSP, WAR): https://issues.chromium.org/issues/40724787
5. Credential Management spec — `CredentialsContainer`, WebIDL attribute/operation characteristics, §8.3 "Browser Extensions": https://w3c.github.io/webappsec-credential-management/
6. WebIDL — operations on interface prototypes writable/configurable: https://webidl.spec.whatwg.org/#js-operations
7. W3C webauthn #1976 — "Provide a way for Web Extensions to hook into browser's Passkey autofill UI": https://github.com/w3c/webauthn/issues/1976 (1Password/Dashlane monkey-patching, stop-gap, L4)
8. Credential Management L1 — `mediation` enum: https://www.w3.org/TR/credential-management-1/
9. W3C WebAuthn Level 3 (Recommendation, 25 Aug 2026) — §16.2 test vectors: https://www.w3.org/TR/webauthn-3/#sctn-test-vectors-16-2
10. W3C WebAuthn L3 — §6.1 authenticatorData: https://www.w3.org/TR/webauthn-3/#sctn-authenticator-data ; §6.5.1.1 COSE key (with hex): https://www.w3.org/TR/webauthn-3/#sctn-cose_credential_public_key ; §8.7 none attestation: https://www.w3.org/TR/webauthn-3/#sctn-none-attestation ; §6.3.3 assertion signing: https://www.w3.org/TR/webauthn-3/#sctn-op-get-assertion
11. RFC 9053 CBOR Object Signing — COSE key (P-256): https://www.rfc-editor.org/rfc/rfc9053 ; RFC 3279 — DER `Ecdsa-Sig-Value`: https://www.rfc-editor.org/rfc/rfc3279
12. MDN Authenticator data / `clientDataJSON`: https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Authenticator_data
13. MDN `SubtleCrypto.importKey` (RAW limitations; EC private needs JWK): https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey
14. MDN `SubtleCrypto.sign` (P1363 `r‖s` vs DER): https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/sign
15. @noble/curves (audited JS EC; `p256`, `getPublicKey`, `sign`, `toDERRawBytes`): https://github.com/paulmillr/noble-curves
16. W3C WebAuthn L3 — resident/discoverable keys: https://www.w3.org/TR/webauthn-3/#sctn-credential-storage-modality ; `residentKey`, `credProps`: https://www.w3.org/TR/webauthn-3/#dom-residentkeyrequirement
17. W3C WebAuthn L3 — user handle: https://www.w3.org/TR/webauthn-3/#user-handle ; Yubico user handle guide: https://developers.yubico.com/WebAuthn/WebAuthn_Developer_Guide/User_Handle.html
18. Backup-format tolerance of unknown flag bits — verified against `src/lib/backupformat.ts` `deserializeConfig` (per-bit tests, no mask rejection) and `src/lib/storage.ts` `preParseBackup` (variable-length honoring of `FLAG_TOTP_SECRET`).

**Watchlist (future evolution):**
- WebExtension hooks for passkey interplay: https://github.com/w3c/webextensions/issues/361
- Possible `navigator.credentials` immutability: https://github.com/w3c/webappsec-credential-management/issues/63 and https://github.com/w3c/webappsec-credential-management/issues/220
- Native WebAuthn from extension pages (Firefox 150 / Chrome 122) — RP-origin allowlisting only: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Use_the_web_authn_api
