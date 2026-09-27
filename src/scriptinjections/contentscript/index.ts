import { getDerivedPassword, getTotpCode, openExtensionPopup } from '../../internalapi/requests';
import { DocumentSearcher } from '../../lib/documentsearcher';
import { getElementInputType, isPasswordField, singleControlInjectValue } from '../../lib/inputfieldtypes';
import { detectTotpField } from '../../lib/totpfielddetect';
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

const doAutoInject = async (input: HTMLInputElement, getValue: () => Promise<string | undefined>): Promise<boolean> => {
    if (input.value) return false;

    const value = await getValue();
    if (value !== undefined) {
        singleControlInjectValue(value, input);
        return true;
    }
    return false;
};

const autoInjectPassword = async (input: HTMLInputElement) =>
    await doAutoInject(input, async () => (await getDerivedPassword()).password);

const autoInjectTotp = async (input: HTMLInputElement) =>
    await doAutoInject(input, async () => (await getTotpCode()).code);


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


const handleInputSelected = async (target: HTMLElement) => {
    if (isPasswordField(target)) {
        const input = target as HTMLInputElement;
        if (!await autoInjectPassword(input)) {
            tryOpenPopup(input);
        }
        return;
    }

    const signal = detectTotpField(target);
    if (signal === 'autocomplete') {
        const input = target as HTMLInputElement;
        if (!await autoInjectTotp(input)) {
            tryOpenPopup(input);
        }
    } else if (signal === 'string') {
        tryOpenPopup(target as HTMLInputElement);
    }
};

document.addEventListener('focus', event => handleInputSelected(event.target as HTMLElement), true);

(() => {
    const element = new DocumentSearcher().getActiveInputInDocumentAndIFrames();
    if (element && element instanceof HTMLElement)
        handleInputSelected(element);
})();
