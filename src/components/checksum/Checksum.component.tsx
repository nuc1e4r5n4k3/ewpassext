import React, { useState } from 'react';
import classes from './Checksum.module.scss';


const CORRECT = '✓';
const INCORRECT = '✗';

type Props = {
    value?: string;
    expected?: string;
    setCurrentChecksum?: (value?: string) => void;
};
export const Checksum: React.FC<Props> = ({value, expected, setCurrentChecksum}) => {
    const [ showReset, setShowReset ] = useState<boolean>(false);

    return value ? (
        <div className={classes.wrapper}>
            <div className={classes.checksum}>{value}</div>
            {expected !== undefined ? (
                <div onMouseEnter={() => setShowReset(true)} onMouseLeave={() => setShowReset(false)}>
                    <div className={classes.status}>{value === expected ? CORRECT : INCORRECT}</div>
                    {setCurrentChecksum && showReset ? (<input type='button' value='Clear' onClick={() => setCurrentChecksum()} className={classes.clear}></input>) : (<></>)}
                </div>
            ) : (
                <div className={classes.buttonWrapper}>
                    {setCurrentChecksum ? (
                        <input type='button' value={'Save'} onClick={() => setCurrentChecksum(value)}></input>
                    ) : (<></>)}
                </div>
            )}
        </div>
    ) : (<></>);
}
