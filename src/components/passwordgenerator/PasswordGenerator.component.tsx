import React, { useContext, useEffect, useRef, useState } from 'react';
import { derivePassword as doDerivePassword } from '../../lib/derivation';
import { InjectionContextHolder } from '../../scriptinjections/context';
import { PageContext } from '../contexts/PageContext.component';
import { PasswordContext } from '../contexts/PasswordContext.component';
import { StorageContext } from '../contexts/StorageContext.component';
import { UIGroup } from '../uiutils/UIGroup.component';
import classes from './PasswordGenerator.module.scss';
import { scripting } from '../../lib/browsercompat';


export const PasswordGenerator: React.FC = () => {
    const storage = useContext(StorageContext);
    const passwordContext = useContext(PasswordContext);
    const context = useContext(PageContext);
    const [ allowInjection, setAllowInjection ] = useState<boolean>(true);
    const copyButton = useRef<HTMLInputElement>(null);
    const injectButton = useRef<HTMLInputElement>(null);

    const derivePassword = (): string|undefined => {
        const hash = passwordContext?.hash;
        const domain = storage.currentDomain;
        const config = storage.currentDomainConfig;
        
        if (!hash || !domain || !config)
            return undefined;
            
        return doDerivePassword(hash, domain, config.passwordLength, config.passwordIteration, config.useSpecialCharacters, config.allowExtraLongPasswords);
    };

    const copyPasswordToClipboard = () => {
        const password = derivePassword();
        if (!password) return;

        navigator.clipboard.writeText(password).then(() => window.close());
    };

    const injectPassword = async () => {
        const password = derivePassword();
        if (!password || !context) return;

        await scripting.executeScript({
            target: {tabId: context.tabId},
            files: ['scriptinjections/injectpassword.js']
        });
        await scripting.executeScript({
            target: {tabId: context.tabId},
            func: password => (window as InjectionContextHolder).ewpassext!.injectPassword!(password),
            args: [password]
        });
        window.close();
    };

    useEffect(() => {
        setAllowInjection(storage.currentDomainIsForPage !== false);
    }, [storage.currentDomainIsForPage]);

    useEffect(() => {
        if (allowInjection)
            injectButton.current?.focus();
        else
            copyButton.current?.focus();
    }, [allowInjection])

    return storage.currentDomainConfig ? (
        <UIGroup title='Password generator'>
            <div>
                <input ref={copyButton} type='button' value='Copy to clipboard' disabled={!passwordContext?.hash} autoFocus={!allowInjection} onClick={copyPasswordToClipboard} className={classes.button}></input>
            </div>
            { allowInjection ? (
                <div>
                    <input ref={injectButton} type='button' value='Inject automatically' disabled={!passwordContext?.hash} autoFocus={true} onClick={injectPassword} className={classes.button}></input>
                </div>
            ) : (<></>)}
        </UIGroup>
    ) : (<></>);
};