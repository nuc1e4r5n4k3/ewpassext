import { createContext, useEffect, useState } from 'react';
import { IDomainConfig, load, store } from '../../lib/storage';


type IMetadata = { [key: string]: IDomainConfig };

export interface IStorageContext {
    passwordChecksum?: string;
    currentDomain?: string;
    currentDomainId?: string;
    currentDomainConfig?: IDomainConfig;

    setPasswordChecksum?: (checksum?: string) => void;
    setConfigForCurrentDomain?: (config: IDomainConfig) => void;
    removeConfigForCurrentDomain?: () => void;
    selectDomain?: (domainId: string, domain: string) => void;

    getConfigForDomainId?: (domainId: string) => IDomainConfig|undefined;
}

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

    const updateCurrentDomainConfig = (config: IDomainConfig|undefined) => {
        if (!currentDomainId)
            return;

        let configs = {...domainConfigs};

        if (config !== undefined) {
            configs[currentDomainId] = config;
        } else if (currentDomainId in configs) {
            delete configs[currentDomainId];
        }

        setDomainConfigs(configs);
    };

    useEffect(() => store('passwordChecksum', passwordChecksum), [passwordChecksum]);
    useEffect(() => store('metadata', domainConfigs), [domainConfigs]);

    useEffect(() => {
        setCurrentDomainConfig(currentDomainId && currentDomainId in domainConfigs ? domainConfigs[currentDomainId] : undefined);
    }, [currentDomainId, domainConfigs]);

    return (
        <StorageContext.Provider value={{
            passwordChecksum: passwordChecksum,
            currentDomain: currentDomain,
            currentDomainId: currentDomainId,
            currentDomainConfig: currentDomainConfig,

            setPasswordChecksum: setPasswordChecksum,
            setConfigForCurrentDomain: updateCurrentDomainConfig,
            removeConfigForCurrentDomain: () => updateCurrentDomainConfig(undefined),
            selectDomain: (domainId, domain) => { setCurrentDomainId(domainId); setCurrentDomain(domain); },

            getConfigForDomainId: getDomainConfig
        }}>
            {children}
        </StorageContext.Provider>
    );
};
