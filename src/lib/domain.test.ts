import { describe, expect, it } from "vitest";
import { getParentDomains } from "./domain";


describe('getParentDomains', () => {
    it('returns the parent domain for a subdomain', () => {
        expect(getParentDomains('sub.example.org')).toStrictEqual([
            'example.org'
        ]);
    });

    it('returns the parent domain for short domains (that can be confused with ccTLDs)', () => {
        expect(getParentDomains('www.ns.nl')).toStrictEqual([
            'ns.nl'
        ]);
    });

    it('returns all parents until the TLD', () => {
        expect(getParentDomains('some.very.nested.subdomain.string.net')).toStrictEqual([
            'very.nested.subdomain.string.net',
            'nested.subdomain.string.net',
            'subdomain.string.net',
            'string.net'
        ]);
    });

    it('can handle unknown TLDs', () => {
        expect(getParentDomains('sub.domain.amsterdam')).toStrictEqual([
            'domain.amsterdam'
        ]);
    });
});
