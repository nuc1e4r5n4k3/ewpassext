import { EXTENSION_URL } from '../internalapi/requests';
import { GetPasswordHashRequest, GetPasswordHashResponse, KeepAliveRequest, KeepAliveResponse, StorePasswordHashRequest, StorePasswordHashResponse } from '../internalapi/types';
import { getServiceWorkerContext } from './context';
import { tabs } from '../lib/browsercompat';


const openKeepAliveTab = () => {
    tabs.create({
        url: EXTENSION_URL + '/keepalivetab.html',
        active: false,
        pinned: true
    });
    getServiceWorkerContext().lastTabKeepAlive = new Date().getTime();
};

export const isPasswordHashCached = () =>
    !!getServiceWorkerContext().passwordHash;

const isKeepAliveTabActive = () => {
    let ctx = getServiceWorkerContext();
    return ctx.lastTabKeepAlive && new Date().getTime() - ctx.lastTabKeepAlive < 5000;
}

export const handleKeepAlive = (request: KeepAliveRequest): KeepAliveResponse => {
    const ctx = getServiceWorkerContext();
    const currentlyCached = !!ctx.passwordHash;

    if (request.from === 'keepAliveTab')
        ctx.lastTabKeepAlive = new Date().getTime();
    else if (currentlyCached && !isKeepAliveTabActive())
        openKeepAliveTab();

    return {
        type: 'keepAlive',
        cacheState: currentlyCached
    };
};

export const handleStorePasswordHash = (request: StorePasswordHashRequest): StorePasswordHashResponse => {
    let ctx = getServiceWorkerContext();
    const newPasswordHash = request.passwordHash ? request.passwordHash : null;
    
    if (!ctx.passwordHash && newPasswordHash && !isKeepAliveTabActive())
        openKeepAliveTab();

    ctx.passwordHash = newPasswordHash;

    if (ctx.passwordHashTimer !== undefined) {
        clearTimeout(ctx.passwordHashTimer);
    }

    if (ctx.passwordHash && request.passwordHashTtl) {
        ctx.passwordHashTimer = setTimeout(() => {
            ctx.passwordHash = null;
            ctx.passwordHashTimer = undefined;
        }, request.passwordHashTtl * 1000);
    }
    return { type: 'storePasswordHash' };
};

export const handleGetPasswordHash = (request: GetPasswordHashRequest): GetPasswordHashResponse => ({
    type: 'getPasswordHash',
    passwordHash: getServiceWorkerContext().passwordHash
});
