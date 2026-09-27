import { isEditableTarget } from './inputfieldtypes';

/*
 *  Detection of TOTP / MFA code input fields.
 *
 *  Deliberately conservative: we only want to fire when we are reasonably sure
 *  the focused field expects an authenticator-style one-time code. SMS codes
 *  are a different beast (the code arrives on your phone, the extension cannot
 *  reproduce it), so anything 'sms'-related is explicitly NOT detected.
 */

export type TotpSignal = 'autocomplete' | 'string';

/*
 *  Short tokens are matched against whole word tokens (the token must start
 *  with the pattern, e.g. `otp_input`, `otpInput`, `otpinput`, `otc1`), so
 *  `otc` will not match inside unrelated words like `screenshot`.
 *
 *  Longer tokens are distinctive enough that a plain substring match on the
 *  normalized (lowercased, alphanumeric-only) string is safe.
 */
const SHORT_WORD_TOKENS = ['otp', 'totp', 'otc', '2fa', 'mfa'];
const LONG_SUBSTRING_TOKENS = [
    'onetimepassword',
    'onetimecode',
    'verification',
    'verificationcode',
    'authcode',
    'authenticator',
    'passcode',
    'twofactor',
    '2step'
];

/* Split camelCase boundaries, lower-case, then split into word tokens. */
const tokenize = (value: string): string[] =>
    value
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(token => token.length > 0);

const normalize = (value: string): string =>
    value.toLowerCase().replace(/[^a-z0-9]/g, '');

const candidateStrings = (element: HTMLInputElement): string[] => {
    const labels = Array.from(element.labels ?? [], label => label.textContent);

    const wrappingLabel = element.closest('label')?.textContent;
    if (wrappingLabel) {
        labels.push(wrappingLabel);
    }

    return [
        element.id,
        element.name,
        element.className,
        element.placeholder,
        element.getAttribute('aria-label')
    ].concat(labels).filter((value): value is string => !!value && value.trim().length > 0);
};

export const detectTotpField = (element: Element | null): TotpSignal | undefined => {
    if (!isEditableTarget(element) || !(element instanceof HTMLInputElement)) {
        return undefined;
    }

    /* The strongest signal: the field explicitly declares itself. */
    const autocomplete = normalize(element.getAttribute('autocomplete') ?? '');
    if (autocomplete === 'onetimecode' || autocomplete === 'otp') {
        return 'autocomplete';
    }

    for (const candidate of candidateStrings(element)) {
        const tokens = tokenize(candidate);
        if (tokens.some(token => SHORT_WORD_TOKENS.some(signal => token === signal || token.startsWith(signal)))) {
            return 'string';
        }

        const normalized = normalize(candidate);
        if (LONG_SUBSTRING_TOKENS.some(signal => normalized.includes(signal))) {
            return 'string';
        }
    }

    return undefined;
};
