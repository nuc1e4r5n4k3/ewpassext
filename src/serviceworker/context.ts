
export type ServiceWorkerContext = {
    passwordHash?: string|null;
    passwordHashTimer?: NodeJS.Timeout;
    lastTabKeepAlive?: number;
};

let serviceWorkerContext: ServiceWorkerContext = {};

export const getServiceWorkerContext = () => serviceWorkerContext;
