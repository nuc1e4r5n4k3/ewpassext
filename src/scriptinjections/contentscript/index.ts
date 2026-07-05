import { getPasswordHash, openExtensionPopup } from '../../internalapi/requests';
import { derivePassword, getDomainId } from '../../lib/derivation';
import { DocumentSearcher } from '../../lib/documentsearcher';
import { IDomainConfig, load } from '../../lib/storage';
import { getInjectionContext } from '../context';


const tryOpenPopup = (input: HTMLInputElement) => {
    let ctx = getInjectionContext();
    const now = new Date().getTime();
    const last = ctx.lastPopupTime || 0;

    if (input.value === '' && now - last > 3000) {
        ctx.lastPopupTime = now;
        openExtensionPopup();
    }
};

const autoInjectPassword = async (input: HTMLInputElement) => {
    const passwordHashResponse = await getPasswordHash();
    if (!passwordHashResponse.passwordHash) {
        return;
    }

    const domain = window.location.hostname;
    const allConfigs = await load('metadata') as { [domainId: string]: IDomainConfig };
    if (!allConfigs) {
        return;
    }

    const domainId = getDomainId(passwordHashResponse.passwordHash, domain);
    const config = allConfigs[domainId];

    if (!config) {
        return;
    }

    const password = derivePassword(passwordHashResponse.passwordHash, domain, config.passwordLength, config.passwordIteration, config.useSpecialCharacters, config.allowExtraLongPasswords);
    
    if (!input.value) {
        input.value = password;
    }
};


getInjectionContext().injectPassword = (password: string) => {
    for (let input of new DocumentSearcher().getPasswordInputsInDocumentAndIFrames()) {
        input.value = password;
    }
};

document.addEventListener('focus', async (event) => {
    if (event.target && (event.target as any).type === 'password') {
        const input = event.target as HTMLInputElement;
        await autoInjectPassword(input);
        tryOpenPopup(input);
    }
}, true);
