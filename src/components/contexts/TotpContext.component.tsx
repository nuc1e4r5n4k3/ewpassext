import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ConfigurationContext } from './ConfigurationContext.component';
import { PasswordContext } from './PasswordContext.component';
import { decryptTotpSecret, encryptTotpSecret, generateTotp, parseTotpConfiguratonString, TOTP_DEFAULT_SETTINGS, totpPeriodInfo } from '../../lib/totp';

export interface ITotpContext {
    code?: string;
    expiresAt?: number;
    setSecret: (input: string | undefined) => void;
}

export const TotpContext = createContext<ITotpContext | undefined>(undefined);

type Props = {
    children: any;
};

const secretFromConfigString = (config?: string): Uint8Array | undefined => {
    if (config === undefined) return undefined;

    try {
        return parseTotpConfiguratonString(config);
    } catch {
        return undefined;
    }
};

export const TotpContextProvider: React.FC<Props> = ({ children }) => {
    const configurationContext = useContext(ConfigurationContext);
    const passwordContext = useContext(PasswordContext);

    const storedSecret = configurationContext?.currentDomainConfig?.totpSecret;
    const domain = configurationContext?.currentDomain;
    const entropy = passwordContext?.derivationEntropy;

    const [code, setCode] = useState<string | undefined>();
    const [expiresAt, setExpiresAt] = useState<number | undefined>();

    const secretRef = useRef<Uint8Array | undefined>(undefined);
    const periodRef = useRef<number | undefined>(undefined);


    const recompute = useCallback(async () => {
        const secret = secretRef.current;
        if (secret === undefined) {
            setCode(undefined);
            setExpiresAt(undefined);
            return;
        }

        const now = Math.floor(Date.now() / 1000);
        setExpiresAt(totpPeriodInfo(now).endsUnixSeconds);
        setCode(await generateTotp(secret, now));
    }, []);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            secretRef.current = await (async () => {
                if (!entropy || !domain || !storedSecret) return undefined;

                try {
                    secretRef.current = await decryptTotpSecret(storedSecret, domain, entropy);
                } catch {
                    secretRef.current = undefined;
                }
            })();
            if (!cancelled) await recompute();
        })();

        return () => { cancelled = true; };
    }, [entropy, domain, storedSecret, recompute]);

    useEffect(() => {
        if (secretRef.current === undefined) {
            return;
        }

        const timer = setInterval(() => {
            const period = totpPeriodInfo().current;
            if (period === periodRef.current)
                return;

            periodRef.current = period;
            recompute();
        }, 1000);

        return () => clearInterval(timer);
    }, [recompute, code !== undefined]);

    const setSecret = useCallback((input: string | undefined) => {
        const currentDomainConfig = configurationContext?.currentDomainConfig;
        const setDomainConfig = configurationContext?.setConfigForCurrentDomain;

        if (!currentDomainConfig || !setDomainConfig || !entropy || !domain) {
            return;
        }

        const setConfig = (secret?: string) => setDomainConfig({ ...currentDomainConfig, totpSecret: secret });

        const secret = secretFromConfigString(input);
        if (secret !== undefined) {
            encryptTotpSecret(secret, domain, entropy).then(setConfig);
        } else {
            setConfig(undefined);
        }
    }, [configurationContext, entropy, domain]);

    return (
        <TotpContext.Provider value={{
            code: code,
            expiresAt: expiresAt,
            setSecret: setSecret
        }}>
            {children}
        </TotpContext.Provider>
    );
};
