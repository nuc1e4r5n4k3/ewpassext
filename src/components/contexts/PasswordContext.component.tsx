import { createContext, useContext, useEffect, useState } from 'react';
import { getPasswordHash, sendKeepAlive, storePasswordHash as doStorePasswordHash } from '../../internalapi/requests';
import { hashPassword } from '../../lib/derivation';
import { StorageContext } from './StorageContext.component';


export interface IPasswordContext {
    hash?: string;
    correct: boolean;
    set: (password: string) => void;
    clear: () => void;
}

export const PASSWORD_TTL = 300;

export const PasswordContext = createContext<IPasswordContext|undefined>(undefined);

const matchesChecksum = (passwordHash?: string, checksum?: string): boolean => {
    return checksum === undefined || passwordHash?.substr(0, 2) === checksum;
};

const storePasswordHash = async (passwordHash: string|undefined) =>
    await doStorePasswordHash(passwordHash, passwordHash ? PASSWORD_TTL : undefined);

type Props = {
    children: any;
};
export const PasswordContextProvider: React.FC<Props> = ({children}) => {
    const storage = useContext(StorageContext);
    const [ passwordHash, setPasswordHash ] = useState<string>();
    const [ isInitial, setInitial ] = useState<boolean>(true);

    const setPassword = (password: string) => {
        setPasswordHash(hashPassword(password));
    };

    useEffect(() => {
        if (isInitial && passwordHash === undefined) {
            getPasswordHash().then(response => {
                setPasswordHash(response.passwordHash || undefined);
                setInitial(false);
            });
        }
    }, [isInitial, passwordHash]);

    useEffect(() => {
        if (matchesChecksum(passwordHash, storage.passwordChecksum) || (passwordHash === undefined && !isInitial)) {
            storePasswordHash(passwordHash);
        }
    }, [isInitial, passwordHash, storage]);

    useEffect(() => {
        let receivedResponse = true;
        const timer = setInterval(async () => {
            if (receivedResponse) {
                receivedResponse = false;
                const response = await sendKeepAlive();
                receivedResponse = !passwordHash || response.cacheState;
            } else if (passwordHash) {
                await storePasswordHash(passwordHash);
                receivedResponse = true;
            }
        }, 2000);
        return () => clearInterval(timer);
    })

    return (
        <PasswordContext.Provider value={{
            hash: passwordHash,
            set: setPassword,
            correct: matchesChecksum(passwordHash, storage.passwordChecksum),
            clear: () => setPasswordHash(undefined)
        }}>
            {children}
        </PasswordContext.Provider>
    );
};
