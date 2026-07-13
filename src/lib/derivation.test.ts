import { describe, it, expect } from 'vitest';
import { deriveMasterEntropy, derivePassword, getMaxPasswordSizeLegacy, BASIC_MAP, EXTENDED_MAP, MAX_PASSWORD_SIZE_MODERN } from './derivation';

const MASTER_PASSWORD = 'test-master-password';
const DOMAIN = 'example.com';

const entropyPromise = deriveMasterEntropy(MASTER_PASSWORD);

describe('shared derivation behavior', () => {
    const variants = [
        { label: 'modern', legacy: false },
        { label: 'legacy', legacy: true },
    ];

    for (const v of variants) {
        describe(v.label, () => {
            it('is deterministic across repeated calls', async () => {
                const entropy = await entropyPromise;
                const pw1 = await derivePassword(entropy, DOMAIN, 16, 1, true, false, v.legacy);
                const pw2 = await derivePassword(entropy, DOMAIN, 16, 1, true, false, v.legacy);
                expect(pw1).toBe(pw2);
            });

            for (const size of [10, 16]) {
                it(`produces exact length ${size}`, async () => {
                    const entropy = await entropyPromise;
                    const pw = await derivePassword(entropy, DOMAIN, size, 1, true, false, v.legacy);
                    expect(pw.length).toBe(size);
                });
            }

            it('all chars within EXTENDED_MAP when special chars enabled', async () => {
                const entropy = await entropyPromise;
                const pw = await derivePassword(entropy, DOMAIN, 16, 1, true, false, v.legacy);
                for (const c of pw) {
                    expect(EXTENDED_MAP).toContain(c);
                }
            });

            it('all chars within BASIC_MAP when special chars disabled', async () => {
                const entropy = await entropyPromise;
                const pw = await derivePassword(entropy, DOMAIN, 16, 1, false, false, v.legacy);
                for (const c of pw) {
                    expect(BASIC_MAP).toContain(c);
                }
            });

            it('different iterations produce different passwords', async () => {
                const entropy = await entropyPromise;
                const pw1 = await derivePassword(entropy, DOMAIN, 16, 1, true, false, v.legacy);
                const pw2 = await derivePassword(entropy, DOMAIN, 16, 2, true, false, v.legacy);
                expect(pw1).not.toBe(pw2);
            });

            it('different domains produce different passwords', async () => {
                const entropy = await entropyPromise;
                const pw1 = await derivePassword(entropy, DOMAIN, 16, 1, true, false, v.legacy);
                const pw2 = await derivePassword(entropy, 'other.com', 16, 1, true, false, v.legacy);
                expect(pw1).not.toBe(pw2);
            });
        });
    }
});

describe('modern derivation', () => {
    it('golden value: special chars, length 32', async () => {
        const entropy = await entropyPromise;
        const pw = await derivePassword(entropy, DOMAIN, 32, 1, true, false, false);
        expect(pw).toBe('w*5?\\$KDezil>c~#\\8wLcZV:1n3*KDre');
    });

    it('golden value: basic chars, length 16', async () => {
        const entropy = await entropyPromise;
        const pw = await derivePassword(entropy, DOMAIN, 16, 1, false, false, false);
        expect(pw).toBe('Uzd3AfoFIbCjzmDG');
    });

    for (const size of [10, 16, 32, 64]) {
        it(`produces exact length ${size}`, async () => {
            const entropy = await entropyPromise;
            const pw = await derivePassword(entropy, DOMAIN, size, 1, true, false, false);
            expect(pw.length).toBe(size);
        });
    }

    it('all chars within EXTENDED_MAP when special chars enabled (length 64)', async () => {
        const entropy = await entropyPromise;
        const pw = await derivePassword(entropy, DOMAIN, 64, 1, true, false, false);
        for (const c of pw) {
            expect(EXTENDED_MAP).toContain(c);
        }
    });

    it('all chars within BASIC_MAP when special chars disabled (length 64)', async () => {
        const entropy = await entropyPromise;
        const pw = await derivePassword(entropy, DOMAIN, 64, 1, false, false, false);
        for (const c of pw) {
            expect(BASIC_MAP).toContain(c);
        }
    });

    it('ignores allowExtraLongPasswords flag', async () => {
        const entropy = await entropyPromise;
        const pw1 = await derivePassword(entropy, DOMAIN, 32, 1, true, false, false);
        const pw2 = await derivePassword(entropy, DOMAIN, 32, 1, true, true, false);
        expect(pw1).toBe(pw2);
    });

    it('exposes MAX_MODERN_PASSWORD_SIZE as 64', () => {
        expect(MAX_PASSWORD_SIZE_MODERN).toBe(64);
    });

    describe.each([
        { map: BASIC_MAP, label: 'basic' },
        { map: EXTENDED_MAP, label: 'extended' },
    ])('char distribution ($label, modern)', ({ map }) => {
        it('is approximately uniform (bias sanity)', async () => {
            const entropy = await entropyPromise;
            const N = map.length;
            const counts = new Array(N).fill(0);
            const iterations = 5000;
            const useSpecial = map === EXTENDED_MAP;

            for (let i = 1; i <= iterations; i++) {
                const pw = await derivePassword(entropy, DOMAIN, 32, i, useSpecial, false, false);
                for (const c of pw) {
                    counts[map.indexOf(c)]++;
                }
            }

            const total = iterations * 32;
            const expected = total / N;
            const maxDeviation = Math.max(...counts.map(c => Math.abs(c - expected))) / expected;
            expect(maxDeviation).toBeLessThan(0.15);
        });
    });
});

describe('legacy derivation', () => {
    const cases = [
        { special: false, extraLong: false, length: 16, golden: '6BoqrxjcTNoCoftn' },
        { special: true, extraLong: false, length: 16, golden: "Enit9'^WscWZnB?u" },
        { special: false, extraLong: true, length: 40, golden: '6BoqrexjcTNaoCoftenLeBsbw00YNcSAIGHaB13S' },
        { special: true, extraLong: true, length: 40, golden: "EnitY9'^WhscWZYnB?up6YMaFe4NGg\"fC.I?=hdO" },
    ];

    for (const c of cases) {
        const label = `special=${c.special} extraLong=${c.extraLong} len=${c.length}`;
        it(label, async () => {
            const entropy = await entropyPromise;
            const pw = await derivePassword(entropy, DOMAIN, c.length, 1, c.special, c.extraLong, true);
            expect(pw).toBe(c.golden);
        });
    }

    it('getMaxPasswordSize values', () => {
        expect(getMaxPasswordSizeLegacy(false, false)).toBe(40);
        expect(getMaxPasswordSizeLegacy(true, false)).toBe(32);
        expect(getMaxPasswordSizeLegacy(false, true)).toBe(48);
        expect(getMaxPasswordSizeLegacy(true, true)).toBe(40);
    });

    describe.each([
        { map: BASIC_MAP, label: 'basic' },
        { map: EXTENDED_MAP, label: 'extended' },
    ])('char distribution ($label, legacy)', ({ map }) => {
        it('stays within reasonable deviation (legacy has inherent modulo bias)', async () => {
            const entropy = await entropyPromise;
            const N = map.length;
            const counts = new Array(N).fill(0);
            const iterations = 5000;
            const useSpecial = map === EXTENDED_MAP;

            for (let i = 1; i <= iterations; i++) {
                const pw = await derivePassword(entropy, DOMAIN, 16, i, useSpecial, false, true);
                for (const c of pw) {
                    counts[map.indexOf(c)]++;
                }
            }

            const total = iterations * 16;
            const expected = total / N;
            const maxDeviation = Math.max(...counts.map(c => Math.abs(c - expected))) / expected;
            expect(maxDeviation).toBeLessThan(0.25);
        });
    });
});
