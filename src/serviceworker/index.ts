import { addRequestHandler, handleRequest } from '../internalapi/handler';
import { GetPasswordHashRequest, GetPasswordHashResponse, KeepAliveRequest, KeepAliveResponse, OpenPopupRequest, OpenPopupResponse, StorePasswordHashRequest, StorePasswordHashResponse } from '../internalapi/types';
import { handleGetPasswordHash, handleKeepAlive, handleStorePasswordHash } from './storage';


chrome.webNavigation.onCompleted.addListener(e => {
    if (e.url.substr(0, 8) !== 'https://' || e.frameId) {
        return;
    }
    chrome.scripting.executeScript({
        files: ['scriptinjections/popuphook.js'],
        target: {tabId: e.tabId}
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) =>
    handleRequest(message, sendResponse, sender)
);

addRequestHandler<GetPasswordHashRequest, GetPasswordHashResponse>('getPasswordHash', handleGetPasswordHash, true);
addRequestHandler<StorePasswordHashRequest, StorePasswordHashResponse>('storePasswordHash', handleStorePasswordHash, true);
addRequestHandler<KeepAliveRequest, KeepAliveResponse>('keepAlive', handleKeepAlive);

addRequestHandler<OpenPopupRequest, OpenPopupResponse>('openPopup', () => {
    (chrome.action as any).openPopup();
    return { type: 'openPopup' };
});

