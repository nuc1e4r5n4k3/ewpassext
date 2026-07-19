import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ConfigurationContext } from './ConfigurationContext.component';
import { PasswordContext } from './PasswordContext.component';
import { decryptTotpSecret, encryptTotpSecret, generateTotp, parseTotpConfiguratonString, TOTP_DEFAULT_SETTINGS, totpPeriodInfo } from '../../lib/totp';

export interface ITotpContext {
    show: boolean;
    code?: string;
    expiresAt?: number;
    setSecret: (input: string | undefined) => void;
    setShowInput: (b: boolean) => void;
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
    const storage = useContext(ConfigurationContext);
    const passwordContext = useContext(PasswordContext);

    const storedSecret = storage?.currentDomainConfig?.totpSecret;
    const domain = storage?.currentDomain;
    const entropy = passwordContext?.derivationEntropy;

    const [show, setShow] = useState<boolean>(false);
    const [showInput, setshowInput] = useState<boolean>(false);
    const [secret, setSecret] = useState<Uint8Array | undefined>();
    const [code, setCode] = useState<string | undefined>();
    const [expiresAt, setExpiresAt] = useState<number | undefined>();

    const periodRef = useRef<number | undefined>(undefined);


    const recompute = useCallback(async () => {
        if (secret === undefined) {
            setCode(undefined);
            setExpiresAt(undefined);
            return;
        }

        const now = Math.floor(Date.now() / 1000);
        setExpiresAt(totpPeriodInfo(now).endsUnixSeconds);
        setCode(await generateTotp(secret, now));
    }, [secret]);

    useEffect(() => {
        setShow(!!storedSecret || showInput)
    }, [showInput, storedSecret])

    useEffect(() => {
        setshowInput(false);
    }, [domain]);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            setSecret(await (async () => {
                if (!entropy || !domain || !storedSecret) return undefined;

                try {
                    return await decryptTotpSecret(storedSecret, domain, entropy);
                } catch {
                    return undefined;
                }
            })());
            if (!cancelled) await recompute();
        })();

        return () => { cancelled = true; };
    }, [entropy, domain, storedSecret]);

    useEffect(() => {
        if (secret === undefined) {
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
    }, [code !== undefined, secret]);

    const setAndStoreSecret = useCallback((input: string | undefined) => {
        const currentDomainConfig = storage?.currentDomainConfig;
        const setDomainConfig = storage?.setConfigForCurrentDomain;

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
    }, [storage, entropy, domain]);

    return (
        <TotpContext.Provider value={{
            show: show,
            code: code,
            expiresAt: expiresAt,

            setSecret: setAndStoreSecret,
            setShowInput: setshowInput
        }}>
            {children}
        </TotpContext.Provider>
    );
};
