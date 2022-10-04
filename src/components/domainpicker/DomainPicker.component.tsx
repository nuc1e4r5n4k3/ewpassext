import React, { useContext, useEffect, useState } from 'react';
import Select from 'react-select';
import { getDomainId } from '../../lib/derivation';
import { PageContext } from '../contexts/PageContext.component';
import { PasswordContext } from '../contexts/PasswordContext.component';
import { StorageContext } from '../contexts/StorageContext.component';
import { UIGroup } from '../uiutils/UIGroup.component';
import classes from './DomainPicker.module.scss';

interface SelectOption {
    value: string;
    label: string;
};

enum MatchState {
    Match = 'match',
    NoMatch = 'nomatch'
};

const MatchStateIcon: { [key: string]: string } = {
    [MatchState.Match]: '✔',
    [MatchState.NoMatch]: '❌'
};

const toSelectOption = (value: string): SelectOption => {
    return { value: value, label: value }
};

const toSelectOptions = (values?: string[], selected?: string): SelectOption[] => {
    let options = [];
    if (values) {
        for (const domain of values) {
            options.push(toSelectOption(domain));
        }
    }
    if (selected && (!values || values.findIndex(v => v === selected) < 0)) {
        options.push(toSelectOption(selected));
    }
    return options;
};

export const DomainPicker: React.FC = () => {
    const context = useContext(PageContext);
    const storage = useContext(StorageContext);
    const passwordContext = useContext(PasswordContext);
    const [ selectedDomain, setSelectedDomain ] = useState<string>();
    const [ showDeleteConfig, setShowDeleteConfig ] = useState<boolean>(false);
    const [ showDomainInput, setShowDomainInput ] = useState<boolean>(false);
    const [ enteredDomain, setEnteredDomain ] = useState<string>('');
    const [ matchState, setMatchState ] = useState<MatchState|undefined>(undefined);
    const [ isPageDomain, setPageDomain ] = useState<boolean>(true);

    useEffect(() => {
        if (context?.preferredDomain)
            setSelectedDomain(context.preferredDomain);
    }, [context]);

    useEffect(() => {
        if (!showDomainInput)
            setEnteredDomain('');
    }, [showDomainInput])

    useEffect(() => {
        setMatchState((() => {
            if (enteredDomain === '' || !passwordContext?.hash || !storage.getConfigForDomainId)
                return undefined;

            const knownDomain = !!storage.getConfigForDomainId(getDomainId(passwordContext.hash, enteredDomain));
            return knownDomain ? MatchState.Match : MatchState.NoMatch;
        })());
    }, [storage, passwordContext, enteredDomain]);

    useEffect(() => {
        if (!context?.alternativeDomains || !selectedDomain)
            return;
        setPageDomain(context.alternativeDomains.findIndex(v => v === selectedDomain) >= 0);
    }, [context?.alternativeDomains, selectedDomain]);

    useEffect(() => {
        if (selectedDomain) {
            return;     /* Only initialize, don't override */
        }
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
    }, [selectedDomain, storage, passwordContext, context?.alternativeDomains])

    useEffect(() => {
        if (passwordContext?.hash && selectedDomain && storage.selectDomain)
            storage.selectDomain(getDomainId(passwordContext?.hash, selectedDomain), selectedDomain, isPageDomain);
    }, [storage, passwordContext, selectedDomain, isPageDomain]);

    return (
        <UIGroup title='Domain'>
            <div className={classes.wrapper}>
                <div onMouseEnter={() => setShowDeleteConfig(true)} onMouseLeave={() => {
                     if (matchState === MatchState.Match) {
                        setSelectedDomain(enteredDomain);
                     }
                     setShowDomainInput(false); 
                     setShowDeleteConfig(false);
                }}>
                    <div className={classes.selectorLine}>
                        <Select
                            options={toSelectOptions(context?.alternativeDomains, selectedDomain)}
                            value={selectedDomain ? toSelectOption(selectedDomain) : undefined}
                            isDisabled={!!storage.currentDomainConfig && isPageDomain}
                            onChange={selected => { if (selected?.value) setSelectedDomain(selected.value); }}
                            className={classes.select}
                        />
                        <input type='button' value='🗁' disabled={!passwordContext?.hash} className={classes.openButton} onClick={() => setShowDomainInput(true)}></input>
                    </div>
                    { showDomainInput ? (
                        <div className={classes.selectorLine}>
                            <div className={classes.domainInputLabel}>
                                <p>Domain:</p>
                            </div>
                            <input
                                autoFocus={true}
                                onChange={e => setEnteredDomain(e.target.value)}
                                onKeyDown={e => {
                                    if (enteredDomain && matchState === MatchState.Match && e.key === 'Enter') {
                                        setSelectedDomain(enteredDomain);
                                        setShowDomainInput(false);
                                        e.stopPropagation();
                                    }
                                }}
                                className={classes.domainInput}
                                {...{state: matchState}}
                            ></input>
                            <div {...{state: matchState}} className={classes.domainInputStatusIcon}>{matchState ? MatchStateIcon[matchState] : ''}</div>
                        </div>
                    ) : (
                        <>
                            {!!storage.currentDomainConfig && storage.removeConfigForCurrentDomain && showDeleteConfig ? (
                                <div className={classes.deleteButtonWrapper}>
                                    <input type='button' value='Delete configuration' onClick={storage.removeConfigForCurrentDomain}></input>
                                </div>
                            ) : (<></>)}
                        </>
                    )}
                </div>
            </div>
        </UIGroup>
    );
}
