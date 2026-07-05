import { runtime } from '../lib/browsercompat';
import { on_chrome } from '../lib/browserdetect';
import { GetPasswordHashRequest, GetPasswordHashResponse, OpenPopupRequest, OpenPopupResponse, Request, Response, StorePasswordHashRequest, StorePasswordHashResponse } from './types';


export const EXTENSION_ID = on_chrome ? 'plnponcbnkhnjaopjjgagpkameffpllm' : 'bc45bfda-1f2a-4a0c-bf2c-94890812eebe';
export const EXTENSION_INTERNAL_ID = on_chrome ? EXTENSION_ID : '{6d1f30b1-2f6d-48f9-a01a-c32a0c27d12d}';
export const EXTENSION_URL = (on_chrome ? 'chrome-extension://' : 'moz-extension://') + EXTENSION_ID;


const sendRequest = <RequestT extends Request, ResponseT extends Response> (request: RequestT): Promise<ResponseT> => new Promise(resolve => {
    runtime.sendMessage(request, response => {
        resolve(response);
    })
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

