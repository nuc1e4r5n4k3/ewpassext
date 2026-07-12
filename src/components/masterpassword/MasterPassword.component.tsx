import React, { useContext, useEffect, useRef, useState } from 'react';
import { Checksum } from '../checksum/Checksum.component';
import { PasswordContext, PASSWORD_TTL } from '../contexts/PasswordContext.component';
import { PasswordChecksumContext } from '../contexts/PasswordChecksumContext.component';
import { UIGroup } from '../uiutils/UIGroup.component';
import classes from './MasterPassword.module.scss';


const getCurrentTime = () => Math.floor(new Date().getTime() / 1000);

export const MasterPassword: React.FC = () => {
    const passwordContext = useContext(PasswordContext);
    const checksumContext = useContext(PasswordChecksumContext);
    const [checksumHasFocus, setChecksumHasFocus] = useState<boolean>(false);
    const [currentPassword, updateCurrentPassword] = useState<string>();
    const [now, setCurrentTime] = useState<number>(getCurrentTime());
    const [passwordClearTime, setPasswordClearTime] = useState<number>();
    const [passwordTtl, setPasswordTtl] = useState<number>();
    const passwordInput = useRef<HTMLInputElement>(null);
    const clearButton = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (passwordContext?.derivationEntropy) {
            setPasswordClearTime(passwordContext?.expiresAt || now + (passwordContext.correct ? PASSWORD_TTL : 3));
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

    const haveEntropy = !!passwordContext?.derivationEntropy;
    const checksum = passwordContext?.derivationEntropy?.legacyDerivationInput?.substring(0, 2);

    return (
        <UIGroup title='Master password'>
            <input
                type='password'
                value={haveEntropy ? 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' : currentPassword || ''}
                disabled={haveEntropy}
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
            {haveEntropy ? (
                <div className={classes.checksumWrapper} onMouseEnter={() => setChecksumHasFocus(true)} onMouseLeave={() => setChecksumHasFocus(false)}>
                    <div className={classes.checksum}>Checksum:</div>
                    <Checksum value={checksum} expected={checksumContext?.passwordChecksum} setCurrentChecksum={checksumContext?.setPasswordChecksum} hasFocus={checksumHasFocus} />
                </div>
            ) : (<></>)}
            {passwordTtl !== undefined ? (
                <div className={classes.autoclear}>
                    Auto-clearing in {passwordTtl} seconds...
                    <input
                        type='button'
                        value='Clear'
                        autoFocus={passwordContext && !passwordContext.correct}
                        disabled={!haveEntropy}
                        ref={clearButton}
                        onClick={passwordContext?.clear}
                        className={classes.clearButton}
                    ></input>
                </div>
            ) : undefined}
        </UIGroup>
    );
}
