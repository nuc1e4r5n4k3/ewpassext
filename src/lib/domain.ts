const isValidDomain = (domain: string) => {
    const parts = domain.split('.');
    
    if (parts.length >= 3)
        return true;
    if (parts.length < 2)
        return false;
    if (parts[0].length <= 2)   /* i.e. .co.uk */
        return false;
    return true;
};

export const parseDomainFromUrl = (url: string) => {
    return url.split('://')[1].split('/')[0];
};

export const getParentDomains = (domain: string) => {
    let results = [];
    let parts = domain.split('.');

    while (parts.shift() !== undefined) {
        const parent = parts.join('.');
        if (!isValidDomain(parent))
            break;
        results.push(parent);
    }
    return results;
};
