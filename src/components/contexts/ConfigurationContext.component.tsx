import { createContext, useContext, useEffect, useState } from 'react';
import { Configuration, IDomainConfig, load, store, serializeAll as exportConfigurations, importBackup } from '../../lib/storage';
import { getDomainIds } from '../../lib/derivation';
import { findDomainSuggestion as doFindDomainSuggestion } from '../../lib/domainSearch';
import { PasswordContext } from './PasswordContext.component';


export interface IConfigurationContext {
    currentDomain?: string;
    currentDomainId?: string;
    currentDomainConfig?: IDomainConfig;
    currentDomainIsForPage?: boolean;
    useLegacyDerivation: boolean;
    totalConfigurations?: number;

    setLegacyDerivation?: (useLegacy: boolean) => void;
    setConfigForCurrentDomain?: (config: IDomainConfig) => void;
    removeConfigForCurrentDomain?: () => void;
    selectDomain?: (domain: string, forCurrentPage: boolean) => void;
    clearSelection?: () => void;
    findDomainWithConfig?: (domains: string[]) => Promise<string | undefined>;
    checkDomainHasConfig?: (domain: string) => Promise<boolean>;
    findDomainSuggestion?: (input: string, abortSignal?: AbortSignal) => Promise<string | undefined>;

    exportConfigurations?: () => Promise<string>;
    importConfigurations?: (config: string, clearExisting: boolean) => Promise<number>;
}

export const ConfigurationContext = createContext<IConfigurationContext>({
    useLegacyDerivation: false
});

type Props = {
    children: any;
};
export const ConfigurationContextProvider: React.FC<Props> = ({ children }) => {
    const passwordContext = useContext(PasswordContext);
    const [domainConfigs, setDomainConfigs] = useState<Configuration>();
    const [currentDomain, setCurrentDomain] = useState<string | undefined>(undefined);
    const [currentDomainId, setCurrentDomainId] = useState<string | undefined>(undefined);
    const [currentDomainConfig, setCurrentDomainConfig] = useState<IDomainConfig | undefined>(undefined);
    const [isForCurrentPage, setForCurrentPage] = useState<boolean>(true);
    const [useLegacyDerivation, setLegacyDerivation] = useState<boolean>(false);

    const updateCurrentDomainConfig = (config: IDomainConfig | undefined) => {
        if (!currentDomainId)
            return;

        let configs = { ...domainConfigs };

        if (config !== undefined) {
            configs[currentDomainId] = config;
        } else if (currentDomainId in configs) {
            delete configs[currentDomainId];
        }

        setDomainConfigs(configs);
    };

    useEffect(() => {
        (async () => {
            if (domainConfigs === undefined) {
                const loaded = await load<Configuration>('metadata') || {};
                setDomainConfigs(loaded);
            } else {
                await store('metadata', domainConfigs);
            }
        })();
    }, [domainConfigs]);

    useEffect(() => {
        let stale = false;
        (async () => {
            if (!currentDomain || !passwordContext?.derivationEntropy) {
                setCurrentDomainId(undefined);
                return;
            }

            const ids = await getDomainIds(passwordContext.derivationEntropy, currentDomain);
            if (stale || domainConfigs === undefined) return;

            if (ids.legacyId in domainConfigs) {
                setLegacyDerivation(true);
                setCurrentDomainId(ids.legacyId);
            } else if (ids.id in domainConfigs) {
                setLegacyDerivation(false);
                setCurrentDomainId(ids.id);
            } else {
                setCurrentDomainId(useLegacyDerivation ? ids.legacyId : ids.id);
            }
        })();
        return () => { stale = true; };
    }, [currentDomain, passwordContext?.derivationEntropy, domainConfigs, useLegacyDerivation]);

    useEffect(() => {
        setCurrentDomainConfig(currentDomainId && domainConfigs && currentDomainId in domainConfigs ? domainConfigs[currentDomainId] : undefined);
    }, [currentDomainId, domainConfigs]);

    const findDomainWithConfig = async (domains: string[]): Promise<string | undefined> => {
        if (!passwordContext?.derivationEntropy) return undefined;
        if (!domainConfigs) return undefined;

        for (const domain of domains) {
            const ids = await getDomainIds(passwordContext.derivationEntropy, domain);
            if (ids.legacyId in domainConfigs || ids.id in domainConfigs) {
                return domain;
            }
        }
        return undefined;
    };

    const checkDomainHasConfig = async (domain: string): Promise<boolean> => {
        if (!passwordContext?.derivationEntropy) return false;

        const ids = await getDomainIds(passwordContext.derivationEntropy, domain);
        return !!domainConfigs && (ids.legacyId in domainConfigs || ids.id in domainConfigs);
    };

    const findDomainSuggestion = async (input: string, abortSignal?: AbortSignal): Promise<string | undefined> => {
        if (!passwordContext?.derivationEntropy) return undefined;
        if (!domainConfigs) return undefined;
        return doFindDomainSuggestion(passwordContext.derivationEntropy, domainConfigs, input, abortSignal);
    };

    const importConfigurations = async (config: string, clearExisting: boolean): Promise<number> => {
        const count = await importBackup(config, clearExisting);
        const loaded = await load<Configuration>('metadata') || {};
        setDomainConfigs(loaded);
        return count;
    };

    return (
        <ConfigurationContext.Provider value={{
            currentDomain: currentDomain,
            currentDomainId: currentDomainId,
            currentDomainConfig: currentDomainConfig,
            currentDomainIsForPage: isForCurrentPage,
            useLegacyDerivation: useLegacyDerivation,
            totalConfigurations: domainConfigs !== undefined ? Object.keys(domainConfigs).length : undefined,

            setLegacyDerivation: setLegacyDerivation,
            setConfigForCurrentDomain: updateCurrentDomainConfig,
            removeConfigForCurrentDomain: () => updateCurrentDomainConfig(undefined),
            selectDomain: (domain: string, forCurrentPage: boolean) => {
                setCurrentDomain(domain);
                setForCurrentPage(forCurrentPage);
            },
            clearSelection: () => {
                setCurrentDomain(undefined);
                setCurrentDomainId(undefined);
                setForCurrentPage(true);
            },
            findDomainWithConfig: findDomainWithConfig,
            checkDomainHasConfig: checkDomainHasConfig,
            findDomainSuggestion: findDomainSuggestion,

            exportConfigurations: exportConfigurations,
            importConfigurations: importConfigurations
        }}>
            {children}
        </ConfigurationContext.Provider>
    );
};
