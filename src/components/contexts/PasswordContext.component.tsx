import { createContext, useContext, useEffect, useState } from 'react';
import { getPasswordHash, storePasswordHash as doStorePasswordHash } from '../../internalapi/requests';
import { hashPassword } from '../../lib/derivation';
import { StorageContext } from './StorageContext.component';


export interface IPasswordContext {
    hash?: string;
    expiresAt?: number;
    correct: boolean;
    set: (password: string) => void;
    clear: () => void;
}

export const PASSWORD_TTL = 300;

export const PasswordContext = createContext<IPasswordContext|undefined>(undefined);

const matchesChecksum = (passwordHash?: string, checksum?: string): boolean => {
    return checksum === undefined || passwordHash?.substr(0, 2) === checksum;
};

const storePasswordHash = async (passwordHash: string|undefined) => {
    await doStorePasswordHash(passwordHash, passwordHash ? PASSWORD_TTL : undefined);
};

type Props = {
    children: any;
};
export const PasswordContextProvider: React.FC<Props> = ({children}) => {
    const storage = useContext(StorageContext);
    const [ passwordHash, setPasswordHash ] = useState<string>();
    const [ passwordExpires, setPasswordExpiresAt ] = useState<number|undefined>();
    const [ isInitial, setInitial ] = useState<boolean>(true);

    const setPassword = (password: string) => {
        if (password.length === 0) {
            return;
        }

        let hash = hashPassword(password);
        setPasswordHash(hash);
        
        if (matchesChecksum(hash, storage.passwordChecksum)) {
            storePasswordHash(hash);
        }
    };

    useEffect(() => {
        if (isInitial && passwordHash === undefined) {
            getPasswordHash().then(response => {
                setPasswordHash(response.passwordHash || undefined);
                setPasswordExpiresAt(response.expiresAt);
                setInitial(false);
            });
        }
    }, [isInitial, passwordHash]);

    return (
        <PasswordContext.Provider value={{
            hash: passwordHash,
            expiresAt: passwordExpires,
            set: setPassword,
            correct: matchesChecksum(passwordHash, storage.passwordChecksum),
            clear: () => {
                setPasswordHash(undefined);
                setPasswordExpiresAt(undefined);
                storePasswordHash(undefined);
            }
        }}>
            {children}
        </PasswordContext.Provider>
    );
};
