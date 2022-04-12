import { createContext, useEffect, useState } from 'react';

export interface IDomainConfig {
    passwordLength: number;
    passwordIteration: number;
    useSpecialCharacters: boolean;
    allowExtraLongPasswords: boolean;
}

type IMetadata = { [key: string]: IDomainConfig };

export interface IStorageContext {
    passwordChecksum?: string;
    currentDomain?: string;
    currentDomainId?: string;
    currentDomainConfig?: IDomainConfig;

    setPasswordChecksum?: (checksum?: string) => void;
    setConfigForCurrentDomain?: (config: IDomainConfig) => void;
    selectDomain?: (domainId: string, domain: string) => void;

    getConfigForDomainId?: (domainId: string) => IDomainConfig|undefined;
}


const load = (name: string) => {
    const value = localStorage.getItem(name);
    return value === null ? undefined : JSON.parse(value);
};

const store = (name: string, value: any) => {
    if (value === undefined) {
        localStorage.removeItem(name);
    } else {
        localStorage.setItem(name, JSON.stringify(value));
    }
};

const loadAll = (): IStorageContext => {
    return {
        passwordChecksum: load('passwordChecksum')
    };
};

export const StorageContext = createContext<IStorageContext>(loadAll());

type Props = {
    children: any;
};
export const StorageContextProvider: React.FC<Props> = ({children}) => {
    const [ passwordChecksum, setPasswordChecksum ] = useState<string|undefined>(load('passwordChecksum'));
    const [ domainConfigs, setDomainConfigs ] = useState<IMetadata>(load('metadata') || {});
    const [ currentDomain, setCurrentDomain ] = useState<string|undefined>(undefined);
    const [ currentDomainId, setCurrentDomainId ] = useState<string|undefined>(undefined);
    const [ currentDomainConfig, setCurrentDomainConfig ] = useState<IDomainConfig|undefined>(undefined);

    const getDomainConfig = (domainId: string): IDomainConfig|undefined => 
        domainId in domainConfigs ? domainConfigs[domainId] : undefined;

    const updateCurrentDomainConfig = (config: IDomainConfig) => {
        if (!currentDomainId)
            return;

        let configs = {...domainConfigs};
        configs[currentDomainId] = config;
        setDomainConfigs(configs);
    };

    useEffect(() => store('passwordChecksum', passwordChecksum), [passwordChecksum]);
    useEffect(() => store('metadata', domainConfigs), [domainConfigs]);

    useEffect(() => {
        if (currentDomainId && currentDomainId in domainConfigs) {
            setCurrentDomainConfig(domainConfigs[currentDomainId]);
        }
    }, [currentDomainId, domainConfigs]);

    return (
        <StorageContext.Provider value={{
            passwordChecksum: passwordChecksum,
            currentDomain: currentDomain,
            currentDomainId: currentDomainId,
            currentDomainConfig: currentDomainConfig,

            setPasswordChecksum: setPasswordChecksum,
            setConfigForCurrentDomain: updateCurrentDomainConfig,
            selectDomain: (domainId, domain) => { setCurrentDomainId(domainId); setCurrentDomain(domain); },

            getConfigForDomainId: getDomainConfig
        }}>
            {children}
        </StorageContext.Provider>
    );
};
