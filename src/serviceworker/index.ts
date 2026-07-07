import { addRequestHandler, handleRequest } from '../internalapi/handler';
import { OpenPopupRequest, OpenPopupResponse } from '../internalapi/types';
import { action, alarms, runtime, scripting, storage, webNavigation } from '../lib/browsercompat';
import {} from './storage';

const PASSWORD_HASH_KEY = 'passwordHash';
const CLEAR_PASSWORD_ALARM = 'clearPassword';

alarms.onAlarm.addListener(async alarm => {
    if (alarm.name === CLEAR_PASSWORD_ALARM) {
        await storage.session.remove(PASSWORD_HASH_KEY);
    }
});

webNavigation.onCompleted.addListener(e => {
    if (e.url.substring(0, 8) !== 'https://' || e.frameId) {
        return;
    }
    scripting.executeScript({
        files: ['scriptinjections/popuphook.js'],
        target: {tabId: e.tabId}
    });
});

runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleRequest(message, sendResponse, sender);
    return true;
});

addRequestHandler<OpenPopupRequest, OpenPopupResponse>('openPopup', async () => {
    (action as any).openPopup();
    return { type: 'openPopup' };
});
