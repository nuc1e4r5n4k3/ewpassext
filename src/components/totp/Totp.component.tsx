import React, { useContext, useEffect, useState } from 'react';
import { ConfigurationContext } from '../contexts/ConfigurationContext.component';
import { TotpContext } from '../contexts/TotpContext.component';
import { UIGroup } from '../uiutils/UIGroup.component';
import { parseTotpConfiguratonString } from '../../lib/totp';
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

export const Totp: React.FC = () => {
    const storage = useContext(ConfigurationContext);
    const totp = useContext(TotpContext);

    const hasSecret = !!storage.currentDomainConfig?.totpSecret;

    return hasSecret || !!totp?.show ? (
        <UIGroup title='MFA Code'>
            {hasSecret ? (
                totp?.code ? (
                    <div className={classes.code}>{totp.code}</div>
                ) : (<></>)
            ) : (
                <>
                    <p className={classes.info}>Please configure an <pre>otpauth://</pre> url or TOTP secret.</p>
                    <div className={classes.wrapper}>
                        <div className={classes.inputLine}>
                            <ValidatedInput label='Secret:' validate={validateSecret} onSelectValue={value => totp?.setSecret(value)} />
                        </div>
                    </div>
                </>
            )}
        </UIGroup>
    ) : (<></>);
};
