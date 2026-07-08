import { addRequestHandler, TrustLevel } from '../internalapi/handler';
import { GetPasswordHashRequest, GetPasswordHashResponse, StorePasswordHashRequest, StorePasswordHashResponse } from '../internalapi/types';
import { alarms } from '../lib/browsercompat';
import { load, store } from '../lib/storage';

const PASSWORD_HASH_KEY = 'passwordHash';
const CLEAR_PASSWORD_ALARM = 'clearPassword';

interface StoredHash {
    hash: string;
    expires?: number;
};

const getCurrentTime = () => Math.floor(new Date().getTime() / 1000);


const store_password_hash = (hash?: string, expires?: number) => store<StoredHash>(PASSWORD_HASH_KEY, hash !== undefined ? { "hash": hash, "expires": expires } : undefined);
export const load_password_hash = async (): Promise<[string, number?] | undefined> => {
    const stored = await load<StoredHash>(PASSWORD_HASH_KEY);
    if (stored !== undefined) {
        return [stored.hash, stored.expires];
    }
    return undefined;
};

addRequestHandler<GetPasswordHashRequest, GetPasswordHashResponse>('getPasswordHash', async (request: GetPasswordHashRequest): Promise<GetPasswordHashResponse> => {
    let [passwordHash, expiresAt] = await load_password_hash() || [undefined, undefined];
    return {
        type: 'getPasswordHash',
        passwordHash: passwordHash,
        expiresAt: expiresAt
    };
}, TrustLevel.FromExtension);

addRequestHandler<StorePasswordHashRequest, StorePasswordHashResponse>('storePasswordHash', async (request: StorePasswordHashRequest): Promise<StorePasswordHashResponse> => {
    if (request.passwordHashTtl && request.passwordHash !== undefined) {
        alarms.create(CLEAR_PASSWORD_ALARM, { delayInMinutes: request.passwordHashTtl / 60 });
    }

    await store_password_hash(request.passwordHash, request.passwordHashTtl ? getCurrentTime() + request.passwordHashTtl : undefined);    
    return { type: 'storePasswordHash' };
}, TrustLevel.FromExtension);
