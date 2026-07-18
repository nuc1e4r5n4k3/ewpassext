
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const DECODE_TABLE: Int8Array = (() => {
    const table = new Int8Array(128).fill(-1);
    for (let i = 0; i < ALPHABET.length; i++) {
        table[ALPHABET.charCodeAt(i)] = i;
    }
    return table;
})();

const sanitize = (input: string): string =>
    input.replace(/[\s=]/g, '').toUpperCase();

export const isBase32 = (input: string): boolean => {
    const sanitized = sanitize(input);

    for (let i = 0; i < sanitized.length; i++) {
        const code = sanitized.charCodeAt(i);
        if (code >= 128 || DECODE_TABLE[code] < 0) {
            return false;
        }
    }

    return true;
};

export const decodeBase32 = (input: string): Uint8Array => {
    const sanitized = sanitize(input);

    const out: number[] = [];
    let buffer = 0;
    let bits = 0;

    for (let i = 0; i < sanitized.length; i++) {
        const code = sanitized.charCodeAt(i);
        const value = code < 128 ? DECODE_TABLE[code] : -1;
        if (value < 0) {
            throw Error(`Invalid base32 character at position ${i}: '${sanitized[i]}'`);
        }

        buffer = (buffer << 5) | value;
        bits += 5;

        if (bits >= 8) {
            bits -= 8;
            out.push((buffer >> bits) & 0xff);
        }
    }

    return new Uint8Array(out);
};
