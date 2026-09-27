import { addRequestHandler, TrustLevel } from '../internalapi/handler';
import { GetTotpCodeRequest, GetTotpCodeResponse } from '../internalapi/types';
import { parseDomainFromUrl } from '../lib/domain';
import { Configuration, load } from '../lib/storage';
import { decryptTotpSecret, generateTotp } from '../lib/totp';
import { findDomainMatch } from './derivedpassword';
import { load_password_hash } from './storage';

const tryGetTotpCode = async (domain: string): Promise<string | undefined> => {
    const cached = await load_password_hash();
    if (cached === undefined) {
        return undefined;
    }

    const match = await findDomainMatch(cached.entropy, domain, await load<Configuration>('metadata') || {});
    if (match === undefined) {
        return undefined;
    }

    const [selectedDomain, config] = match;
    if (!config.totpSecret) {
        return undefined;
    }

    const secret = await decryptTotpSecret(config.totpSecret, selectedDomain, cached.entropy);
    return generateTotp(secret);
};

addRequestHandler<GetTotpCodeRequest, GetTotpCodeResponse>('getTotpCode', async (request: GetTotpCodeRequest, requestOrigin?: string): Promise<GetTotpCodeResponse> => {
    const domain = requestOrigin ? parseDomainFromUrl(requestOrigin) : undefined;
    const code = domain !== undefined && domain.length > 0 ? await tryGetTotpCode(domain) : undefined;

    return {
        type: 'getTotpCode',
        code: code
    };
}, TrustLevel.ExtensionContext);
