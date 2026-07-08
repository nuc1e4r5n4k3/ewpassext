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

export const StorageContext = createContext<IStorageContext>({
    passwordChecksum: undefined
});

type Props = {
    children: any;
};
export const StorageContextProvider: React.FC<Props> = ({children}) => {
    const [ passwordChecksum, setPasswordChecksum ] = useState<string|null|undefined>(null);
    const [ domainConfigs, setDomainConfigs ] = useState<IMetadata>({});
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

    useEffect(() => {
        (async () => {
            if (passwordChecksum === null) {
                setPasswordChecksum(await load('passwordChecksum'));
            } else {
                store('passwordChecksum', passwordChecksum);
            }
        })();
    }, [passwordChecksum]);
    
    useEffect(() => {
        (async () => {
            if (domainConfigs === undefined) {
                setDomainConfigs(await load('metadata') || {});
            } else {
                await store('metadata', domainConfigs);
            }
        })();
    }, [domainConfigs]);

    useEffect(() => {
        setCurrentDomainConfig(currentDomainId && currentDomainId in domainConfigs ? domainConfigs[currentDomainId] : undefined);
    }, [currentDomainId, domainConfigs]);

    return (
        <StorageContext.Provider value={{
            passwordChecksum: passwordChecksum || undefined,
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
