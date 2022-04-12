import React, { useContext, useEffect, useState } from 'react';
import { Row } from '../uiutils/Row.component';
import { RowHeader } from '../uiutils/RowHeader.component';
import NumericInput from 'react-numeric-input';
import classes from './DerivationOptions.module.scss';
import { getMaxPasswordSize } from '../../lib/derivation';
import { UIGroup } from '../uiutils/UIGroup.component';
import { IDomainConfig, StorageContext } from '../contexts/StorageContext.component';


const makeConfig = (passwordSize: number = 16, iteration: number = 1, useSpecialCharacters: boolean = true, allowExtraLongPasswords: boolean = false): IDomainConfig => {
    return {
        allowExtraLongPasswords: allowExtraLongPasswords,
        passwordIteration: iteration,
        passwordLength: passwordSize,
        useSpecialCharacters: useSpecialCharacters
    };
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
        setDirty(!storage.currentDomainConfig || JSON.stringify(newConfig) !== JSON.stringify(storage.currentDomainConfig))
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
                        <NumericInput size={2} value={passwordSize} min={10} max={maxPasswordSize} disabled={!storage.currentDomainId} onChange={value => {
                            if (value !== null && value >= 10 && value <= maxPasswordSize)
                                setPasswordSize(value);
                        }}/>
                    </div>
                </Row>
                <Row>
                    <RowHeader value='Iteration:' />
                    <div>
                        <NumericInput size={2} value={iteration} min={1} max={100} disabled={!storage.currentDomainId} onChange={value => {
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