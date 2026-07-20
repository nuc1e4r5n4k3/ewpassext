import { describe, expect, it } from "vitest";
import { getParentDomains, splitOnTld } from "./domain";

describe('splitOnTld', () => {
    it('does not affect a bare gTLD', () => {
        expect(splitOnTld('com')).toStrictEqual(['com', undefined]);
    });

    it('splits on a domain ending in a gTLD', () => {
        expect(splitOnTld('google.com')).toStrictEqual(['google', 'com']);
        expect(splitOnTld('example.org')).toStrictEqual(['example', 'org']);
    });

    it('splits on a 2-level ccTLD suffix', () => {
        expect(splitOnTld('bbc.co.uk')).toStrictEqual(['bbc', 'co.uk']);
        expect(splitOnTld('example.co.jp')).toStrictEqual(['example', 'co.jp']);
    });

    it('does not split a random suffix substring', () => {
        expect(splitOnTld('sycom')).toStrictEqual(['sycom', undefined]);
        expect(splitOnTld('foo.bardcom')).toStrictEqual(['foo.bardcom', undefined]);
    });

    it('prefers longest suffix (.co.uk wins over .uk)', () => {
        expect(splitOnTld('foo.uk')).toStrictEqual(['foo', 'uk']);
        expect(splitOnTld('foo.co.uk')).toStrictEqual(['foo', 'co.uk']);
    });

    it('does not affect an empty input', () => {
        expect(splitOnTld('')).toStrictEqual(['', undefined]);
    });

    it('is case-insensitive', () => {
        expect(splitOnTld('GOOGLE.COM')).toStrictEqual(['GOOGLE', 'COM']);
        expect(splitOnTld('BBC.CO.UK')).toStrictEqual(['BBC', 'CO.UK']);
    });
});

describe('getParentDomains', () => {
    it('returns the parent domain for a subdomain', () => {
        expect(getParentDomains('sub.example.org')).toStrictEqual([
            'example.org'
        ]);
    });

    it('ignores ccTLD sub-TLDs', () => {
        expect(getParentDomains('iplayer.bbc.co.uk')).toStrictEqual([
            'bbc.co.uk'
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
