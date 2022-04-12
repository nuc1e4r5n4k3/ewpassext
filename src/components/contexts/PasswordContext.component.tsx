import { createContext, useContext, useEffect, useState } from 'react';
import sha256 from 'sha256';
import { SEED_PREFIX } from '../../lib/derivation';
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

type Props = {
    children: any;
};
export const PasswordContextProvider: React.FC<Props> = ({children}) => {
    const storage = useContext(StorageContext);
    const [ passwordHash, setPasswordHash ] = useState<string>();
    const [ isInitial, setInitial ] = useState<boolean>(true);

    const setPassword = (password: string) => {
        const hash = sha256(SEED_PREFIX + password);
        setPasswordHash(hash);
    };

    useEffect(() => {
        if (isInitial && passwordHash === undefined) {
            chrome.runtime.sendMessage({
                type: 'getPasswordHash'
            }, (response) => {
                setPasswordHash(response.passwordHash);
                setInitial(false);
            });
        }
    }, [isInitial, passwordHash]);

    useEffect(() => {
        if (matchesChecksum(passwordHash, storage.passwordChecksum)) {
            chrome.runtime.sendMessage({
                type: 'storePasswordHash',
                passwordHash: passwordHash,
                passwordHashTtl: PASSWORD_TTL
            })
        }
    }, [passwordHash, storage]);

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
