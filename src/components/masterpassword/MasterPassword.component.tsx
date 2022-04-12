import React, { useContext, useEffect, useRef, useState } from 'react';
import { Checksum } from '../checksum/Checksum.component';
import { PasswordContext } from '../contexts/PasswordContext.component';
import { StorageContext } from '../contexts/StorageContext.component';
import { UIGroup } from '../uiutils/UIGroup.component';
import classes from './MasterPassword.module.scss';


const getCurrentTime = () => Math.floor(new Date().getTime() / 1000);

export const MasterPassword: React.FC = () => {
    const passwordContext = useContext(PasswordContext);
    const storage = useContext(StorageContext);
    const [ currentPassword, updateCurrentPassword ] = useState<string>();
    const [ now, setCurrentTime ] = useState<number>(getCurrentTime());
    const [ passwordClearTime, setPasswordClearTime ] = useState<number>();
    const [ passwordTtl, setPasswordTtl ] = useState<number>();
    const passwordInput = useRef<HTMLInputElement>(null);
    const clearButton = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (passwordContext?.hash) {
            setPasswordClearTime(now + (passwordContext.correct ? 300 : 3));
        } else {
            passwordInput.current?.focus();
            setPasswordClearTime(undefined);
            updateCurrentPassword(undefined);
        }
    }, [passwordContext]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(getCurrentTime());
        }, 200);
        return () => clearInterval(timer);
    });

    useEffect(() => {
        if (!passwordClearTime || !now) {
            setPasswordTtl(undefined);
            return;
        }
        const ttl = passwordClearTime - now;
        if (ttl <= 0) {
            passwordContext?.clear();
            return;
        }
        setPasswordTtl(ttl);
    }, [passwordContext, passwordClearTime, now]);

    return (
        <UIGroup title='Master password'>
            <input
                type='password'
                value={passwordContext?.hash || currentPassword || ''}
                disabled={!!passwordContext?.hash}
                ref={passwordInput}
                autoFocus={true}
                onChange={e => updateCurrentPassword(e.target.value)}
                onKeyDown={e => {
                    if (passwordContext && currentPassword && e.key === 'Enter') {
                        passwordContext.set(currentPassword);
                        e.stopPropagation();
                    }
                }}
                className={classes.input}
            ></input>
            {passwordContext?.hash ? (
                <div className={classes.checksumWrapper}>
                    <div className={classes.checksum}>Checksum:</div>
                    <Checksum value={passwordContext?.hash?.substr(0, 2)} expected={storage.passwordChecksum} setCurrentChecksum={storage.setPasswordChecksum} />
                </div>
            ) : (<></>)}
            {passwordTtl !== undefined ? (
                <div className={classes.autoclear}>
                    Auto-clearing in {passwordTtl} seconds... 
                    <input
                        type='button'
                        value='Clear'
                        autoFocus={passwordContext && !passwordContext.correct}
                        disabled={!passwordContext?.hash}
                        ref={clearButton}
                        onClick={passwordContext?.clear}
                        className={classes.clearButton}
                    ></input>
                </div>
            ) : undefined}
        </UIGroup>
    );
}
