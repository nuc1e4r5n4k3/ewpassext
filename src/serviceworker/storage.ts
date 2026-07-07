import { addRequestHandler } from '../internalapi/handler';
import { GetPasswordHashRequest, GetPasswordHashResponse, StorePasswordHashRequest, StorePasswordHashResponse } from '../internalapi/types';
import { alarms } from '../lib/browsercompat';
import { load_string, store_string } from '../lib/storage';

const PASSWORD_HASH_KEY = 'passwordHash';
const CLEAR_PASSWORD_ALARM = 'clearPassword';


const store_password_hash = (hash?: string) => store_string(PASSWORD_HASH_KEY, hash);
const load_password_hash = () => load_string(PASSWORD_HASH_KEY);

addRequestHandler<GetPasswordHashRequest, GetPasswordHashResponse>('getPasswordHash', async (request: GetPasswordHashRequest): Promise<GetPasswordHashResponse> => {
    return {
        type: 'getPasswordHash',
        passwordHash: await load_password_hash()
    };
}, true);

addRequestHandler<StorePasswordHashRequest, StorePasswordHashResponse>('storePasswordHash', async (request: StorePasswordHashRequest): Promise<StorePasswordHashResponse> => {
    await store_password_hash(request.passwordHash);
        
    if (request.passwordHashTtl && request.passwordHash !== undefined) {
        alarms.create(CLEAR_PASSWORD_ALARM, { delayInMinutes: request.passwordHashTtl / 60 });
    }
    
    return { type: 'storePasswordHash' };
}, true);
