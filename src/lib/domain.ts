//
// PUBLIC_SUFFIXES — classic gTLDs + all two-letter ISO 3166 ccTLDs plus
// common commercial second-level suffixes used under ccTLDs.
//
// The 2-level suffixes appear before their 1-level parents so that
// longest-suffix matching picks .co.uk over .uk, etc.
//
export const PUBLIC_SUFFIXES: string[] = [
    // classic gTLDs
    'com', 'org', 'net', 'int', 'edu', 'gov', 'mil',

    // 2-level ccTLD suffixes (matched longest-first)
    'co.uk', 'org.uk', 'gov.uk', 'ac.uk',
    'co.jp', 'ne.jp', 'or.jp', 'ac.jp',
    'co.in', 'or.id', 'ac.id', 'sch.id', 'web.id',
    'co.kr', 'co.nz', 'co.za', 'co.th', 'co.il',
    'com.au', 'com.br', 'com.cn', 'com.hk', 'com.tw',
    'com.sg', 'com.my', 'com.ph', 'com.vn', 'com.ar',
    'com.mx', 'com.co', 'com.ng', 'com.tr', 'com.pk',
    'com.bd', 'com.eg', 'com.pe',

    // 2-letter ccTLDs (ISO 3166)
    'ac', 'ad', 'ae', 'af', 'ag', 'ai', 'al', 'am', 'ao', 'aq',
    'ar', 'as', 'at', 'au', 'aw', 'ax', 'az', 'ba', 'bb', 'bd',
    'be', 'bf', 'bg', 'bh', 'bi', 'bj', 'bm', 'bn', 'bo', 'bq',
    'br', 'bs', 'bt', 'bv', 'bw', 'by', 'bz', 'ca', 'cc', 'cd',
    'cf', 'cg', 'ch', 'ci', 'ck', 'cl', 'cm', 'cn', 'co', 'cr',
    'cu', 'cv', 'cw', 'cx', 'cy', 'cz', 'de', 'dj', 'dk', 'dm',
    'do', 'dz', 'ec', 'ee', 'eg', 'eh', 'er', 'es', 'et', 'eu',
    'fi', 'fj', 'fk', 'fm', 'fo', 'fr', 'ga', 'gb', 'gd', 'ge',
    'gf', 'gg', 'gh', 'gi', 'gl', 'gm', 'gn', 'gp', 'gq', 'gr',
    'gs', 'gt', 'gu', 'gw', 'gy', 'hk', 'hm', 'hn', 'hr', 'ht',
    'hu', 'id', 'ie', 'il', 'im', 'in', 'io', 'iq', 'ir', 'is',
    'it', 'je', 'jm', 'jo', 'jp', 'ke', 'kg', 'kh', 'ki', 'km',
    'kn', 'kp', 'kr', 'kw', 'ky', 'kz', 'la', 'lb', 'lc', 'li',
    'lk', 'lr', 'ls', 'lt', 'lu', 'lv', 'ly', 'ma', 'mc', 'md',
    'me', 'mg', 'mh', 'mk', 'ml', 'mm', 'mn', 'mo', 'mp', 'mq',
    'mr', 'ms', 'mt', 'mu', 'mv', 'mw', 'mx', 'my', 'mz', 'na',
    'nc', 'ne', 'nf', 'ng', 'ni', 'nl', 'no', 'np', 'nr', 'nu',
    'nz', 'om', 'pa', 'pe', 'pf', 'pg', 'ph', 'pk', 'pl', 'pm',
    'pn', 'pr', 'ps', 'pt', 'pw', 'py', 'qa', 're', 'ro', 'rs',
    'ru', 'rw', 'sa', 'sb', 'sc', 'sd', 'se', 'sg', 'sh', 'si',
    'sj', 'sk', 'sl', 'sm', 'sn', 'so', 'sr', 'ss', 'st', 'su',
    'sv', 'sx', 'sy', 'sz', 'tc', 'td', 'tf', 'tg', 'th', 'tj',
    'tk', 'tl', 'tm', 'tn', 'to', 'tp', 'tr', 'tt', 'tv', 'tw',
    'tz', 'ua', 'ug', 'uk', 'us', 'uy', 'uz', 'va', 'vc', 've',
    'vg', 'vi', 'vn', 'vu', 'wf', 'ws', 'ye', 'yt', 'za', 'zm',
    'zw',
];

export const splitOnTld = (input: string): [string, string | undefined] => {
    if (input !== '' && input.indexOf('.') >= 0) {
        for (const tld of PUBLIC_SUFFIXES) {
            const suffix = '.' + tld;
            if (input.toLowerCase().endsWith(suffix)) {
                const splitIndex = input.length - suffix.length;
                const tldFromInput = input.substring(splitIndex + 1)
                input = input.substring(0, splitIndex);
                return [input, tldFromInput];
            }
        }
    }

    return [input, undefined];
};

export const endsInTld = (input: string): boolean =>
    splitOnTld(input)[1] !== undefined;

export const parseDomainFromUrl = (url: string) => {
    let parts = url.split('://');
    if (parts.length < 2) {
        return '';
    }
    return parts[1].split('/')[0];
};

export const getParentDomains = (domain: string) => {
    let [subdomain, tld] = splitOnTld(domain);

    let results = [];
    let parts = subdomain.split('.');

    while (parts.shift() !== undefined && (parts.length >= (tld ? 1 : 2))) {
        results.push((tld ? [...parts, tld] : parts).join('.'));
    }
    return results;
};
