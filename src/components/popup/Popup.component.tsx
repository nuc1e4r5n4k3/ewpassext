import classes from './Popup.module.scss';
import { PageContextProvider } from '../contexts/PageContext.component';
import { PasswordContextProvider } from '../contexts/PasswordContext.component';
import { StorageContextProvider } from '../contexts/StorageContext.component';
import { DomainPicker } from '../domainpicker/DomainPicker.component';
import { MasterPassword } from '../masterpassword/MasterPassword.component';
import { DerivationOptions } from '../derivationoptions/DerivationOptions.component';
import { PasswordGenerator } from '../passwordgenerator/PasswordGenerator.component';


export const Popup: React.FC = () => {
    return (
        <StorageContextProvider>
            <PageContextProvider>
                <PasswordContextProvider>
                    <div className={classes.Popup}>
                        <MasterPassword />
                        <DomainPicker/>
                        <DerivationOptions />
                        <PasswordGenerator />
                    </div>
                </PasswordContextProvider>
            </PageContextProvider>
        </StorageContextProvider>
    );
};
