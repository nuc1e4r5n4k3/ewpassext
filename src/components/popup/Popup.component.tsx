import classes from './Popup.module.scss';
import { PasswordChecksumProvider } from '../contexts/PasswordChecksumContext.component';
import { PageContextProvider } from '../contexts/PageContext.component';
import { PasswordContext, PasswordContextProvider } from '../contexts/PasswordContext.component';
import { ConfigurationContext, ConfigurationContextProvider } from '../contexts/ConfigurationContext.component';
import { DomainPicker } from '../domainpicker/DomainPicker.component';
import { MasterPassword } from '../masterpassword/MasterPassword.component';
import { DerivationOptions } from '../derivationoptions/DerivationOptions.component';
import { PasswordGenerator } from '../passwordgenerator/PasswordGenerator.component';
import { useState, useRef, useEffect, useContext } from 'react';
import { BackupOptions } from '../backupoptions/BackupOptions.component';
import { UIGroup } from '../uiutils/UIGroup.component';


const PopupComponent: React.FC = () => {
    const storage = useContext(ConfigurationContext);
    const passwordContext = useContext(PasswordContext);
    const [showBackupOptions, setShowBackupOptions] = useState<boolean>(false);
    const pageBottomRef = useRef<HTMLDivElement>(null);

    const showBackupOptionsTrigger = () => {
        setShowBackupOptions(true);
        setTimeout(() => pageBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 20);
    };

    return (
        <div className={classes.Popup}>
            <MasterPassword />
            {storage.totalConfigurations !== undefined ? <>
                <DomainPicker />
                <DerivationOptions showBackupOptions={showBackupOptionsTrigger} />
                <PasswordGenerator />
                {showBackupOptions ? (
                    <BackupOptions />
                ) : <></>}
            </> : <>
                <UIGroup title='Loading configurations'>
                    {passwordContext?.derivationEntropy ? `Please wait one moment...` : `You can enter your password while waiting`}
                </UIGroup>
            </>}
            <div ref={pageBottomRef} />
        </div>
    );
};

export const Popup: React.FC = () => {
    return (
        <PasswordChecksumProvider>
            <PageContextProvider>
                <PasswordContextProvider>
                    <ConfigurationContextProvider>
                        <PopupComponent />
                    </ConfigurationContextProvider>
                </PasswordContextProvider>
            </PageContextProvider>
        </PasswordChecksumProvider>
    );
};
