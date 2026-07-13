import { runtime } from '../lib/browsercompat';
import { MasterEntropy } from '../lib/derivation';
import { GetDerivedPasswordRequest, GetDerivedPasswordResponse, GetPasswordHashRequest, GetPasswordHashResponse, OpenPopupRequest, OpenPopupResponse, Request, Response, StorePasswordHashRequest, StorePasswordHashResponse } from './types';


const sendRequest = <RequestT extends Request, ResponseT extends Response> (request: RequestT): Promise<ResponseT> => new Promise(resolve => {
    runtime.sendMessage(request, response => {
        resolve(response);
    })
});

export const openExtensionPopup = () =>
    sendRequest<OpenPopupRequest, OpenPopupResponse>({ type: 'openPopup' });

export const getPasswordHash = () => 
    sendRequest<GetPasswordHashRequest, GetPasswordHashResponse>({ type: 'getPasswordHash' });

export const getDerivedPassword = () => 
    sendRequest<GetDerivedPasswordRequest, GetDerivedPasswordResponse>({ type: 'getDerivedPassword' });

export const storePasswordHash = (entropy: MasterEntropy|undefined, ttl?: number) =>
    sendRequest<StorePasswordHashRequest, StorePasswordHashResponse>({
        type: 'storePasswordHash',
        entropy: entropy,
        passwordHashTtl: ttl
    });

