import { openExtensionPopup } from '../../internalapi/requests';
import { DocumentSearcher } from '../../lib/documentsearcher';
import { getInjectionContext } from '../context';
import { hookNewElements } from './hookinjector';


const tryOpenPopup = (input: HTMLInputElement) => {
    let ctx = getInjectionContext();
    const now = new Date().getTime();
    const last = ctx.lastPopupTime || 0;

    if (input.value === '' && now - last > 3000) {
        ctx.lastPopupTime = now;
        openExtensionPopup();
    }
};

const triggerInjection = () => {
    let ctx = getInjectionContext();

    if (ctx.injectionTimer)
        clearTimeout(ctx.injectionTimer);

    ctx.injectionTimer = setTimeout(() =>
        hookNewElements('onfocus', tryOpenPopup, new DocumentSearcher().getPasswordInputsInDocumentAndIFrames(), ctx.hookedInputs),
    100);
};


new MutationObserver(triggerInjection).observe(document, {
    subtree: true,
    childList: true
});
triggerInjection();
