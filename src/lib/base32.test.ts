import { describe, it, expect } from 'vitest';
import { decodeBase32, isBase32 } from './base32';

const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);

describe('decodeBase32', () => {
    const cases: Array<[string, Uint8Array]> = [
        ['JBSWY3DPEHPK3PXP', new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x21, 0xde, 0xad, 0xbe, 0xef])],
        ['MY', new Uint8Array([0x66])],
        ['JBSWY3DP', new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f])],
        ['JBSWY3DPEHPK3PXP', new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x21, 0xde, 0xad, 0xbe, 0xef])],
        ['GEZDGNBVGY3TQOJQ', utf8('1234567890')],
        ['ORSXG5A=', utf8('test')],
        ['ORSXG5A', utf8('test')],
        ['OBQXG43XN5ZGI', utf8('password')],
    ];

    for (const [input, expected] of cases) {
        it(`decodes '${input}'`, () => {
            const result = decodeBase32(input);
            expect(Array.from(result)).toEqual(Array.from(expected));
        });
    }

    it('is case-insensitive', () => {
        expect(Array.from(decodeBase32('jbswy3dp'))).toEqual(Array.from(decodeBase32('JBSWY3DP')));
    });

    it('strips whitespace', () => {
        expect(Array.from(decodeBase32('JBSW Y3DP'))).toEqual(Array.from(decodeBase32('JBSWY3DP')));
    });

    it('strips padding', () => {
        expect(Array.from(decodeBase32('JBSWY3DP===='))).toEqual(Array.from(decodeBase32('JBSWY3DP')));
    });

    it('returns empty on empty input', () => {
        expect(decodeBase32('')).toEqual(new Uint8Array());
        expect(decodeBase32('===')).toEqual(new Uint8Array());
    });

    it('throws on invalid characters', () => {
        expect(() => decodeBase32('JBSWY3DP!')).toThrow('Invalid base32 character');
        expect(() => decodeBase32('0')).toThrow('Invalid base32 character');
        expect(() => decodeBase32('1')).toThrow('Invalid base32 character');
        expect(() => decodeBase32('8')).toThrow('Invalid base32 character');
        expect(() => decodeBase32('ä')).toThrow('Invalid base32 character');
    });
});

describe('isBase32', () => {
    it('accepts valid base32 with padding and whitespace', () => {
        expect(isBase32('JBSWY3DPEHPK3PXP')).toBe(true);
        expect(isBase32('jbswy3dp')).toBe(true);
        expect(isBase32('ORSXG5A=')).toBe(true);
        expect(isBase32('ORSX G5A=')).toBe(true);
    });

    it('rejects invalid base32', () => {
        expect(isBase32('!')).toBe(false);
        expect(isBase32('0189')).toBe(false);
        expect(isBase32('äöü')).toBe(false);
    });
});
