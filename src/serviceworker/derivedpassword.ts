import { addRequestHandler, TrustLevel } from "../internalapi/handler";
import { GetDerivedPasswordRequest, GetDerivedPasswordResponse } from "../internalapi/types";
import { derivePassword, getDomainId } from "../lib/derivation";
import { getParentDomains, parseDomainFromUrl } from "../lib/domain";
import { Configuration, IDomainConfig, load } from "../lib/storage";
import { load_password_hash } from "./storage";


const findDomainMatch = (hash: string, domain: string, configs: Configuration): [string, IDomainConfig] | undefined => {
    for (domain of [domain].concat(getParentDomains(domain))) {
        const domainId = getDomainId(hash, domain);
        const config = configs[domainId];
        
        if (config !== undefined) { 
            return [domain, config];
        }
    }

    return undefined;
};

const tryGetDerivedPassword = async (domain: string): Promise<string | undefined> => {
    let cached = await load_password_hash();
    if (cached === undefined) {
        return undefined;
    }
    let [hash, _] = cached;

    const match = findDomainMatch(hash, domain, await load<Configuration>('metadata') || {});
    if (match == undefined) {
        return undefined;
    }

    const [selectedDomain, config] = match;
    return derivePassword(hash, selectedDomain, config.passwordLength, config.passwordIteration, config.useSpecialCharacters, config.allowExtraLongPasswords);
};

addRequestHandler<GetDerivedPasswordRequest, GetDerivedPasswordResponse>('getDerivedPassword', async (request: GetDerivedPasswordRequest, requestOrigin?: string): Promise<GetDerivedPasswordResponse> => {
    let domain = requestOrigin ? parseDomainFromUrl(requestOrigin) : undefined;
    let result = domain !== undefined && domain.length > 0 ? await tryGetDerivedPassword(domain) : undefined;

    return {
        type: 'getDerivedPassword',
        password: result
    };
}, TrustLevel.ExtensionContext);
