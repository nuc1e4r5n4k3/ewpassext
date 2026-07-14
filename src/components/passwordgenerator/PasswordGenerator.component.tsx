import React, { useContext, useEffect, useRef, useState } from 'react';
import { derivePassword as doDerivePassword } from '../../lib/derivation';
import { InjectionContextHolder } from '../../scriptinjections/context';
import { PageContext } from '../contexts/PageContext.component';
import { PasswordContext } from '../contexts/PasswordContext.component';
import { ConfigurationContext } from '../contexts/ConfigurationContext.component';
import { UIGroup } from '../uiutils/UIGroup.component';
import classes from './PasswordGenerator.module.scss';
import { scripting } from '../../lib/browsercompat';


export const PasswordGenerator: React.FC = () => {
    const storage = useContext(ConfigurationContext);
    const passwordContext = useContext(PasswordContext);
    const context = useContext(PageContext);
    const [ allowInjection, setAllowInjection ] = useState<boolean>(true);
    const copyButton = useRef<HTMLInputElement>(null);
    const injectButton = useRef<HTMLInputElement>(null);

    const derivePassword = async (): Promise<string|undefined> => {
        const entropy = passwordContext?.derivationEntropy;
        const domain = storage.currentDomain;
        const config = storage.currentDomainConfig;
        const useLegacy = storage.useLegacyDerivation;
        
        if (!entropy || !domain || !config)
            return undefined;
            
        return doDerivePassword(entropy, domain, config.passwordLength, config.passwordIteration, config.useSpecialCharacters, config.allowExtraLongPasswords, useLegacy);
    };

    const copyPasswordToClipboard = async () => {
        const password = await derivePassword();
        if (!password) return;

        navigator.clipboard.writeText(password).then(() => window.close());
    };

    const injectPassword = async () => {
        const password = await derivePassword();
        if (!password || !context) return;

        await scripting.executeScript({
            target: {tabId: context.tabId},
            files: ['contentscript.js']
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

    const onButtonKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        const isCopy = event.currentTarget === copyButton.current;
        if (isCopy && event.key === 'ArrowDown' && allowInjection) {
            injectButton.current?.focus();
        } else if (!isCopy && event.key === 'ArrowUp') {
            copyButton.current?.focus();
        }
    };

    return storage.currentDomainConfig ? (
        <UIGroup title='Password generator'>
            <div>
                <input ref={copyButton} type='button' value='Copy to clipboard' disabled={!passwordContext?.derivationEntropy} autoFocus={!allowInjection} onClick={copyPasswordToClipboard} onKeyDown={onButtonKeyDown} className={classes.button}></input>
            </div>
            {allowInjection ? (
                <div>
                    <input ref={injectButton} type='button' value='Inject automatically' disabled={!passwordContext?.derivationEntropy} autoFocus={true} onClick={injectPassword} onKeyDown={onButtonKeyDown} className={classes.button}></input>
                </div>
            ) : (<></>)}
        </UIGroup>
    ) : (<></>);
};
