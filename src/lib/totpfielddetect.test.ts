import { describe, it, expect, beforeEach } from 'vitest';
import { detectTotpField } from './totpfielddetect';

beforeEach(() => {
    document.body.innerHTML = '';
});

const input = (attrs: Record<string, string> = {}): HTMLInputElement => {
    const el = document.createElement('input');
    el.type = 'text';
    for (const [key, value] of Object.entries(attrs)) {
        el.setAttribute(key, value);
    }
    document.body.appendChild(el);
    return el;
};

const labelledInput = (labelFor: string, text: string, attrs: Record<string, string> = {}): HTMLInputElement => {
    const label = document.createElement('label');
    label.htmlFor = labelFor;
    label.textContent = text;
    document.body.appendChild(label);
    const el = input({ id: labelFor, ...attrs });
    return el;
};

describe('autocomplete signal', () => {
    it('detects the modern one-time-code value', () => {
        expect(detectTotpField(input({ autocomplete: 'one-time-code' }))).toBe('autocomplete');
    });

    it('detects the legacy otp value', () => {
        expect(detectTotpField(input({ autocomplete: 'otp' }))).toBe('autocomplete');
    });

    it('is case-insensitive', () => {
        expect(detectTotpField(input({ autocomplete: 'ONE-TIME-CODE' }))).toBe('autocomplete');
    });

    it('does not treat other autocomplete values as strong', () => {
        expect(detectTotpField(input({ autocomplete: 'off' }))).toBeUndefined();
        expect(detectTotpField(input({ autocomplete: 'one-time' }))).toBeUndefined();
    });
});

describe('word-boundary (short) tokens', () => {
    it.each(['otp', '2fa', 'mfa', 'otc'])('detects "%s" as an id/name/class word', (token) => {
        expect(detectTotpField(input({ id: token }))).toBe('string');
        expect(detectTotpField(input({ name: token }))).toBe('string');
        expect(detectTotpField(input({ class: token }))).toBe('string');
    });

    it('detects separated, camelCase and concatenated forms', () => {
        expect(detectTotpField(input({ name: 'otp_code' }))).toBe('string');
        expect(detectTotpField(input({ id: 'otpInput' }))).toBe('string');
        expect(detectTotpField(input({ id: 'otpinput' }))).toBe('string');
        expect(detectTotpField(input({ id: 'otc1' }))).toBe('string');
        expect(detectTotpField(input({ name: 'twoFactorField' }))).toBe('string');
    });

    it('detects via placeholder', () => {
        expect(detectTotpField(input({ placeholder: 'OTP' }))).toBe('string');
    });

    it('does not match short tokens inside unrelated words', () => {
        expect(detectTotpField(input({ id: 'screenshot' }))).toBeUndefined();
        expect(detectTotpField(input({ id: 'hotcakes' }))).toBeUndefined();
        expect(detectTotpField(input({ name: 'myotpcode1' }))).toBeUndefined();
    });
});

describe('substring (long) tokens', () => {
    it.each([
        'totp',
        'onetimepassword',
        'onetimecode',
        'verification',
        'verificationcode',
        'authcode',
        'authenticator',
        'passcode',
        'twofactor',
        '2step'
    ])('detects "%s" variations', (token) => {
        expect(detectTotpField(input({ id: token }))).toBe('string');
    });

    it('handles camelCase, separators and surrounding context', () => {
        expect(detectTotpField(input({ id: 'verificationCode' }))).toBe('string');
        expect(detectTotpField(input({ name: 'verification_code' }))).toBe('string');
        expect(detectTotpField(input({ id: 'twofactorcode_entry' }))).toBe('string');
        expect(detectTotpField(input({ name: 'auth_code' }))).toBe('string');
        expect(detectTotpField(input({ placeholder: 'One-time password' }))).toBe('string');
    });
});

describe('label-based detection', () => {
    it('detects an associated label with a TOTP-ish text', () => {
        expect(detectTotpField(labelledInput('otp', 'Verification code'))).toBe('string');
    });

    it('detects a wrapping label', () => {
        const label = document.createElement('label');
        label.textContent = 'Two-factor code';
        const el = document.createElement('input');
        el.type = 'text';
        label.appendChild(el);
        document.body.appendChild(label);
        expect(detectTotpField(el)).toBe('string');
    });
});

describe('negatives', () => {
    it('ignores generic and unrelated fields', () => {
        expect(detectTotpField(input({ id: 'code' }))).toBeUndefined();
        expect(detectTotpField(input({ id: 'postal' }))).toBeUndefined();
        expect(detectTotpField(input({ id: 'securityCode' }))).toBeUndefined();
        expect(detectTotpField(input({ id: 'cvv' }))).toBeUndefined();
        expect(detectTotpField(input({ id: 'pin' }))).toBeUndefined();
        expect(detectTotpField(input({ id: 'token' }))).toBeUndefined();
        expect(detectTotpField(input({ id: 'email' }))).toBeUndefined();
        expect(detectTotpField(input({ id: 'phone' }))).toBeUndefined();
        expect(detectTotpField(input({ id: 'search' }))).toBeUndefined();
    });

    it('explicitly ignores sms-related fields', () => {
        expect(detectTotpField(input({ id: 'sms' }))).toBeUndefined();
        expect(detectTotpField(input({ id: 'smscode' }))).toBeUndefined();
        expect(detectTotpField(input({ name: 'sms_code' }))).toBeUndefined();
        expect(detectTotpField(input({ placeholder: 'SMS code' }))).toBeUndefined();
    });

    it('ignores non-text field types', () => {
        const el = document.createElement('input');
        el.type = 'password';
        el.id = 'otp';
        document.body.appendChild(el);
        expect(detectTotpField(el)).toBeUndefined();

        const ta = document.createElement('textarea');
        ta.id = 'otp';
        document.body.appendChild(ta);
        expect(detectTotpField(ta)).toBeUndefined();
    });

    it('ignores non-editable and null elements', () => {
        expect(detectTotpField(null)).toBeUndefined();
        const div = document.createElement('div');
        document.body.appendChild(div);
        expect(detectTotpField(div)).toBeUndefined();
    });
});
