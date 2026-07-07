import { getDomainId, hashPassword } from "./derivation";
import { storage } from "./browsercompat";

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


type Configuration = { [key: string]: IDomainConfig };


export const load = async <T>(name: string): Promise<T | undefined> => {
    let value = await load_string(name);
    
    if (value !== undefined) {
        try {
            return JSON.parse(value);
        } catch {}
    }
    return undefined;
};

export const load_string = async (name: string): Promise<string | undefined> => {
    const value = await storage.local.get(name);    
    return typeof value[name] === 'string' ? value[name] : undefined;
};

export const store = async <T>(name: string, value: T | undefined) => {
    store_string(name, value !== undefined ? JSON.stringify(value) : undefined);
};

export const store_string = async (name: string, value?: string) => {
    if (value === undefined) {
        await storage.local.remove(name);
    } else {
        await storage.local.set({ [name]: value });
    }
};

const FLAG_SPECIAL_CHARACTERS = 0x01;
const FLAG_EXTRA_LONG = 0x02;


const toHex = (n: number, digits: number = 2): string => {
    if (n < 0) {
        n = Math.pow(2, digits * 4) - n;
    }
    const raw = '0'.repeat(digits) + n.toString(16);
    return raw.substring(raw.length - digits, raw.length);
};

const serializeConfig = (domainId: string, config: IDomainConfig): string =>
    ''  + domainId
        + toHex(config.passwordLength)
        + toHex(config.passwordIteration) 
        + toHex((config.useSpecialCharacters ? FLAG_SPECIAL_CHARACTERS : 0) | (config.allowExtraLongPasswords ? FLAG_EXTRA_LONG : 0));

const deserializeConfig = (raw: string): [string, IDomainConfig] => {
    const domainId = raw.substring(0, 8);
    const flags = parseInt(raw.substring(12, 14), 16);
    const config: IDomainConfig = {
        passwordLength: parseInt(raw.substring(8, 10), 16),
        passwordIteration: parseInt(raw.substring(10, 12), 16),
        useSpecialCharacters: !!(flags & FLAG_SPECIAL_CHARACTERS),
        allowExtraLongPasswords: !!(flags & FLAG_EXTRA_LONG)
    };
    return [domainId, config];
};

export const serializeAll = async (): Promise<string> => {
    let serialized = '';
    const configs = await load<Configuration>('metadata');

    if (configs !== undefined) {
        for (const [domainId, config] of Object.entries(configs)) {
            serialized += serializeConfig(domainId, config);
        }
    }

    return serialized;
};

const getConfigStore = async (ignoreExisting: boolean = false): Promise<Configuration> =>
    (ignoreExisting ? undefined : await load('metadata')) || {};

export const importBackup = async (config: string, clearExisting: boolean = false) => {
    if (config.length % 14 !== 0) {
        throw Error(`Unexpected backup size: ${config.length} is not divisible by 14`);
    }

    const configs = await getConfigStore(clearExisting);
    while (config.length) {
        const [ domainId, domainConfig ] = deserializeConfig(config.substring(0, 14));
        config = config.substring(14);
        configs[domainId] = domainConfig;
    }

    await store('metadata', configs);
    console.log(`Total configurations: ${Object.keys(configs).length}`);
};

export const importLegacyBackup = async (config: LegacyBackup, password: string, clearExisting: boolean = false) => {
    const configs = await getConfigStore(clearExisting);
    const passwordHash = hashPassword(password);

    for (const domain in config) {
        const legacyConfig = config[domain];
        const domainId = getDomainId(passwordHash, domain);
        const domainConfig: IDomainConfig = {
            passwordLength: legacyConfig[0],
            passwordIteration: legacyConfig[1],
            useSpecialCharacters: legacyConfig[2],
            allowExtraLongPasswords: legacyConfig[3] !== undefined ? legacyConfig[3] : true
        };
        configs[domainId] = domainConfig;
    }

    await store('metadata', configs);
    console.log(`Total configurations: ${Object.keys(configs).length}`);
};
