import { createContext, useEffect, useState } from 'react';
import { load, store } from '../../lib/storage';


export interface IPasswordChecksumContext {
    passwordChecksum?: string;
    setPasswordChecksum?: (checksum?: string) => void;
}

export const PasswordChecksumContext = createContext<IPasswordChecksumContext>({
    passwordChecksum: undefined
});

type Props = {
    children: any;
};
export const PasswordChecksumProvider: React.FC<Props> = ({children}) => {
    const [ passwordChecksum, setPasswordChecksum ] = useState<string|null|undefined>(null);

    useEffect(() => {
        (async () => {
            if (passwordChecksum === null) {
                setPasswordChecksum(await load('passwordChecksum'));
            } else {
                store('passwordChecksum', passwordChecksum);
            }
        })();
    }, [passwordChecksum]);

    return (
        <PasswordChecksumContext.Provider value={{
            passwordChecksum: passwordChecksum || undefined,
            setPasswordChecksum: setPasswordChecksum
        }}>
            {children}
        </PasswordChecksumContext.Provider>
    );
};
