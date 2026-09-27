import { getDerivedPassword, openExtensionPopup } from '../../internalapi/requests';
import { DocumentSearcher } from '../../lib/documentsearcher';
import { getElementInputType, singleControlInjectValue } from '../../lib/inputfieldtypes';
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
        singleControlInjectValue(response.password, input);
        return true;
    }
    return false;
};


const context = getInjectionContext();

context.getActiveInputType = () => getElementInputType(new DocumentSearcher().getActiveInputInDocumentAndIFrames() || null);

context.injectPassword = (password: string) => {
    for (let input of new DocumentSearcher().getPasswordInputsInDocumentAndIFrames()) {
        singleControlInjectValue(password, input);
    }
};

context.injectTotp = (code: string) => {
    new DocumentSearcher().injectIntoActiveInputInDocumentAndIFrames(code, ['textinput', 'passwordinput'])
};

document.addEventListener('focus', async (event) => {
    if (event.target && (event.target as any).type === 'password') {
        const input = event.target as HTMLInputElement;
        if (!await autoInjectPassword(input)) {
            tryOpenPopup(input);
        }
    }
}, true);
