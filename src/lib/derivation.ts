import sha256 from 'sha256';
import { bufferToHex, hexToBuffer } from './hexutils';

export const SEED_PREFIX = 'E. W. Password Generator Seed';
export const DERIVE_PREFIX = 'Domain Password';
export const BASIC_MAP = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
export const EXTENDED_MAP = BASIC_MAP + '`~!@#$%^&*()-_=+[{]}\\|;:\'",<.>/?';

export const MAX_PASSWORD_SIZE_MODERN = 64;

const ENTROPY_SIZE_LEGACY = 8;


const calcRoundsLegacy = (map: string, extraLong: boolean): number => {
    const length = map.length;
    let m = 0xffffffff;
    let n = 0;

    while (m > 0) {
        if (!extraLong && m < length)
            break;

        m = Math.floor(m / length);
        n++;
    }

    return n;
};

export interface MasterEntropy {
    derivationInput: string;
    legacyDerivationInput: string;
}

export const deriveMasterEntropy = async (password: string): Promise<MasterEntropy> => {
    const encoder = new TextEncoder();
    const seedOutput = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: encoder.encode(SEED_PREFIX),
            iterations: 100000,
            hash: 'SHA-256'
        },
        await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveBits']
        ),
        2048
    );

    return {
        legacyDerivationInput: sha256(SEED_PREFIX + '/' + password),
        derivationInput: bufferToHex(seedOutput)
    };
};

export interface DomainIds {
    id: string;
    legacyId: string;
}

const asKeyDerivationInput = (entropy: MasterEntropy): Promise<CryptoKey> =>
    crypto.subtle.importKey(
        'raw',
        hexToBuffer(entropy.derivationInput),
        { name: 'HKDF' },
        false,
        ['deriveBits']
    );

const hkdfDeriveBytes = async (size: number, path: [string, string], entropy: MasterEntropy): Promise<ArrayBuffer> => {
    const encoder = new TextEncoder();
    return await crypto.subtle.deriveBits(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt: encoder.encode(path[0]),
            info: encoder.encode(path[1])
        },
        await asKeyDerivationInput(entropy),
        size * 8
    );
};

export const getDomainIds = async (entropy: MasterEntropy, domain: string): Promise<DomainIds> => {
    return {
        id: bufferToHex(await hkdfDeriveBytes(4, [SEED_PREFIX, domain], entropy)),
        legacyId: sha256(entropy.legacyDerivationInput + '/' + domain).substring(0, 8)
    };
};

export const getMaxPasswordSizeLegacy = (withSpecialChars: boolean = true, extraLong: boolean = false): number =>
    ENTROPY_SIZE_LEGACY * calcRoundsLegacy(withSpecialChars ? EXTENDED_MAP : BASIC_MAP, extraLong);

const derivePasswordLegacy = (entropy: MasterEntropy, domain: string, size: number, iteration: number, useSpecialCharacters: boolean, allowExtraLongPasswords: boolean): string => {
    const map = useSpecialCharacters ? EXTENDED_MAP : BASIC_MAP;
    const rounds = calcRoundsLegacy(map, allowExtraLongPasswords);

    let hash = sha256(`${DERIVE_PREFIX}/${entropy.legacyDerivationInput}/${iteration}/${domain}`);
    let pw = '';

    for (var i = 0; i < ENTROPY_SIZE_LEGACY; i++) {
        var x = parseInt(hash.substring(i * ENTROPY_SIZE_LEGACY, (i + 1) * ENTROPY_SIZE_LEGACY), 16);
        for (var j = 0; j < rounds; j++) {
            const idx = x % map.length;
            pw += map.substring(idx, idx + 1);
            x = Math.floor(x / map.length);
        }
    }

    return pw.substring(0, size);
};

const derivePasswordModern = async (entropy: MasterEntropy, domain: string, size: number, iteration: number, useSpecialCharacters: boolean): Promise<string> => {
    const bytes = new Uint8Array(await hkdfDeriveBytes(size * 4, [DERIVE_PREFIX, `${iteration}/${domain}`], entropy));

    const map = useSpecialCharacters ? EXTENDED_MAP : BASIC_MAP;
    const mapLength = map.length;
    const threshold = Math.floor(65536 / mapLength) * mapLength;

    let pw = '';
    for (let i = 0; i < size; i++) {
        const offset = i * 4;
        const first = (bytes[offset] << 8) | bytes[offset + 1];
        const value = first < threshold ? first : (bytes[offset + 2] << 8) | bytes[offset + 3];
        pw += map[value % mapLength];
    }

    return pw;
};

export const derivePassword = async (entropy: MasterEntropy, domain: string, size: number, iteration: number = 1, useSpecialCharacters: boolean = true, allowExtraLongPasswords: boolean = false, legacyDerivation: boolean = false): Promise<string> =>
    legacyDerivation ? derivePasswordLegacy(entropy, domain, size, iteration, useSpecialCharacters, allowExtraLongPasswords)
                     : await derivePasswordModern(entropy, domain, size, iteration, useSpecialCharacters);
