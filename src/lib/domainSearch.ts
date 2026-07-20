import { getDomainIds, MasterEntropy } from './derivation';
import { endsInTld, PUBLIC_SUFFIXES } from './domain';
import { Configuration } from './storage';

export const SUBDOMAIN_PREFIXES = [
    '',
    'login.', 'signin.', 'secure.', 'securelogin.',
    'account.', 'accounts.', 'myaccount.',
    'auth.', 'authenticate.', 'authentication.',
    'id.', 'identity.', 'passport.', 'my.',
    'sso.', 'oauth.', 'oauth2.', 'oidc.', 'shib.', 'shibboleth.', 'saml.',
    'user.', 'users.', 'member.', 'members.',
    'app.', 'apps.', 'service.', 'services.',
    'profile.', 'profiles.',
    'access.', 'control.',
    'console.', 'dashboard.', 'panel.', 'portal.',
    'admin.', 'manage.', 'management.',
    'mail.', 'email.',
];

export const generateAuthenticationDomainCandidates = (input: string): string[] => {
    if (!input) return [];

    const domains = (() => {
        if (endsInTld(input))
            return [input.toLowerCase()];

        return [input.toLowerCase(), ...PUBLIC_SUFFIXES.map(suffix => input + '.' + suffix)];
    })();

    return domains.flatMap(domain => SUBDOMAIN_PREFIXES.map(prefix => prefix + domain));
};

/**
 *  Best-effort domain suggestion lookup.
 *
 *  Expands `input` via {@link generateAuthenticationDomainCandidates} and returns the first
 *  candidate whose modern or legacy domain ID is present in `configs`.
 *
 *  Returns `undefined` if no candidate matches, or if `input` is empty.
 */
export const findDomainSuggestion = async (entropy: MasterEntropy, configs: Configuration, input: string): Promise<string | undefined> => {
    for (const candidate of generateAuthenticationDomainCandidates(input)) {
        const ids = await getDomainIds(entropy, candidate);
        if (ids.legacyId in configs || ids.id in configs) {
            return candidate;
        }
    }
    return undefined;
};
