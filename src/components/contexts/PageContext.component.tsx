import { createContext, useEffect, useState } from 'react';
import { getParentDomains, parseDomainFromUrl } from '../../lib/domain';


const currentTab = (): Promise<chrome.tabs.Tab> => new Promise((resolve, reject) => {
    if (chrome.tabs === undefined) {
        reject('Cannot access chrome.tabs API');
        return;
    }
    chrome.tabs.query({
        windowId: chrome.windows.WINDOW_ID_CURRENT,
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
    prefferedDomain: string;
    alternativeDomains: string[];
}

export const PageContext = createContext<IPageContext|undefined>(undefined);

type Props = {
    children: any;
};
export const PageContextProvider: React.FC<Props> = ({children}) => {
    const [ tabId, setTabId ] = useState<number>();
    const [ fullDomain, setFullDomain ] = useState<string>();
    const [ alternativeDomains, setAlternativeDomains ] = useState<string[]>([]);
    const [ prefferedDomain, setPrefferedDomain ] = useState<string>();

    useEffect(() => {
        (async () => {
            const {id, url} = await currentTab();
            setTabId(id);
            setFullDomain(parseDomainFromUrl(url!));
        })();
    });

    useEffect(() => {
        setAlternativeDomains((() => {
            if (fullDomain === undefined)
                return [];

            return [fullDomain].concat(getParentDomains(fullDomain));    
        })());
    }, [fullDomain]);

    useEffect(() => {
        setPrefferedDomain(alternativeDomains.length ? alternativeDomains[0] : undefined);
    }, [alternativeDomains]);

    return (
        <PageContext.Provider value={tabId && fullDomain ? {
            tabId: tabId,
            prefferedDomain: prefferedDomain || fullDomain,
            alternativeDomains: alternativeDomains
        } : undefined}>
            {children}
        </PageContext.Provider>
    );
};
