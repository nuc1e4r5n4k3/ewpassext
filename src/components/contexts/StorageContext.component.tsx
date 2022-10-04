import { createContext, useEffect, useState } from 'react';
import { IDomainConfig, load, store } from '../../lib/storage';


type IMetadata = { [key: string]: IDomainConfig };

export interface IStorageContext {
    passwordChecksum?: string;
    currentDomain?: string;
    currentDomainId?: string;
    currentDomainConfig?: IDomainConfig;
    currentDomainIsForPage?: boolean;

    setPasswordChecksum?: (checksum?: string) => void;
    setConfigForCurrentDomain?: (config: IDomainConfig) => void;
    removeConfigForCurrentDomain?: () => void;
    selectDomain?: (domainId: string|undefined, domain: string, forCurrentPage: boolean) => void;
    clearSelection?: () => void;

    getConfigForDomainId?: (domainId: string|undefined) => IDomainConfig|undefined;
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
    const [ isForCurrentPage, setForCurrentPage ] = useState<boolean>(true);

    const getDomainConfig = (domainId: string): IDomainConfig|undefined => 
        domainId in domainConfigs ? domainConfigs[domainId] : undefined;

    const updateState = (domainId: string|undefined, domain?: string, forCurrentPage?: boolean) => {
        setCurrentDomainId(domainId);
        setCurrentDomain(domain);
        setForCurrentPage(forCurrentPage !== false);
     };

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
            currentDomainIsForPage: isForCurrentPage,

            setPasswordChecksum: setPasswordChecksum,
            setConfigForCurrentDomain: updateCurrentDomainConfig,
            removeConfigForCurrentDomain: () => updateCurrentDomainConfig(undefined),
            selectDomain: updateState,
            clearSelection: () => updateState(undefined),

            getConfigForDomainId: (domainId: string|undefined) => { if (domainId) return getDomainConfig(domainId); }
        }}>
            {children}
        </StorageContext.Provider>
    );
};
