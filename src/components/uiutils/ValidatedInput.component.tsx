import React, { useCallback, useEffect, useState } from "react";
import classes from './ValidatedInput.module.scss';

export enum MatchState {
    Match = 'match',
    NoMatch = 'nomatch'
};

export namespace MatchState {
    export function from(matches: boolean): MatchState {
        return matches ? MatchState.Match : MatchState.NoMatch;
    }
};


const MatchStateIcon: { [key: string]: string } = {
    [MatchState.Match]: '✔',
    [MatchState.NoMatch]: '❌'
};

type Props = {
    label: string;
    autofocus?: boolean;

    validate: (value: string) => Promise<boolean>;
    onUpdateValue?: (value?: string) => void;
    onSelectValue: (value: string) => void;
}

export const ValidatedInput: React.FC<Props> = ({ label, autofocus, validate, onSelectValue, onUpdateValue }) => {
    const [value, setValue] = useState<string>('');
    const [matchState, setMatchState] = useState<MatchState | undefined>();

    const trySelectValue = useCallback((): boolean => {
        if (value && matchState === MatchState.Match) {
            onSelectValue(value);
            return true;
        }
        return false;
    }, [value, matchState]);

    useEffect(() => {
        if (onUpdateValue)
            onUpdateValue(matchState === MatchState.Match ? value : undefined);
    }, [matchState, value]);

    useEffect(() => {
        if (value !== '') {
            validate(value).then(result => setMatchState(MatchState.from(result)));
        } else {
            setMatchState(undefined);
        }
    }, [value]);

    return (
        <>
            <div className={classes.label}>
                <p>{label}</p>
            </div>
            <input
                autoFocus={autofocus}
                onChange={e => setValue(e.target.value)}
                onBlur={trySelectValue}
                onKeyUp={e => {
                    if (e.key === 'Enter') {
                        trySelectValue();
                        e.stopPropagation();
                    }
                }}
                className={classes.input}
                {...{ state: matchState }}
            ></input>
            <div {...{ state: matchState }} className={classes.statusIcon}>{matchState ? MatchStateIcon[matchState] : ''}</div>
        </>
    );
};
