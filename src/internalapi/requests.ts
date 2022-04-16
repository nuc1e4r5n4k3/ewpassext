import { GetPasswordHashRequest, GetPasswordHashResponse, KeepAliveRequest, KeepAliveResponse, OpenPopupRequest, OpenPopupResponse, Request, Response, StorePasswordHashRequest, StorePasswordHashResponse } from './types';


export const EXTENSION_ID = 'plnponcbnkhnjaopjjgagpkameffpllm';


const sendRequest = <RequestT extends Request, ResponseT extends Response> (request: RequestT): Promise<ResponseT> => new Promise(resolve =>
    chrome.runtime.sendMessage(EXTENSION_ID, request, response => {
        resolve(response);
    }));

export const sendKeepAlive = () =>
    sendRequest<KeepAliveRequest, KeepAliveResponse>({ type: 'keepAlive' });

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

