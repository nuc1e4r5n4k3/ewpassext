import { addRequestHandler, TrustLevel } from '../internalapi/handler';
import { GetPasswordHashRequest, GetPasswordHashResponse, StorePasswordHashRequest, StorePasswordHashResponse } from '../internalapi/types';
import { alarms, storage } from '../lib/browsercompat';
import { MasterEntropy } from '../lib/derivation';
import { load, store } from '../lib/storage';

const PASSWORD_HASH_KEY = 'passwordHash';
const CLEAR_PASSWORD_ALARM = 'clearPassword';

interface StoredEntropy {
    entropy: MasterEntropy;
    expires?: number;
};

const getCurrentTime = () => Math.floor(new Date().getTime() / 1000);


const store_password_hash = (entropy?: MasterEntropy, expires?: number) => store<StoredEntropy>(PASSWORD_HASH_KEY, entropy !== undefined ? { "entropy": entropy, "expires": expires } : undefined, storage.session);
export const load_password_hash = async (): Promise<StoredEntropy | undefined> => {
    return await load<StoredEntropy>(PASSWORD_HASH_KEY, storage.session);
};

alarms.onAlarm.addListener(async alarm => {
    if (alarm.name === CLEAR_PASSWORD_ALARM) {
        await store_password_hash(undefined);
    }
});

addRequestHandler<GetPasswordHashRequest, GetPasswordHashResponse>('getPasswordHash', async (request: GetPasswordHashRequest): Promise<GetPasswordHashResponse> => {
    const stored = await load_password_hash();
    return {
        type: 'getPasswordHash',
        entropy: stored?.entropy,
        expiresAt: stored?.expires
    };
}, TrustLevel.FromExtension);

addRequestHandler<StorePasswordHashRequest, StorePasswordHashResponse>('storePasswordHash', async (request: StorePasswordHashRequest): Promise<StorePasswordHashResponse> => {
    if (request.passwordHashTtl && request.entropy !== undefined) {
        alarms.create(CLEAR_PASSWORD_ALARM, { delayInMinutes: request.passwordHashTtl / 60 });
    }

    await store_password_hash(request.entropy, request.passwordHashTtl ? getCurrentTime() + request.passwordHashTtl : undefined);    
    return { type: 'storePasswordHash' };
}, TrustLevel.FromExtension);
