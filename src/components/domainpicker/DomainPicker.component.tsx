import React, { useCallback, useContext, useEffect, useState } from 'react';
import Select from 'react-select';
import { getDomainId as deriveDomainId } from '../../lib/derivation';
import { IDomainConfig } from '../../lib/storage';
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

namespace MatchState {
    export function from(matches: boolean): MatchState {
        return matches ? MatchState.Match : MatchState.NoMatch;
    }
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

    /**
     *  Derive domainId from domain and password
     */
    const getDomainId = useCallback((domain: string): string | undefined => {
        if (passwordContext?.hash)
            return deriveDomainId(passwordContext.hash, domain);
    }, [passwordContext?.hash]);

    /**
     *  Loads domain config
     */
    const loadConfig = useCallback((domain: string): IDomainConfig | undefined => {
        if (storage.getConfigForDomainId)
            return storage.getConfigForDomainId(getDomainId(domain));
    }, [storage, getDomainId]);

    /**
     *  Convenience variant of loadConfig()
     * 
     *  Defaults to selectedDomain if no domain is provided.
     */
    const domainHasConfig = useCallback((domain?: string): boolean => {
        if (!domain && !selectedDomain)
            return false;
        return !!loadConfig(domain || selectedDomain!);
    }, [selectedDomain, loadConfig]);

    /**
     *  Same as domainHasConfig(), but returns a MatchState result.
     */
    const domainMatchState = useCallback((domain: string): MatchState => MatchState.from(domainHasConfig(domain)), [domainHasConfig]);

    /**
     *  Check if domain is related to current page.
     * 
     *  Defaults to selectedDomain if no domain is provided.
     */
    const isPageDomain = useCallback((domain?: string) => {
        if (!domain && !selectedDomain) /* If nothing selected, we are in the context of the current page (probably loading it) */
            return true;

        return (context?.alternativeDomains || []).indexOf(selectedDomain || domain!) >= 0;
    }, [selectedDomain, context?.alternativeDomains]);

    /**
     *  Auto-clear enteredDomain state when UI is removed.
     */
    useEffect(() => {
        if (!showDomainInput)
            setEnteredDomain('');
    }, [showDomainInput])

    /**
     *  Update enteredDomain matchState state (is domain known/has a valid config) when it changes.
     * 
     *  Note that matchState is reset to undefined when enteredDomain is reset.
     */
    useEffect(() => {
        setMatchState(enteredDomain !== '' ? domainMatchState(enteredDomain) : undefined);
    }, [enteredDomain, domainMatchState]);

    /**
     *  Load the config for the current page.
     * 
     *  This gets triggered when:
     *   * The page context changes (i.e. navigation)
     *   * The password is entered/cleared
     *   * The selected domain changes [side-effect]
     * 
     *  Whenever it triggers, it should check if a config can be loaded for any domain for the current page,
     *  but only if a config is not already loaded (to avoid immediately deselecting a manually selected config).
     *  If no config is loaded and no config can be loaded either, switched to preferredDomain.
     */
    useEffect(() => {
        if (selectedDomain && domainHasConfig())
            return;

        setSelectedDomain((context?.alternativeDomains || []).find(domain => domainHasConfig(domain)) || context?.preferredDomain);
    }, [selectedDomain, context?.alternativeDomains, context?.preferredDomain, domainHasConfig, isPageDomain])

    /**
     *  Helper effect: if preferredDomain changes, force override selectedDomain, unless a non-page domain is selected.
     */
    useEffect(() => {
        if (context?.preferredDomain && !domainHasConfig())
            setSelectedDomain(context?.preferredDomain);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [context?.preferredDomain]);

    /**
     *  Forward selected domain to StorageContext if a config is available for it.
     */
    useEffect(() => {
        if (selectedDomain) {
            if (storage.selectDomain) storage.selectDomain(getDomainId(selectedDomain), selectedDomain, isPageDomain());
        } else {
            if (storage.clearSelection) storage.clearSelection();
        }
    }, [selectedDomain, isPageDomain, getDomainId, storage]);

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
                            isDisabled={selectedDomain ? domainHasConfig() && isPageDomain() : false}
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
