import classes from './Popup.module.scss';
import { PasswordChecksumProvider } from '../contexts/PasswordChecksumContext.component';
import { PageContextProvider } from '../contexts/PageContext.component';
import { PasswordContextProvider } from '../contexts/PasswordContext.component';
import { ConfigurationContextProvider } from '../contexts/ConfigurationContext.component';
import { DomainPicker } from '../domainpicker/DomainPicker.component';
import { MasterPassword } from '../masterpassword/MasterPassword.component';
import { DerivationOptions } from '../derivationoptions/DerivationOptions.component';
import { PasswordGenerator } from '../passwordgenerator/PasswordGenerator.component';


export const Popup: React.FC = () => {
    return (
        <PasswordChecksumProvider>
            <PageContextProvider>
                <PasswordContextProvider>
                    <ConfigurationContextProvider>
                        <div className={classes.Popup}>
                            <MasterPassword />
                            <DomainPicker/>
                            <DerivationOptions />
                            <PasswordGenerator />
                        </div>
                    </ConfigurationContextProvider>
                </PasswordContextProvider>
            </PageContextProvider>
        </PasswordChecksumProvider>
    );
};
