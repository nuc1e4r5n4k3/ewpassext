import { GetPasswordHashRequest, GetPasswordHashResponse, StorePasswordHashRequest, StorePasswordHashResponse } from '../internalapi/types';
import { getServiceWorkerContext } from './context';


export const isPasswordHashCached = () =>
    !!getServiceWorkerContext().passwordHash;

export const handleStorePasswordHash = (request: StorePasswordHashRequest): StorePasswordHashResponse => {
    let ctx = getServiceWorkerContext();
    ctx.passwordHash = request.passwordHash;

    if (ctx.passwordHashTimer !== undefined) {
        clearTimeout(ctx.passwordHashTimer);
    }

    if (ctx.passwordHash !== undefined && request.passwordHashTtl) {
        ctx.passwordHashTimer = setTimeout(() => {
            ctx.passwordHash = undefined;
            ctx.passwordHashTimer = undefined;
        }, request.passwordHashTtl * 1000);
    }
    return { type: 'storePasswordHash' };
};

export const handleGetPasswordHash = (request: GetPasswordHashRequest): GetPasswordHashResponse => ({
    type: 'getPasswordHash',
    passwordHash: getServiceWorkerContext().passwordHash
});
