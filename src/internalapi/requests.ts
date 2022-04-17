import { GetPasswordHashRequest, GetPasswordHashResponse, KeepAliveRequest, KeepAliveResponse, KeepAliveSource, OpenPopupRequest, OpenPopupResponse, Request, Response, StorePasswordHashRequest, StorePasswordHashResponse } from './types';


export const EXTENSION_ID = 'plnponcbnkhnjaopjjgagpkameffpllm';
export const EXTENSION_URL = 'chrome-extension://' + EXTENSION_ID;


const sendRequest = <RequestT extends Request, ResponseT extends Response> (request: RequestT): Promise<ResponseT> => new Promise(resolve =>
    chrome.runtime.sendMessage(EXTENSION_ID, request, response => {
        resolve(response);
    }));

export const sendKeepAlive = (from: KeepAliveSource = 'popup') =>
    sendRequest<KeepAliveRequest, KeepAliveResponse>({
        type: 'keepAlive',
        from: from
    });

export const openExtensionPopup = () =>
    sendRequest<OpenPopupRequest, OpenPopupResponse>({ type: 'openPopup' });

export const getPasswordHash = () => 
    sendRequest<GetPasswordHashRequest, GetPasswordHashResponse>({ type: 'getPasswordHash' });

export const storePasswordHash = (passwordHash: string|undefined, ttl?: number) =>
    sendRequest<StorePasswordHashRequest, StorePasswordHashResponse>({
        type: 'storePasswordHash',
        passwordHash: passwordHash,
        passwordHashTtl: ttl
    });

