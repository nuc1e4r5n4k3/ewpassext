import { MasterEntropy, deriveTotpKey } from './derivation';
import { encryptForStorage, xorBytes } from './encryption';
import { hexToBuffer } from './hexutils';

/* 
 *  Hardcoded for now, since almost everyone seems to use these same values
 */
const TOTP_T0 = 0;
const TOTP_PERIOD_LENGTH = 30;
const TOTP_DIGITS = 6;

export interface TOTPSettings {
    t0: number,
    periodLength: number,
    digits: number
};

export const TOTP_DEFAULT_SETTINGS: TOTPSettings = {
    t0: TOTP_T0,
    periodLength: TOTP_PERIOD_LENGTH,
    digits: TOTP_DIGITS
};

const encodePeriod = (period: number): Uint8Array => {
    const raw = new Uint8Array(8);
    const view = new DataView(raw.buffer);

    view.setUint32(0, Math.floor(period / 0x100000000));
    view.setUint32(4, period >>> 0);

    return raw;
};

const asDerivationKey = (secret: Uint8Array): Promise<CryptoKey> =>
    crypto.subtle.importKey(
        'raw',
        secret as BufferSource,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
    );

const toInt32 = (rawData: Uint8Array) =>
    ((rawData[0] & 0x7f) << 24)
    | ((rawData[1] & 0xff) << 16)
    | ((rawData[2] & 0xff) << 8)
    | (rawData[3] & 0xff);


export const generateTotp = async (secret: Uint8Array, timeSeconds: number = Math.floor(Date.now() / 1000), configuration: TOTPSettings = TOTP_DEFAULT_SETTINGS): Promise<string> => {
    const key = await asDerivationKey(secret);
    const period = Math.floor((timeSeconds - configuration.t0) / configuration.periodLength);

    const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', key, encodePeriod(period) as BufferSource));

    const offset = hmac[hmac.length - 1] & 0x0f;
    const result = toInt32(hmac.subarray(offset)) % Math.pow(10, configuration.digits);
    return result.toString().padStart(configuration.digits, '0');
};

export const encryptTotpSecret = async (secret: Uint8Array, domain: string, entropy: MasterEntropy): Promise<string> =>
    encryptForStorage(secret, await deriveTotpKey(entropy, domain, secret.length));

export const decryptTotpSecret = async (storedSecret: string, domain: string, entropy: MasterEntropy): Promise<Uint8Array> => {
    const encrypted = new Uint8Array(hexToBuffer(storedSecret));
    return xorBytes(encrypted, await deriveTotpKey(entropy, domain, encrypted.length));
};
