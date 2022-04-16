import { addRequestHandler, handleRequest } from '../internalapi/handler';
import { GetPasswordHashRequest, GetPasswordHashResponse, KeepAliveRequest, KeepAliveResponse, OpenPopupRequest, OpenPopupResponse, StorePasswordHashRequest, StorePasswordHashResponse } from '../internalapi/types';
import { handleGetPasswordHash, handleStorePasswordHash, isPasswordHashCached } from './storage';


chrome.webNavigation.onCompleted.addListener(e => {
    if (e.url.substr(0, 8) !== 'https://') {
        return;
    }
    chrome.scripting.executeScript({
        files: ['scriptinjections/popuphook.js'],
        target: {tabId: e.tabId}
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => handleRequest(message, sendResponse));

addRequestHandler<GetPasswordHashRequest, GetPasswordHashResponse>('getPasswordHash', handleGetPasswordHash);
addRequestHandler<StorePasswordHashRequest, StorePasswordHashResponse>('getPasswordHash', handleStorePasswordHash);

addRequestHandler<KeepAliveRequest, KeepAliveResponse>('keepAlive', () => ({
    type: 'keepAlive',
    cacheState: isPasswordHashCached()
}));

addRequestHandler<OpenPopupRequest, OpenPopupResponse>('openPopup', () => {
    (chrome.action as any).openPopup();
    return { type: 'openPopup' };
});

