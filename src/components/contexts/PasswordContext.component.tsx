import { createContext, useContext, useEffect, useState } from 'react';
import { getPasswordHash, storePasswordHash as doStorePasswordHash } from '../../internalapi/requests';
import { deriveMasterEntropy, MasterEntropy } from '../../lib/derivation';
import { PasswordChecksumContext } from './PasswordChecksumContext.component';


export interface IPasswordContext {
    derivationEntropy?: MasterEntropy;
    expiresAt?: number;
    correct: boolean;
    set: (password: string) => void;
    clear: () => void;
}

export const PASSWORD_TTL = 180;

export const PasswordContext = createContext<IPasswordContext|undefined>(undefined);

const matchesChecksum = (passwordHash?: string, checksum?: string): boolean => {
    return checksum === undefined || passwordHash?.substr(0, 2) === checksum;
};

const storePasswordHash = async (derivationEntropy?: MasterEntropy) => {
    await doStorePasswordHash(derivationEntropy, derivationEntropy ? PASSWORD_TTL : undefined);
};

type Props = {
    children: any;
};
export const PasswordContextProvider: React.FC<Props> = ({children}) => {
    const checksum = useContext(PasswordChecksumContext);
    const [ derivationEntropy, setDerivationEntropy ] = useState<MasterEntropy|undefined>();
    const [ passwordExpires, setPasswordExpiresAt ] = useState<number|undefined>();
    const [ isInitial, setInitial ] = useState<boolean>(true);

    const setPassword = async (password: string) => {
        if (password.length === 0) {
            return;
        }

        const entropy = await deriveMasterEntropy(password);
        setDerivationEntropy(entropy);
        
        if (matchesChecksum(entropy.legacyDerivationInput, checksum?.passwordChecksum)) {
            storePasswordHash(entropy);
        }
    };

    useEffect(() => {
        if (isInitial && derivationEntropy === undefined) {
            getPasswordHash().then(response => {
                setDerivationEntropy(response.entropy);
                setPasswordExpiresAt(response.expiresAt);
                setInitial(false);
            });
        }
    }, [isInitial, derivationEntropy]);

    return (
        <PasswordContext.Provider value={{
            derivationEntropy: derivationEntropy,
            expiresAt: passwordExpires,
            set: setPassword,
            correct: matchesChecksum(derivationEntropy?.legacyDerivationInput, checksum?.passwordChecksum),
            clear: () => {
                setDerivationEntropy(undefined);
                setPasswordExpiresAt(undefined);
                storePasswordHash(undefined);
            }
        }}>
            {children}
        </PasswordContext.Provider>
    );
};
