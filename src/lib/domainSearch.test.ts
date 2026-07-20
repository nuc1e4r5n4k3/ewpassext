import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SUBDOMAIN_PREFIXES, generateAuthenticationDomainCandidates, findDomainSuggestion } from './domainSearch';
import { deriveMasterEntropy, DomainIds, getDomainIds } from './derivation';
import { load, store, type Configuration, type IDomainConfig } from './storage';

describe('generateAuthenticationDomainCandidates', () => {
    it('returns empty list for empty input', () => {
        expect(generateAuthenticationDomainCandidates('')).toEqual([]);
    });

    it('places bare input first so exact matches short-circuit', () => {
        const candidates = generateAuthenticationDomainCandidates('google');
        expect(candidates[0]).toBe('google');
        expect(candidates.length).toBeGreaterThan(1);
    });

    it('when input ends in a TLD, does not append TLDs but tries subdomain prefixes', () => {
        const candidates = generateAuthenticationDomainCandidates('google.com');

        expect(candidates.some(c => c.endsWith('.com.com'))).toBe(false);

        expect(candidates).toContain('login.google.com');
        expect(candidates).toContain('accounts.google.com');
    });

    it('when input does not end in a TLD, appends every PUBLIC_SUFFIX to every prefix', () => {
        const candidates = generateAuthenticationDomainCandidates('google');

        // login.google.com for the bare prefix + com suffix.
        expect(candidates).toContain('login.google.com');
        expect(candidates).toContain('accounts.google.co.uk');

        // Bare prefix with each suffix: e.g. "google.com", "google.org".
        expect(candidates).toContain('google.com');
        expect(candidates).toContain('google.org');
        expect(candidates).toContain('google.co.uk');
    });

    it('does not duplicate candidates', () => {
        const candidates = generateAuthenticationDomainCandidates('google');
        const unique = new Set(candidates);
        expect(candidates.length).toBe(unique.size);
    });

    it('every non-bare candidate is well-formed (contains a dot when input has none)', () => {
        const candidates = generateAuthenticationDomainCandidates('google');
        for (const c of candidates) {
            if (c === 'google')
                continue;
            expect(c).toContain('.');
        }
    });

    it('uses every subdomain prefix', () => {
        const candidates = generateAuthenticationDomainCandidates('example.com');
        const nonBare = SUBDOMAIN_PREFIXES.filter(p => p !== '');
        for (const prefix of nonBare) {
            expect(candidates).toContain(prefix + 'example.com');
        }
    });

    it('is case insensitive', () => {
        const a = generateAuthenticationDomainCandidates('Google.COM');
        const b = generateAuthenticationDomainCandidates('google.com');
        expect(a).toEqual(b);
    });

    it('2-level suffix is detected even when 1-level parent also exists', () => {
        const candidates = generateAuthenticationDomainCandidates('foo.co.uk');

        expect(candidates[0]).toBe('foo.co.uk');
        expect(candidates).toContain('login.foo.co.uk');

        expect(candidates.some(c => c.endsWith('.co.uk.co.uk'))).toBe(false);
        expect(candidates.some(c => c.endsWith('.co.uk.com'))).toBe(false);
    });
});

//
// Integration: full library code path — derive real entropy, store configs
// under their HKDF-derived domain IDs in storage, load them back, and verify
// that a partial user input expands to the configured domain.
//

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

const baseConfig = (overrides: Partial<IDomainConfig> = {}): IDomainConfig => ({
    passwordLength: 16,
    passwordIteration: 1,
    useSpecialCharacters: true,
    allowExtraLongPasswords: false,
    ...overrides,
});

const MASTER_PASSWORD = 'test-master-password';
const entropyPromise = deriveMasterEntropy(MASTER_PASSWORD);

const setupConfiguration = async (domains: string[], legacy?: boolean) => {
    const entropy = await entropyPromise;
    const configs: [string, IDomainConfig][] = [];

    for (const domain of domains) {
        const ids = await getDomainIds(entropy, domain);
        configs.push([legacy ? ids.legacyId : ids.id, baseConfig()]);
    }

    await store('metadata', Object.fromEntries(configs));
    return entropy;
};

beforeEach(() => {
    for (const k of Object.keys(memory)) delete memory[k];
});

describe('findDomainSuggestion (full library path)', () => {
    it('expands a bare partial to a configured subdomain (modern id)', async () => {
        const entropy = await setupConfiguration(['accounts.google.com']);

        const loaded = (await load<Configuration>('metadata')) || {};
        const hit = await findDomainSuggestion(entropy, loaded, 'google');
        expect(hit).toBe('accounts.google.com');
    });

    it('returns the exact domain when the user typed it (modern id)', async () => {
        const entropy = await setupConfiguration(['login.example.com']);

        const loaded = (await load<Configuration>('metadata')) || {};
        const hit = await findDomainSuggestion(entropy, loaded, 'login.example.com');
        expect(hit).toBe('login.example.com');
    });

    it('matches via legacy id when only the legacy id is stored', async () => {
        const entropy = await setupConfiguration(['mail.foo.co.uk'], true);

        const loaded = (await load<Configuration>('metadata')) || {};
        const hit = await findDomainSuggestion(entropy, loaded, 'foo');
        expect(hit).toBe('mail.foo.co.uk');
    });

    it('returns undefined when no candidate has a stored config', async () => {
        const entropy = await setupConfiguration([]);

        const loaded = (await load<Configuration>('metadata')) || {};
        const hit = await findDomainSuggestion(entropy, loaded, 'google');
        expect(hit).toBeUndefined();
    });

    it('returns undefined for empty input', async () => {
        const entropy = await setupConfiguration(['accounts.google.com']);

        const loaded = (await load<Configuration>('metadata')) || {};
        const hit = await findDomainSuggestion(entropy, loaded, '');
        expect(hit).toBeUndefined();
    });

    it('prefers the bare input when it itself has a config', async () => {
        const entropy = await setupConfiguration(['accounts.google.com', 'google.com']);

        const loaded = (await load<Configuration>('metadata')) || {};
        const hit = await findDomainSuggestion(entropy, loaded, 'google.com');
        expect(hit).toBe('google.com');
    });
});
