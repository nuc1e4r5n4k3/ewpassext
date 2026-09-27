import React, { useContext, useEffect, useRef, useState } from 'react';
import { ConfigurationContext } from '../contexts/ConfigurationContext.component';
import { TotpContext } from '../contexts/TotpContext.component';
import { PageContext } from '../contexts/PageContext.component';
import { UIGroup } from '../uiutils/UIGroup.component';
import { parseTotpConfiguratonString, TOTP_DEFAULT_SETTINGS } from '../../lib/totp';
import classes from './Totp.module.scss';
import { ValidatedInput } from '../uiutils/ValidatedInput.component';

const validateSecret = async (value: string): Promise<boolean> => {
    try {
        parseTotpConfiguratonString(value);
        return true;
    } catch {
        return false;
    }
};

const EXPIRING_THRESHOLD_SECONDS = 3;

export const Totp: React.FC = () => {
    const storage = useContext(ConfigurationContext);
    const totp = useContext(TotpContext);
    const context = useContext(PageContext);
    const [showInject, setShowInject] = useState<boolean>(false);
    const [focusInject, setFocusInject] = useState<boolean>(false);
    const injectButton = useRef<HTMLInputElement>(null);

    const hasSecret = !!storage.currentDomainConfig?.totpSecret;
    const code = totp?.code;
    const expiresAt = totp?.expiresAt;

    const [nowDeciSeconds, setNowDeciSeconds] = useState(() => Math.floor(Date.now() / 100));

    useEffect(() => {
        setShowInject(context?.focusedInputType !== undefined);
        setFocusInject(context?.focusedInputType === 'textinput');
    }, [context?.focusedInputType])

    useEffect(() => {
        if (code && focusInject) injectButton.current?.focus();
    }, [focusInject, code, injectButton.current]);

    useEffect(() => {
        if (expiresAt === undefined) return;

        const timer = setInterval(() => {
            setNowDeciSeconds(Math.floor(Date.now() / 100));
        }, 100);
        return () => clearInterval(timer);
    }, [expiresAt]);

    const remaining = expiresAt !== undefined ? Math.max(0, expiresAt * 10 - nowDeciSeconds) : 0;
    const isExpiring = expiresAt !== undefined && Math.floor(remaining / 10) <= EXPIRING_THRESHOLD_SECONDS;
    const progressPercent = (remaining / TOTP_DEFAULT_SETTINGS.periodLength) * 10;

    const copyToClipboard = async () => {
        if (!code) return;
        navigator.clipboard.writeText(code).then(() => window.close());
    };

    const injectTotp = async () => {
        if (!code || !context?.injection) return;

        await context.injection.injectTotp(code);
        window.close();
    };

    return hasSecret || !!totp?.show ? (
        <UIGroup title='MFA Code'>
            {hasSecret ? (
                <>
                    <div className={classes.codeBox}>
                        {code ? (
                            <>
                                <div className={`${classes.code} ${isExpiring ? classes.expiring : ''}`}>
                                    <span>{code.slice(0, 3)}</span>
                                    <span>{code.slice(3)}</span>
                                </div>
                                <div className={classes.progressTrack}>
                                    <div
                                        className={`${classes.progressBar} ${isExpiring ? classes.expiring : ''}`}
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className={classes.skeleton} aria-label='Calculating code'>
                                <div className={classes.skeletonCode} />
                                <div className={classes.skeletonBar} />
                            </div>
                        )}
                    </div>
                    <div className={classes.buttonRow}>
                        <input
                            type='button'
                            value={showInject ? 'Copy' : 'Copy to clipboard'}
                            disabled={!code}
                            onClick={copyToClipboard}
                            className={showInject ? `${classes.button} ${classes.buttonSmall}` : classes.button}
                        />
                        {showInject ? <input
                            ref={injectButton}
                            type='button'
                            value='Inject'
                            disabled={!code}
                            autoFocus={focusInject}
                            onClick={injectTotp}
                            className={`${classes.button} ${classes.buttonSmall}`}
                        /> : <></>
                        }
                    </div>
                </>
            ) : (
                <>
                    <p className={classes.info}>Please configure an <pre>otpauth://</pre> url or TOTP secret.</p>
                    <div className={classes.wrapper}>
                        <div className={classes.inputLine}>
                            <ValidatedInput label='Secret:' validate={validateSecret} onSelectValue={value => totp?.setSecret(value)} />
                        </div>
                    </div>
                </>
            )
            }
        </UIGroup >
    ) : (<></>);
};
