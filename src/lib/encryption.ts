import { bufferToHex, hexToBuffer } from "./hexutils";

export const xorBytes = (a: Uint8Array, b: Uint8Array): Uint8Array<ArrayBuffer> => {
    if (a.length !== b.length) throw Error('XOR: length mismatch');

    const out = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) {
        out[i] = a[i] ^ b[i];
    }
    return out;
};

export const encryptForStorage = (secret: Uint8Array, storageKey: Uint8Array): string =>
    bufferToHex(xorBytes(secret, storageKey).buffer);

export const decryptFromStorage = (storedData: string, storageKey: Uint8Array): Uint8Array => {
    const encrypted = new Uint8Array(hexToBuffer(storedData));
    return xorBytes(encrypted, storageKey);
};
