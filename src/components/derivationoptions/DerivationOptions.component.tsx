import React, { useContext, useEffect, useState } from 'react';
import { Row } from '../uiutils/Row.component';
import { RowHeader } from '../uiutils/RowHeader.component';
import NumericInput from 'react-numeric-input';
import classes from './DerivationOptions.module.scss';
import { getMaxPasswordSizeLegacy, MAX_PASSWORD_SIZE_MODERN } from '../../lib/derivation';
import { UIGroup } from '../uiutils/UIGroup.component';
import { ConfigurationContext } from '../contexts/ConfigurationContext.component';
import { IDomainConfig } from '../../lib/storage';


const makeConfig = (passwordSize: number = 16, iteration: number = 1, useSpecialCharacters: boolean = true, allowExtraLongPasswords: boolean = false): IDomainConfig => {
    return {
        allowExtraLongPasswords: allowExtraLongPasswords,
        passwordIteration: iteration,
        passwordLength: passwordSize,
        useSpecialCharacters: useSpecialCharacters
    };
};

const objectsAreEqual = (object1: any, object2: any): boolean => {
    if (Object.keys(object1).length !== Object.keys(object2).length)
        return false;
    for (const key in object1) {
        if (!(key in object2))
            return false;
        if (object1[key] !== object2[key])
            return false;
    }
    return true;
};

type Props = {
    showBackupOptions: () => void;
}

export const DerivationOptions: React.FC<Props> = ({ showBackupOptions }) => {
    const storage = useContext(ConfigurationContext);
    const [maxPasswordSize, setMaxPasswordSize] = useState<number>(32);
    const [useSpecialCharacters, setUseSpecialCharacters] = useState<boolean>(true);
    const [useLegacyDerivation, setUseLegacyDerivation] = useState<boolean>(false);
    const [allowExtraLongPasswords, setAllowExtraLongPasswords] = useState<boolean>(false);
    const [passwordSize, setPasswordSize] = useState<number>(16);
    const [iteration, setIteration] = useState<number>(1);
    const [dirty, setDirty] = useState<boolean>(false);

    const saveConfig = () => {
        if (storage.setConfigForCurrentDomain) {
            storage.setConfigForCurrentDomain(makeConfig(passwordSize, iteration, useSpecialCharacters, useLegacyDerivation ? allowExtraLongPasswords : false));
        }
    };

    useEffect(() => {
        setUseLegacyDerivation(storage.useLegacyDerivation);
    }, [storage.useLegacyDerivation]);

    useEffect(() => {
        const maxSize = useLegacyDerivation ? getMaxPasswordSizeLegacy(useSpecialCharacters, allowExtraLongPasswords) : MAX_PASSWORD_SIZE_MODERN;
        setMaxPasswordSize(maxSize);
        if (passwordSize > maxSize)
            setPasswordSize(maxSize);
    }, [useLegacyDerivation, useSpecialCharacters, allowExtraLongPasswords]);

    useEffect(() => {
        const newConfig = makeConfig(passwordSize, iteration, useSpecialCharacters, allowExtraLongPasswords);
        setDirty(!storage.currentDomainConfig || !objectsAreEqual(storage.currentDomainConfig, newConfig))
    }, [storage, passwordSize, iteration, useSpecialCharacters, allowExtraLongPasswords]);

    useEffect(() => {
        if (!storage.currentDomainConfig)
            return;
        const config = storage.currentDomainConfig;
        setPasswordSize(config.passwordLength);
        setIteration(config.passwordIteration);
        setUseSpecialCharacters(config.useSpecialCharacters);
        setAllowExtraLongPasswords(config.allowExtraLongPasswords);
    }, [storage.currentDomainConfig]);

    return (
        <UIGroup title='Options'>
            <div className={classes.backupOptions}><a href='#' onClick={showBackupOptions}>backup options</a></div>
            <div className={classes.table}>
                <Row>
                    <RowHeader value='Password length:' />
                    <div>
                        <NumericInput size={2} value={passwordSize} min={10} max={maxPasswordSize} disabled={!storage.currentDomainId} className={classes.input} onChange={value => {
                            if (value !== null && value >= 10 && value <= maxPasswordSize)
                                setPasswordSize(value);
                        }} />
                    </div>
                </Row>
                <Row>
                    <RowHeader value='Iteration:' />
                    <div>
                        <NumericInput size={2} value={iteration} min={1} max={100} disabled={!storage.currentDomainId} className={classes.input} onChange={value => {
                            if (value !== null && value >= 1 && value <= 100)
                                setIteration(value);
                        }} />
                    </div>
                </Row>
                <Row>
                    <RowHeader value='Special Chars:' />
                    <div>
                        <input type='checkbox' checked={useSpecialCharacters} disabled={!storage.currentDomainId} onChange={e => setUseSpecialCharacters(e.target.checked)} className={classes.checkbox} />
                    </div>
                </Row>
                {useLegacyDerivation ? (
                    <Row>
                        <RowHeader value='Long passwords:' />
                        <div>
                            <input type='checkbox' checked={allowExtraLongPasswords} disabled={!storage.currentDomainId} onChange={e => setAllowExtraLongPasswords(e.target.checked)} className={classes.checkbox} />
                        </div>
                    </Row>
                ) : (<></>)}
                {dirty && storage.currentDomainId && !storage.currentDomainConfig ? (
                    <Row>
                        <RowHeader value='Use legacy SHA-2:' />
                        <div>
                            <input type='checkbox' checked={storage.useLegacyDerivation} onChange={e => storage.setLegacyDerivation?.(e.target.checked)} className={classes.checkbox} />
                        </div>
                    </Row>
                ) : (<></>)}
            </div>
            {dirty && storage.currentDomainId ? (
                <input type='button' value={storage.currentDomainConfig ? 'Update configration' : 'Create new password'} onClick={saveConfig} className={classes.updateButton}></input>
            ) : (<></>)}
        </UIGroup>
    );
}
