import { describe, it, expect } from 'vitest';
import { deriveMasterEntropy } from './derivation';
import { encryptTotpSecret, decryptTotpSecret, generateTotp, TOTP_DEFAULT_SETTINGS } from './totp';
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
