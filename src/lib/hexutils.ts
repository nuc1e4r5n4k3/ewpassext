
const HEX_CHARSET_RE = /^[0-9a-fA-F]+$/;

export const isHex = (s: string): boolean => HEX_CHARSET_RE.test(s);

export const hexToNumber = (hex: string, size: number = 1): number => {
    if (hex.length < size * 2) throw Error('Cannot decode hex number');
    return parseInt(hex.substring(0, size * 2), 16);
};

export const hexToNumberAt = (hex: string, position: number, size: number = 1): number => {
    return hexToNumber(hex.substring(position * 2));
};

export const numberToHex = (n: number, digits: number = 2): string => {
    if (n < 0) {
        n = Math.pow(2, digits * 4) - n;
    }
    const raw = '0'.repeat(digits) + n.toString(16);
    return raw.substring(raw.length - digits, raw.length);
};

export const hexToBuffer = (hex: string): ArrayBuffer => {
    const buffer = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        buffer[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return buffer.buffer;
};

export const bufferToHex = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
};
