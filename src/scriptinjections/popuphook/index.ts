import { openExtensionPopup } from '../../internalapi/requests';
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

document.addEventListener('focus', (event) => {
    if (event.target && (event.target as any).type === 'password') {
        tryOpenPopup(event.target as HTMLInputElement);
    }
}, true);
