import { getDomainId, hashPassword } from "./derivation";

export interface IDomainConfig {
    passwordLength: number;
    passwordIteration: number;
    useSpecialCharacters: boolean;
    allowExtraLongPasswords: boolean;
}

export type LegacyDomainConfig = [
    length: number, iteration: number, useSpecialCharacters: boolean, allowExtraLongPasswords?: boolean
];
export type LegacyBackup = { [domainId: string]: LegacyDomainConfig };


export const load = (name: string) => {
    const value = localStorage.getItem(name);
    return value === null ? undefined : JSON.parse(value);
};

export const store = (name: string, value: any) => {
    if (value === undefined) {
        localStorage.removeItem(name);
    } else {
        localStorage.setItem(name, JSON.stringify(value));
    }
};


const FLAG_SPECIAL_CHARACTERS = 0x01;
const FLAG_EXTRA_LONG = 0x02;


const toHex = (n: number, digits: number = 2): string => {
    if (n < 0) {
        n = Math.pow(2, digits * 4) - n;
    }
    const raw = '0'.repeat(digits) + n.toString(16);
    return raw.substr(raw.length - digits, digits);
};

const serializeConfig = (domainId: string, config: IDomainConfig): string =>
    ''  + domainId
        + toHex(config.passwordLength)
        + toHex(config.passwordIteration) 
        + toHex((config.useSpecialCharacters ? FLAG_SPECIAL_CHARACTERS : 0) | (config.allowExtraLongPasswords ? FLAG_EXTRA_LONG : 0));

const deserializeConfig = (raw: string): [string, IDomainConfig] => {
    const domainId = raw.substr(0, 8);
    const flags = parseInt(raw.substr(12, 2), 16);
    const config: IDomainConfig = {
        passwordLength: parseInt(raw.substr(8, 2), 16),
        passwordIteration: parseInt(raw.substr(10, 2), 16),
        useSpecialCharacters: !!(flags & FLAG_SPECIAL_CHARACTERS),
        allowExtraLongPasswords: !!(flags & FLAG_EXTRA_LONG)
    };
    return [domainId, config];
};

export const serializeAll = (): string => {
    let serialized = '';
    const configs = load('metadata');

    for (const domainId in configs) {
        serialized += serializeConfig(domainId, configs[domainId]);
    }

    return serialized;
};

const getConfigStore = (ignoreExisting: boolean = false): {[key: string]: IDomainConfig} =>
    (ignoreExisting ? undefined : load('metadata')) || {};

export const importBackup = (config: string, clearExisting: boolean = false) => {
    if (config.length % 14 !== 0) {
        throw Error(`Unexpected backup size: ${config.length} is not divisible by 14`);
    }

    const configs = getConfigStore(clearExisting);
    while (config.length) {
        const [ domainId, domainConfig ] = deserializeConfig(config.substr(0, 14));
        config = config.substr(14);
        configs[domainId] = domainConfig;
    }

    store('metadata', configs);
    console.log(`Total configurations: ${Object.keys(configs).length}`);
};

export const importLegacyBackup = (config: LegacyBackup, password: string, clearExisting: boolean = false) => {
    const configs = getConfigStore(clearExisting);
    const passwordHash = hashPassword(password);

    for (const domain in config) {
        const legacyConfig = config[domain];
        const domainId = getDomainId(passwordHash, domain);
        const domainConfig: IDomainConfig = {
            passwordLength: legacyConfig[0],
            passwordIteration: legacyConfig[1],
            useSpecialCharacters: legacyConfig[2],
            allowExtraLongPasswords: legacyConfig[3] || true
        };
        configs[domainId] = domainConfig;
    }

    store('metadata', configs);
    console.log(`Total configurations: ${Object.keys(configs).length}`);
};
