import React, { useContext } from 'react';
import { derivePassword as doDerivePassword } from '../../lib/derivation';
import { PasswordContext } from '../contexts/PasswordContext.component';
import { StorageContext } from '../contexts/StorageContext.component';
import { UIGroup } from '../uiutils/UIGroup.component';
import classes from './PasswordGenerator.module.scss';


export const PasswordGenerator: React.FC = () => {
    const storage = useContext(StorageContext);
    const passwordContext = useContext(PasswordContext);

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
        if (!password) return undefined;

        navigator.clipboard.writeText(password);
        window.close();
    };

    const injectPassword = () => {
        const password = derivePassword();
        if (!password) return undefined;

        chrome.tabs.executeScript({code: `
            for (const input of document.getElementsByTagName('input')) {
                if (input.type === 'password')
                    input.value = '${password}';
            }
        `});
        window.close();
    };

    return storage.currentDomainConfig ? (
        <UIGroup title='Password generator'>
            <div>
                <input type='button' value='Copy to clipboard' disabled={!passwordContext?.hash} onClick={copyPasswordToClipboard} className={classes.button}></input>
            </div>
            <div>
                <input type='button' value='Inject automatically' disabled={!passwordContext?.hash} autoFocus={true} onClick={injectPassword} className={classes.button}></input>
            </div>
        </UIGroup>
    ) : (<></>);
};