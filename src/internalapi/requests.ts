import { runtime } from '../lib/browsercompat';
import { GetPasswordHashRequest, GetPasswordHashResponse, KeepAliveRequest, KeepAliveResponse, KeepAliveSource, OpenPopupRequest, OpenPopupResponse, Request, Response, StorePasswordHashRequest, StorePasswordHashResponse } from './types';


export const EXTENSION_ID = chrome !== undefined ? 'plnponcbnkhnjaopjjgagpkameffpllm' : 'a75ac207-c1c3-4ad8-8f4d-7fea28eaacd4';
export const EXTENSION_URL = (chrome !== undefined ? 'chrome-extension://' : 'moz-extension://') + EXTENSION_ID;


const sendRequest = <RequestT extends Request, ResponseT extends Response> (request: RequestT): Promise<ResponseT> => new Promise(resolve =>
    runtime.sendMessage(EXTENSION_ID, request, response => {
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

