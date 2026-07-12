
export const hexToBuffer = (hex: string): ArrayBuffer => {
    const buffer = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        buffer[i / 2] = parseInt(hex.substr(i, 2), 16);
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
