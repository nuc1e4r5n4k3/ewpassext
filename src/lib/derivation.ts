import sha256 from 'sha256';
import { bufferToHex, hexToBuffer } from './hexutils';

export const SEED_PREFIX = 'E. W. Password Generator Seed';
export const DERIVE_PREFIX = 'Domain Password';
export const BASIC_MAP = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
export const EXTENDED_MAP = BASIC_MAP + '`~!@#$%^&*()-_=+[{]}\\|;:\'",<.>/?';

const ENTROPY_SIZE = 8;


const calcRounds = (map: string, extraLong: boolean): number => {
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

export const getDomainIds = async (entropy: MasterEntropy, domain: string): Promise<DomainIds> => {
    const encoder = new TextEncoder();
    const derivedBuffer = await crypto.subtle.deriveBits(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt: encoder.encode(SEED_PREFIX),
            info: encoder.encode(domain)
        },
        await crypto.subtle.importKey(
            'raw',
            hexToBuffer(entropy.derivationInput),
            { name: 'HKDF' },
            false,
            ['deriveBits']
        ),
        32
    );

    return {
        id: bufferToHex(derivedBuffer),
        legacyId: sha256(entropy.legacyDerivationInput + '/' + domain).substr(0, 8)
    };
};

export const getMaxPasswordSize = (withSpecialChars: boolean = true, extraLong: boolean = false): number => 
    ENTROPY_SIZE * calcRounds(withSpecialChars ? EXTENDED_MAP : BASIC_MAP, extraLong);


export const derivePassword = async (entropy: MasterEntropy, domain: string, size: number, iteration: number = 1, useSpecialCharacters: boolean = true, allowExtraLongPasswords: boolean = false, legacyDerivation: boolean = false): Promise<string> => {
    const map = useSpecialCharacters ? EXTENDED_MAP : BASIC_MAP;

    let hash: string;
    if (legacyDerivation) {
        hash = sha256(`${DERIVE_PREFIX}/${entropy.legacyDerivationInput}/${iteration}/${domain}`);
    } else {
        const encoder = new TextEncoder();
        const hkdfBuffer = await crypto.subtle.deriveBits(
            {
                name: 'HKDF',
                hash: 'SHA-256',
                salt: encoder.encode(DERIVE_PREFIX),
                info: encoder.encode(`${iteration}/${domain}`)
            },
            await crypto.subtle.importKey(
                'raw',
                hexToBuffer(entropy.derivationInput),
                { name: 'HKDF' },
                false,
                ['deriveBits']
            ),
            256
        );

        hash = bufferToHex(hkdfBuffer);
    }

    const rounds = calcRounds(map, allowExtraLongPasswords);
    let pw = '';
    
    for (var i = 0; i < ENTROPY_SIZE; i++) {
        var x = parseInt(hash.substr(i * ENTROPY_SIZE, ENTROPY_SIZE), 16);
        for (var j = 0; j < rounds; j++) {
            pw += map.substr(x % map.length, 1);
            x = Math.floor(x / map.length);
        }
    }

    return pw.substring(0, size);
};
