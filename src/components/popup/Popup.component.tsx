import classes from './Popup.module.scss';
import { PasswordChecksumProvider } from '../contexts/PasswordChecksumContext.component';
import { PageContextProvider } from '../contexts/PageContext.component';
import { PasswordContextProvider } from '../contexts/PasswordContext.component';
import { ConfigurationContextProvider } from '../contexts/ConfigurationContext.component';
import { DomainPicker } from '../domainpicker/DomainPicker.component';
import { MasterPassword } from '../masterpassword/MasterPassword.component';
import { DerivationOptions } from '../derivationoptions/DerivationOptions.component';
import { PasswordGenerator } from '../passwordgenerator/PasswordGenerator.component';
import { useState, useRef, useEffect } from 'react';
import { BackupOptions } from '../backupoptions/BackupOptions.component';


export const Popup: React.FC = () => {
    const [showBackupOptions, setShowBackupOptions] = useState<boolean>(false);
    const pageBottomRef = useRef<HTMLDivElement>(null);

    const showBackupOptionsTrigger = () => {
        setShowBackupOptions(true);
        setTimeout(() => pageBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 20);
    };

    return (
        <PasswordChecksumProvider>
            <PageContextProvider>
                <PasswordContextProvider>
                    <ConfigurationContextProvider>
                        <div className={classes.Popup}>
                            <MasterPassword />
                            <DomainPicker />
                            <DerivationOptions showBackupOptions={showBackupOptionsTrigger} />
                            <PasswordGenerator />
                            {showBackupOptions ? (
                                <BackupOptions />
                            ) : <></>}
                            <div ref={pageBottomRef} />
                        </div>
                    </ConfigurationContextProvider>
                </PasswordContextProvider>
            </PageContextProvider>
        </PasswordChecksumProvider>
    );
};
