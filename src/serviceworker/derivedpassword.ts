import { addRequestHandler, TrustLevel } from "../internalapi/handler";
import { GetDerivedPasswordRequest, GetDerivedPasswordResponse } from "../internalapi/types";
import { derivePassword, getDomainIds, MasterEntropy } from "../lib/derivation";
import { getParentDomains, parseDomainFromUrl } from "../lib/domain";
import { Configuration, IDomainConfig, load } from "../lib/storage";
import { load_password_hash } from "./storage";


const findDomainMatch = async (entropy: MasterEntropy, domain: string, configs: Configuration): Promise<[string, IDomainConfig, boolean] | undefined> => {
    for (const candidateDomain of [domain].concat(getParentDomains(domain))) {
        const domainIds = await getDomainIds(entropy, candidateDomain);

        const hkdfConfig = configs[domainIds.id];
        if (hkdfConfig !== undefined) {
            return [candidateDomain, hkdfConfig, false];
        }

        const legacyConfig = configs[domainIds.legacyId];
        if (legacyConfig !== undefined) {
            return [candidateDomain, legacyConfig, true];
        }
    }

    return undefined;
};

const tryGetDerivedPassword = async (domain: string): Promise<string | undefined> => {
    let cached = await load_password_hash();
    if (cached === undefined) {
        return undefined;
    }

    const match = await findDomainMatch(cached.entropy, domain, await load<Configuration>('metadata') || {});
    if (match == undefined) {
        return undefined;
    }

    const [selectedDomain, config, useLegacyDerivation] = match;
    return derivePassword(cached.entropy, selectedDomain, config.passwordLength, config.passwordIteration, config.useSpecialCharacters, config.allowExtraLongPasswords, useLegacyDerivation);
};

addRequestHandler<GetDerivedPasswordRequest, GetDerivedPasswordResponse>('getDerivedPassword', async (request: GetDerivedPasswordRequest, requestOrigin?: string): Promise<GetDerivedPasswordResponse> => {
    let domain = requestOrigin ? parseDomainFromUrl(requestOrigin) : undefined;
    let result = domain !== undefined && domain.length > 0 ? await tryGetDerivedPassword(domain) : undefined;

    return {
        type: 'getDerivedPassword',
        password: result
    };
}, TrustLevel.ExtensionContext);
