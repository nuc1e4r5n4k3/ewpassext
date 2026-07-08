import { getDerivedPassword, getPasswordHash, openExtensionPopup } from '../../internalapi/requests';
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
    const response = await getDerivedPassword();
    if (response.password !== undefined && !input.value) {
        setInputValue(input, response.password);
        return true;
    }
    return false;
};


getInjectionContext().injectPassword = (password: string) => {
    for (let input of new DocumentSearcher().getPasswordInputsInDocumentAndIFrames()) {
        input.value = password;
    }
};

document.addEventListener('focus', async (event) => {
    if (event.target && (event.target as any).type === 'password') {
        const input = event.target as HTMLInputElement;
        if (!await autoInjectPassword(input)) {
            tryOpenPopup(input);
        }
    }
}, true);
