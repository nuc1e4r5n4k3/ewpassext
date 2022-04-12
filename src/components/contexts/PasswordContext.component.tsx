import { createContext, useContext, useState } from 'react';
import sha256 from 'sha256';
import { SEED_PREFIX } from '../../lib/derivation';
import { StorageContext } from './StorageContext.component';


export interface IPasswordContext {
    hash?: string;
    correct: boolean;
    set: (password: string) => void;
    clear: () => void;
}


export const PasswordContext = createContext<IPasswordContext|undefined>(undefined);

type Props = {
    children: any;
};
export const PasswordContextProvider: React.FC<Props> = ({children}) => {
    const storage = useContext(StorageContext);
    const [ passwordHash, setPasswordHash ] = useState<string>();

    const setPassword = (password: string) => {
        const hash = sha256(SEED_PREFIX + password);
        setPasswordHash(hash);
    };

    return (
        <PasswordContext.Provider value={{
            hash: passwordHash,
            set: setPassword,
            correct: storage.passwordChecksum === undefined || passwordHash?.substr(0, 2) === storage.passwordChecksum,
            clear: () => setPasswordHash(undefined)
        }}>
            {children}
        </PasswordContext.Provider>
    );
};
