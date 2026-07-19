import { storage } from "./browsercompat";
import { isHex } from "./hexutils";
import { deserializeConfig, serializeConfig } from "./backupformat";

export interface IDomainConfig {
    passwordLength: number;
    passwordIteration: number;
    useSpecialCharacters: boolean;
    allowExtraLongPasswords: boolean;
    totpSecret?: string;
}

export type Configuration = { [key: string]: IDomainConfig };


export type LegacyDomainConfig = [
    length: number, iteration: number, useSpecialCharacters: boolean, allowExtraLongPasswords?: boolean
];
export type LegacyBackup = { [domainId: string]: LegacyDomainConfig };


export const load = async <T>(name: string, area = storage.local): Promise<T | undefined> => {
    let value = await load_string(name, area);

    if (value !== undefined) {
        try {
            return JSON.parse(value);
        } catch { }
    }
    return undefined;
};

export const load_string = async (name: string, area = storage.local): Promise<string | undefined> => {
    const value = await area.get(name);
    return typeof value[name] === 'string' ? value[name] : undefined;
};

export const store = async <T>(name: string, value: T | undefined, area = storage.local) => {
    store_string(name, value !== undefined ? JSON.stringify(value) : undefined, area);
};

export const store_string = async (name: string, value?: string, area = storage.local) => {
    if (value === undefined) {
        await area.remove(name);
    } else {
        await area.set({ [name]: value });
    }
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

export const preParseBackup = (config: string): number | undefined => {
    if (!isHex(config)) {
        return undefined;
    }

    let configs = 0;
    let position = 0;

    try {
        while (position < config.length) {
            const [_id, _config, size] = deserializeConfig(config.substring(position));
            position += size * 2;
            configs += 1;
        }
        return configs;
    } catch {
        return undefined;
    }
};

export const importBackup = async (config: string, clearExisting: boolean = false): Promise<number> => {
    if (!isHex(config)) {
        throw Error('Invalid configuration backup string');
    }

    const configs = await getConfigStore(clearExisting);
    let position = 0;

    try {
        while (position < config.length) {
            const [domainId, domainConfig, size] = deserializeConfig(config.substring(position));
            configs[domainId] = domainConfig;
            position += size * 2;
        }
    } catch {
        throw Error('Invalid configuration backup string');
    }

    await store('metadata', configs);
    return Object.keys(configs).length;
};
