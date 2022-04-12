import React, { useContext, useEffect, useState } from 'react';
import { Row } from '../uiutils/Row.component';
import { RowHeader } from '../uiutils/RowHeader.component';
import NumericInput from 'react-numeric-input';
import classes from './DerivationOptions.module.scss';
import { getMaxPasswordSize } from '../../lib/derivation';
import { UIGroup } from '../uiutils/UIGroup.component';
import { StorageContext } from '../contexts/StorageContext.component';
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

export const DerivationOptions: React.FC = () => {
    const storage = useContext(StorageContext);
    const [ maxPasswordSize, setMaxPasswordSize ] = useState<number>(32);
    const [ useSpecialCharacters, setUseSpecialCharacters ] = useState<boolean>(true);
    const [ allowExtraLongPasswords, setAllowExtraLongPasswords ] = useState<boolean>(false);
    const [ passwordSize, setPasswordSize ] = useState<number>(16);
    const [ iteration, setIteration ] = useState<number>(1);
    const [ dirty, setDirty ] = useState<boolean>(false);

    const saveConfig = () => {
        if (storage.setConfigForCurrentDomain) {
            storage.setConfigForCurrentDomain(makeConfig(passwordSize, iteration, useSpecialCharacters, allowExtraLongPasswords));
        }
    };

    useEffect(() => {
        const maxSize = getMaxPasswordSize(useSpecialCharacters, allowExtraLongPasswords);
        setMaxPasswordSize(maxSize);
        if (passwordSize > maxSize)
            setPasswordSize(maxSize);
    }, [useSpecialCharacters, allowExtraLongPasswords]);

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
            <div className={classes.table}>
                <Row>
                    <RowHeader value='Password length:' />
                    <div>
                        <NumericInput size={2} value={passwordSize} min={10} max={maxPasswordSize} disabled={!storage.currentDomainId} className={classes.input} onChange={value => {
                            if (value !== null && value >= 10 && value <= maxPasswordSize)
                                setPasswordSize(value);
                        }}/>
                    </div>
                </Row>
                <Row>
                    <RowHeader value='Iteration:' />
                    <div>
                        <NumericInput size={2} value={iteration} min={1} max={100} disabled={!storage.currentDomainId} className={classes.input} onChange={value => {
                            if (value !== null && value >= 1 && value <= 100)
                                setIteration(value);
                        }}/>
                    </div>
                </Row>
                <Row>
                    <RowHeader value='Special Chars:' />
                    <div>
                        <input type='checkbox' checked={useSpecialCharacters} disabled={!storage.currentDomainId} onChange={e => setUseSpecialCharacters(e.target.checked)} className={classes.checkbox} />
                    </div>
                </Row>
                <Row>
                    <RowHeader value='Long passwords:' />
                    <div>
                        <input type='checkbox' checked={allowExtraLongPasswords} disabled={!storage.currentDomainId} onChange={e => setAllowExtraLongPasswords(e.target.checked)} className={classes.checkbox} />
                    </div>
                </Row>
            </div>
            {dirty && storage.currentDomainId ? (
                <input type='button' value={storage.currentDomainConfig ? 'Update configration' : 'Create new password'} onClick={saveConfig} className={classes.updateButton}></input>
            ) : (<></>)}
        </UIGroup>
    );
}