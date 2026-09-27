import { createContext, useEffect, useState } from 'react';
import { getParentDomains, parseDomainFromUrl } from '../../lib/domain';
import browser from '../../lib/browsercompat';
import { InputFieldType } from '../../lib/inputfieldtypes';
import { InjectionProxy } from '../../scriptinjections/proxy';

const currentTab = (): Promise<chrome.tabs.Tab> => new Promise((resolve, reject) => {
    if (browser.tabs === undefined) {
        reject('Cannot access browser.tabs API');
        return;
    }
    browser.tabs.query({
        windowId: browser.windows.WINDOW_ID_CURRENT,
        active: true
    }, result => {
        if (result.length !== 1) {
            reject('Unexpected amount of active tabs: ' + result.length);
        } else if (result[0].id === undefined) {
            reject('Current tab does not have an ID');
        } else if (result[0].url === undefined) {
            reject('Current tab does not have a URL set');
        } else {
            resolve(result[0]);
        }
    });
});


export interface IPageContext {
    tabId: number;
    preferredDomain: string;
    alternativeDomains: string[];
    focusedInputType?: InputFieldType;
    injection?: InjectionProxy;
}

export const PageContext = createContext<IPageContext | undefined>(undefined);

type Props = {
    children: any;
};
export const PageContextProvider: React.FC<Props> = ({ children }) => {
    const [tabId, setTabId] = useState<number>();
    const [injectionProxy, setInjectionProxy] = useState<InjectionProxy>();
    const [fullDomain, setFullDomain] = useState<string>();
    const [alternativeDomains, setAlternativeDomains] = useState<string[]>([]);
    const [preferredDomain, setPreferredDomain] = useState<string>();
    const [focusedInputType, setFocusedInputType] = useState<InputFieldType>();

    useEffect(() => {
        const updateContextInfo = async () => {
            const { id, url } = await currentTab();
            setTabId(id);
            setFullDomain(parseDomainFromUrl(url!));
            setInjectionProxy(id !== undefined ? new InjectionProxy(id) : undefined);
        };
        const navigationListener = () => updateContextInfo();

        browser.webNavigation.onCommitted.addListener(navigationListener);
        updateContextInfo();

        return () => browser.webNavigation.onCommitted.removeListener(navigationListener);
    }, []);

    useEffect(() => {
        setFocusedInputType(undefined);
        if (!injectionProxy) return;

        let cancelled = false;
        injectionProxy.getActiveInputType().then(type => {
            if (cancelled) return;
            setFocusedInputType(type);
        }, () => { });

        return () => { cancelled = true; };
    }, [injectionProxy]);

    useEffect(() => {
        setAlternativeDomains((() => {
            if (fullDomain === undefined)
                return [];

            return [fullDomain].concat(getParentDomains(fullDomain));
        })());
    }, [fullDomain]);

    useEffect(() => {
        setPreferredDomain((() => {
            if (alternativeDomains.length === 0)
                return undefined;

            if (!alternativeDomains[0].startsWith('www.'))
                return alternativeDomains[0];
            return alternativeDomains[1];
        })());
    }, [alternativeDomains]);

    return (
        <PageContext.Provider value={tabId && fullDomain && preferredDomain ? {
            tabId: tabId,
            preferredDomain: preferredDomain,
            alternativeDomains: alternativeDomains,
            focusedInputType: focusedInputType,
            injection: injectionProxy,
        } : undefined}>
            {children}
        </PageContext.Provider>
    );
};
