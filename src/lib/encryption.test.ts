import { describe, it, expect } from 'vitest';
import { xorBytes } from './encryption';

const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);

describe('xorBytes', () => {
    it('returns zeros for x ^ x', () => {
        const a = utf8('hello');
        const out = xorBytes(a, a);
        expect(Array.from(out)).toEqual([0, 0, 0, 0, 0]);
    });

    it('round-trips: (a ^ k) ^ k === a', () => {
        const a = utf8('secret!');
        const k = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde]);
        expect(Array.from(xorBytes(xorBytes(a, k), k))).toEqual(Array.from(a));
    });

    it('throws on length mismatch', () => {
        expect(() => xorBytes(new Uint8Array(3), new Uint8Array(4))).toThrow();
    });
});
