import React, { useContext, useEffect, useState } from 'react';
import Select from 'react-select';
import sha256 from 'sha256';
import { PageContext } from '../contexts/PageContext.component';
import { PasswordContext } from '../contexts/PasswordContext.component';
import { StorageContext } from '../contexts/StorageContext.component';
import { UIGroup } from '../uiutils/UIGroup.component';
import classes from './DomainPicker.module.scss';

interface SelectOption {
    value: string;
    label: string;
};

const toSelectOption = (value: string): SelectOption => {
    return { value: value, label: value }
};

const toSelectOptions = (values?: string[]): SelectOption[] => {
    let options = [];
    if (values) {
        for (const domain of values) {
            options.push(toSelectOption(domain));
        }
    }
    return options;
};

const getDomainId = (passwordHash: string, domain: string): string => {
    return sha256(passwordHash + '/' + domain).substr(0, 8);
};

export const DomainPicker: React.FC = () => {
    const context = useContext(PageContext);
    const storage = useContext(StorageContext);
    const passwordContext = useContext(PasswordContext);
    const [ selectedDomain, setSelectedDomain ] = useState<string>();
    const [ showDeleteConfig, setShowDeleteConfig ] = useState<boolean>(false);

    useEffect(() => {
        if (context)
            setSelectedDomain(context.domain);
    }, [context]);

    useEffect(() => {
        if (!passwordContext?.hash || !passwordContext?.correct || !context?.alternativeDomains || !storage.getConfigForDomainId) {
            return;
        }
        for (const domain of context.alternativeDomains) {
            const domainId = getDomainId(passwordContext.hash, domain);
            const config = storage.getConfigForDomainId(domainId);

            if (config !== undefined) {
                setSelectedDomain(domain);
                break;
            }
        }
    }, [storage, passwordContext, context?.alternativeDomains])

    useEffect(() => {
        if (passwordContext?.hash && selectedDomain && storage.selectDomain)
            storage.selectDomain(getDomainId(passwordContext?.hash, selectedDomain), selectedDomain);
    }, [storage, passwordContext, selectedDomain]);

    return (
        <UIGroup title='Domain'>
            <div className={classes.wrapper}>
                <div onMouseEnter={() => setShowDeleteConfig(true)} onMouseLeave={() => setShowDeleteConfig(false)}>
                    <Select
                        options={toSelectOptions(context?.alternativeDomains)}
                        value={selectedDomain ? toSelectOption(selectedDomain) : undefined}
                        isDisabled={!!storage.currentDomainConfig}
                        onChange={selected => { if (selected?.value) context?.setDomain(selected.value); }}
                        className={classes.select}
                    />
                    {!!storage.currentDomainConfig && storage.removeConfigForCurrentDomain && showDeleteConfig ? (
                        <div className={classes.deleteButtonWrapper}>
                            <input type='button' value='Delete configuration' onClick={storage.removeConfigForCurrentDomain}></input>
                        </div>
                    ) : (<></>)}
                </div>
            </div>
        </UIGroup>
    );
}
