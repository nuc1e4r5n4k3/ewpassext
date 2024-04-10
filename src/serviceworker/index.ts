import { addRequestHandler, handleRequest } from '../internalapi/handler';
import { GetPasswordHashRequest, GetPasswordHashResponse, KeepAliveRequest, KeepAliveResponse, OpenPopupRequest, OpenPopupResponse, StorePasswordHashRequest, StorePasswordHashResponse } from '../internalapi/types';
import { action, runtime, scripting, webNavigation } from '../lib/browsercompat';
import { handleGetPasswordHash, handleKeepAlive, handleStorePasswordHash } from './storage';


webNavigation.onCompleted.addListener(e => {
    if (e.url.substr(0, 8) !== 'https://' || e.frameId) {
        return;
    }
    scripting.executeScript({
        files: ['scriptinjections/popuphook.js'],
        target: {tabId: e.tabId}
    });
});

runtime.onMessage.addListener((message, sender, sendResponse) =>
    handleRequest(message, sendResponse, sender)
);

addRequestHandler<GetPasswordHashRequest, GetPasswordHashResponse>('getPasswordHash', handleGetPasswordHash, true);
addRequestHandler<StorePasswordHashRequest, StorePasswordHashResponse>('storePasswordHash', handleStorePasswordHash, true);
addRequestHandler<KeepAliveRequest, KeepAliveResponse>('keepAlive', handleKeepAlive);

addRequestHandler<OpenPopupRequest, OpenPopupResponse>('openPopup', () => {
    (action as any).openPopup();
    return { type: 'openPopup' };
});

