const isValidDomain = (domain: string) => {
    const parts = domain.split('.');
    
    if (parts.length >= 3)
        return true;
    if (parts.length < 2)
        return false;
    return true;
};

export const parseDomainFromUrl = (url: string) => {
    let parts = url.split('://');
    if (parts.length < 2) {
        return '';
    }
    return parts[1].split('/')[0];
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
