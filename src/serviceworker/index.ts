import { addRequestHandler, handleRequest } from '../internalapi/handler';
import { OpenPopupRequest, OpenPopupResponse } from '../internalapi/types';
import { action, runtime, scripting, webNavigation } from '../lib/browsercompat';
import {} from './derivedpassword';
import {} from './storage';

webNavigation.onCompleted.addListener(e => {
    if (e.url.substring(0, 8) !== 'https://' || e.frameId) {
        return;
    }
    scripting.executeScript({
        files: ['contentscript.js'],
        target: {tabId: e.tabId}
    });
});

runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleRequest(message, sendResponse, sender);
    return true;
});

addRequestHandler<OpenPopupRequest, OpenPopupResponse>('openPopup', async () => {
    if (typeof (action as any).openPopup === 'function') {
        (action as any).openPopup();
    }
    return { type: 'openPopup' };
});
