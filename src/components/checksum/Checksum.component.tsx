import React, { useState } from 'react';
import classes from './Checksum.module.scss';


const CORRECT = '✓';
const INCORRECT = '✗';

type Props = {
    value?: string;
    expected?: string;
    hasFocus: boolean;
    setCurrentChecksum?: (value?: string) => void;
};
export const Checksum: React.FC<Props> = ({ value, expected, hasFocus, setCurrentChecksum }) => {
    return value ? (
        <div className={classes.wrapper}>
            <div className={classes.checksum}>{value}</div>
            {expected !== undefined ? (
                <div className={classes.buttonWrapper}>
                    <div className={classes.status}>{value === expected ? CORRECT : INCORRECT}</div>
                    {setCurrentChecksum && hasFocus ? (<input type='button' value='Clear' onClick={() => setCurrentChecksum()} className={classes.clear}></input>) : (<></>)}
                </div>
            ) : (
                <div className={classes.buttonWrapper}>
                    <div className={classes.status}>&nbsp;&nbsp;&nbsp;</div>
                    {setCurrentChecksum ? (
                        <input type='button' value={'Save'} onClick={() => setCurrentChecksum(value)} className={classes.clear}></input>
                    ) : (<></>)}
                </div>
            )}
        </div>
    ) : (<></>);
}
