import sha256 from 'sha256';

export const SEED_PREFIX = 'E. W. Password Generator Seed/';
export const DERIVE_PREFIX = 'Domain Password/';
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

export const getMaxPasswordSize = (withSpecialChars: boolean = true, extraLong: boolean = false): number => 
    ENTROPY_SIZE * calcRounds(withSpecialChars ? EXTENDED_MAP : BASIC_MAP, extraLong);


export const derivePassword = (passwordHash: string, domain: string, size: number, iteration: number = 1, useSpecialCharacters: boolean = true, allowExtraLongPasswords: boolean = false): string => {
    const map = useSpecialCharacters ? EXTENDED_MAP : BASIC_MAP;
    const hash = sha256(`${DERIVE_PREFIX}${passwordHash}/${iteration}/${domain}`);
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
