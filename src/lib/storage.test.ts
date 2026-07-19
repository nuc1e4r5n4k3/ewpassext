import { describe, it, expect, beforeEach, vi } from 'vitest';

const memory: { [k: string]: any } = {};

vi.mock('./browsercompat', () => ({
    storage: {
        local: {
            get: async (name: string) => ({ [name]: memory[name] }),
            set: async (obj: { [k: string]: any }) => { Object.assign(memory, obj); },
            remove: async (name: string) => { delete memory[name]; },
        },
        session: {
            get: async (name: string) => ({ [name]: memory[name] }),
            set: async (obj: { [k: string]: any }) => { Object.assign(memory, obj); },
            remove: async (name: string) => { delete memory[name]; },
        },
    },
}));

import { preParseBackup, importBackup, serializeAll } from './storage';
import { store, load, type Configuration, type IDomainConfig } from './storage';

const baseConfig = (overrides: Partial<IDomainConfig> = {}): IDomainConfig => ({
    passwordLength: 16,
    passwordIteration: 1,
    useSpecialCharacters: true,
    allowExtraLongPasswords: false,
    ...overrides,
});

const setMetadata = async (configs: Configuration) => {
    await store('metadata', configs);
};

const loadMetadata = async (): Promise<Configuration> => (await load<Configuration>('metadata')) || {};

beforeEach(() => {
    for (const k of Object.keys(memory)) delete memory[k];
});

describe('preParseBackup', () => {
    it('returns count for legacy fixed-length backups', () => {
        const record = '01020304050601';    // 14 hex chars, flags=0x01 (no TOTP bit)
        expect(preParseBackup(record)).toBe(1);
        expect(preParseBackup(record.repeat(3))).toBe(3);
    });

    it('returns undefined for malformed input', () => {
        expect(preParseBackup('')).toBeUndefined();
        expect(preParseBackup('0102030405060')).toBeUndefined();        // too short
        expect(preParseBackup('zz02030405060708')).toBeUndefined();     // non-hex
        expect(preParseBackup('01020304050607xx')).toBeUndefined();     // non-hex tail
    });

    it('returns count for backups with TOTP records', () => {
        // flags = 0x04 => FLAG_TOTP_SECRET, size byte = 0x02, secret = abcd
        const totpRecord = '01020304050604' + '02' + 'abcd';
        expect(preParseBackup(totpRecord)).toBe(1);
    });

    it('returns count for mixed backups (legacy + TOTP)', () => {
        const legacy = '01020304050601';
        const totp = '01020304050604' + '02' + 'abcd';
        expect(preParseBackup(legacy + totp)).toBe(2);
        expect(preParseBackup(totp + legacy + totp)).toBe(3);
    });

    it('rejects TOTP records with truncated secret', () => {
        // size byte = 0x02 (2 bytes expected) but only 1 byte present
        const truncated = '01020304050604' + '02' + 'ab';
        expect(preParseBackup(truncated)).toBeUndefined();
    });

    it('rejects TOTP records with missing size byte', () => {
        // 14 hex chars with FLAG_TOTP_SECRET, but no size byte follows
        expect(preParseBackup('01020304050604')).toBeUndefined();
    });

    it('handles maximum-size TOTP secret (255 bytes)', () => {
        const totpRecord = '01020304050604' + 'ff' + 'ab'.repeat(0xff);
        expect(preParseBackup(totpRecord)).toBe(1);
    });
});

describe('serializeAll + importBackup round-trip', () => {
    it('preserves legacy-format configs byte-for-byte (no TOTP)', async () => {
        const configs: Configuration = {
            '01020304': baseConfig({ passwordLength: 16, passwordIteration: 1, useSpecialCharacters: true, allowExtraLongPasswords: false }),
            '05060708': baseConfig({ passwordLength: 24, passwordIteration: 3, useSpecialCharacters: false, allowExtraLongPasswords: true }),
        };
        await setMetadata(configs);

        const backup = await serializeAll();

        // Legacy format: each record is exactly 14 hex chars, no TOTP section.
        expect(backup.length).toBe(28);
        expect(preParseBackup(backup)).toBe(2);

        await setMetadata({});
        await importBackup(backup, true);
        const restored = await loadMetadata();
        expect(restored).toEqual(configs);
    });

    it('preserves TOTP secrets across round-trip', async () => {
        const configs: Configuration = {
            '01020304': baseConfig({ totpSecret: 'deadbeef' }),
            '05060708': baseConfig({ passwordLength: 24, totpSecret: '00ff' }),
        };
        await setMetadata(configs);

        const backup = await serializeAll();
        expect(preParseBackup(backup)).toBe(2);

        await setMetadata({});
        await importBackup(backup, true);
        const restored = await loadMetadata();
        expect(restored).toEqual(configs);
    });

    it('mixes TOTP and non-TOTP records correctly', async () => {
        const configs: Configuration = {
            '01020304': baseConfig({}),
            '05060708': baseConfig({ totpSecret: 'cafe' }),
            '090a0b0c': baseConfig({ passwordIteration: 5, totpSecret: '010203040506' }),
        };
        await setMetadata(configs);

        const backup = await serializeAll();
        expect(preParseBackup(backup)).toBe(3);

        await setMetadata({});
        await importBackup(backup, true);
        const restored = await loadMetadata();
        expect(restored).toEqual(configs);
    });

    it('backwards compat: legacy 14-hex backups import with totpSecret undefined', async () => {
        //
        // Hand-rolled legacy backup: two records, 14 hex chars each.
        //
        // Record 1: domainId=11223344, length=10, iter=01, flags=01 (special chars only)
        // Record 2: domainId=55667788, length=20, iter=02, flags=03 (special + extra long)
        //
        const legacyBackup = '11223344100101' + '55667788200203';
        expect(preParseBackup(legacyBackup)).toBe(2);

        await importBackup(legacyBackup, true);
        const restored = await loadMetadata();
        expect(restored['11223344']).toEqual({
            passwordLength: 0x10,
            passwordIteration: 0x01,
            useSpecialCharacters: true,
            allowExtraLongPasswords: false,
        });
        expect(restored['11223344'].totpSecret).toBeUndefined();
        expect(restored['55667788'].useSpecialCharacters).toBe(true);
        expect(restored['55667788'].allowExtraLongPasswords).toBe(true);
    });

    it('importBackup merges into existing store when clearExisting=false', async () => {
        await setMetadata({
            '01020304': baseConfig({}),
        });
        const newBackup = '05060708100101';
        await importBackup(newBackup, false);
        const restored = await loadMetadata();
        expect(Object.keys(restored).sort()).toEqual(['01020304', '05060708']);
    });

    it('importBackup throws on invalid backup string', async () => {
        await expect(importBackup('not-valid-hex!!', true)).rejects.toThrow('Invalid configuration backup string');
    });

    it('empty secret is treated as no TOTP (backwards-compatible output)', async () => {
        const configs: Configuration = {
            '01020304': baseConfig({ totpSecret: undefined }),
        };
        await setMetadata(configs);
        const backup = await serializeAll();

        // No TOTP section should be emitted for empty secret -> 14 hex chars only.
        expect(backup.length).toBe(14);
        expect(preParseBackup(backup)).toBe(1);
    });
});

describe('serializeAll error paths', () => {
    it('rejects odd-length TOTP secret hex', async () => {
        await setMetadata({ '01020304': baseConfig({ totpSecret: 'abc' }) });
        await expect(serializeAll()).rejects.toThrow('Invalid TOTP secret');
    });

    it('rejects non-hex TOTP secret', async () => {
        await setMetadata({ '01020304': baseConfig({ totpSecret: 'xy' }) });
        await expect(serializeAll()).rejects.toThrow('Invalid TOTP secret');
    });

    it('rejects TOTP secret longer than 255 bytes', async () => {
        await setMetadata({ '01020304': baseConfig({ totpSecret: 'ab'.repeat(256) }) });
        await expect(serializeAll()).rejects.toThrow('Invalid TOTP secret');
    });
});
