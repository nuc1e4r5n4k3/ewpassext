import { describe, it, expect } from 'vitest';
import { deriveMasterEntropy } from './derivation';
import { encryptTotpSecret, decryptTotpSecret, generateTotp, parseTotpConfiguratonString, TOTP_DEFAULT_SETTINGS } from './totp';
import { hexToBuffer } from './hexutils';

const MASTER_PASSWORD = 'test-master-password';
const DOMAIN = 'example.com';
const entropyPromise = deriveMasterEntropy(MASTER_PASSWORD);

const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);

describe('generateTotp (RFC 6238 Appendix B)', () => {
    const secret = utf8('12345678901234567890');    // 20 bytes ASCII per RFC

    const cases = [
        { time: 59, expected: '94287082' },
        { time: 1111111109, expected: '07081804' },
        { time: 1111111111, expected: '14050471' },
        { time: 1234567890, expected: '89005924' },
        { time: 2000000000, expected: '69279037' },
        { time: 20000000000, expected: '65353130' },
    ];

    let settings = { ...TOTP_DEFAULT_SETTINGS };
    settings.digits = 8;

    for (const c of cases) {
        it(`t=${c.time} -> ${c.expected}`, async () => {
            const code = await generateTotp(secret, c.time, settings);
            expect(code).toBe(c.expected);
        });
    }

    it('produces 6 digits, zero-padded', async () => {
        const code = await generateTotp(secret, 59);
        expect(code.length).toBe(6);
        expect(code).toMatch(/^\d{6}$/);
    });

    it('same code within a 30s period', async () => {
        const a = await generateTotp(secret, 1000);
        const b = await generateTotp(secret, 1019);
        expect(a).toBe(b);
    });

    it('different code across period boundary', async () => {
        const a = await generateTotp(secret, 29);
        const b = await generateTotp(secret, 30);
        expect(a).not.toBe(b);
    });
});

describe('deriveTotpKey (via encrypt/decrypt)', () => {
    it('decrypt(encrypt(x)) === x', async () => {
        const entropy = await entropyPromise;
        for (const size of [10, 20]) {
            const raw = new Uint8Array(size);
            for (let i = 0; i < size; i++) raw[i] = (i * 7 + 3) & 0xff;
            const cipher = await encryptTotpSecret(raw, DOMAIN, entropy);
            const recovered = await decryptTotpSecret(cipher, DOMAIN, entropy);
            expect(Array.from(recovered)).toEqual(Array.from(raw));
        }
    });

    it('encrypt is deterministic', async () => {
        const entropy = await entropyPromise;
        const raw = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
        const a = await encryptTotpSecret(raw, DOMAIN, entropy);
        const b = await encryptTotpSecret(raw, DOMAIN, entropy);
        expect(a).toBe(b);
    });

    it('different domains produce different ciphertext', async () => {
        const entropy = await entropyPromise;
        const raw = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
        const a = await encryptTotpSecret(raw, DOMAIN, entropy);
        const b = await encryptTotpSecret(raw, 'other.com', entropy);
        expect(a).not.toBe(b);
    });

    it('different master passwords produce different keys', async () => {
        const entropy1 = await entropyPromise;
        const entropy2 = await deriveMasterEntropy('different-master');
        const raw = new Uint8Array([0xaa, 0xbb, 0xcc]);
        const a = await encryptTotpSecret(raw, DOMAIN, entropy1);
        const b = await encryptTotpSecret(raw, DOMAIN, entropy2);
        expect(a).not.toBe(b);
    });

    it('ciphertext length matches input length', async () => {
        const entropy = await entropyPromise;
        const raw = new Uint8Array(20);
        const cipher = await encryptTotpSecret(raw, DOMAIN, entropy);
        expect(cipher.length).toBe(40); // hex
        expect(new Uint8Array(hexToBuffer(cipher)).length).toBe(20);
    });

    it('decrypt is symmetric: decrypt(c, k) where c = encrypt under same (entropy,domain)', async () => {
        const entropy = await entropyPromise;
        const raw = utf8('12345678901234567890');
        const cipher = await encryptTotpSecret(raw, DOMAIN, entropy);
        const recovered = await decryptTotpSecret(cipher, DOMAIN, entropy);
        expect(Array.from(recovered)).toEqual(Array.from(raw));
    });
});

describe('parseTotpConfiguratonString', () => {
    it('accepts a bare base32 secret', () => {
        const result = parseTotpConfiguratonString('JBSWY3DPEHPK3PXP');
        expect(Array.from(result)).toEqual([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x21, 0xde, 0xad, 0xbe, 0xef]);
    });

    it('is case-insensitive for bare base32', () => {
        expect(Array.from(parseTotpConfiguratonString('jbswy3dp'))).toEqual(Array.from(parseTotpConfiguratonString('JBSWY3DP')));
    });

    it('strips whitespace from bare base32', () => {
        expect(Array.from(parseTotpConfiguratonString('JBSW Y3DP'))).toEqual(Array.from(parseTotpConfiguratonString('JBSWY3DP')));
    });

    it('accepts an otpauth:// URL with default params', () => {
        const result = parseTotpConfiguratonString('otpauth://totp/example.com?secret=JBSWY3DPEHPK3PXP');
        expect(Array.from(result)).toEqual([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x21, 0xde, 0xad, 0xbe, 0xef]);
    });

    it('accepts an otpauth:// URL with matching digits/period/algorithm', () => {
        const result = parseTotpConfiguratonString('otpauth://totp/example.com?secret=JBSWY3DP&digits=6&period=30&algorithm=SHA1');
        expect(Array.from(result)).toEqual(Array.from(parseTotpConfiguratonString('JBSWY3DP')));
    });

    it('is case-insensitive for otpauth:// prefix', () => {
        const result = parseTotpConfiguratonString('OTPAUTH://totp/x?secret=JBSWY3DP');
        expect(Array.from(result)).toEqual(Array.from(parseTotpConfiguratonString('JBSWY3DP')));
    });

    it('throws on empty input', () => {
        expect(() => parseTotpConfiguratonString('')).toThrow('Empty TOTP input');
        expect(() => parseTotpConfiguratonString('   ')).toThrow('Empty TOTP input');
    });

    it('throws on invalid base32 in bare input', () => {
        expect(() => parseTotpConfiguratonString('!@#$')).toThrow('Invalid base32');
        expect(() => parseTotpConfiguratonString('0')).toThrow('Invalid base32');
    });

    it('throws on malformed otpauth:// URL', () => {
        expect(() => parseTotpConfiguratonString('otpauth://totp')).toThrow('otpauth:// URL missing secret');
        expect(() => parseTotpConfiguratonString('otpauth://totp/x?secret=')).toThrow('otpauth:// URL missing secret');
    });

    it('throws on non-totp otpauth type', () => {
        expect(() => parseTotpConfiguratonString('otpauth://hotp/x?secret=JBSWY3DP')).toThrow('Unsupported otpauth type');
    });

    it('rejects non-default digits', () => {
        expect(() => parseTotpConfiguratonString('otpauth://totp/x?secret=JBSWY3DP&digits=8')).toThrow('Unsupported TOTP digits');
    });

    it('rejects non-default period', () => {
        expect(() => parseTotpConfiguratonString('otpauth://totp/x?secret=JBSWY3DP&period=60')).toThrow('Unsupported TOTP period');
    });

    it('rejects non-default algorithm', () => {
        expect(() => parseTotpConfiguratonString('otpauth://totp/x?secret=JBSWY3DP&algorithm=SHA256')).toThrow('Unsupported TOTP algorithm');
    });

    it('rejects invalid base32 in otpauth secret', () => {
        expect(() => parseTotpConfiguratonString('otpauth://totp/x?secret=!@#$')).toThrow('Invalid base32');
    });
});
