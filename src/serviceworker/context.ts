
export type ServiceWorkerContext = {
    passwordHash?: string;
    passwordHashTimer?: NodeJS.Timeout;
};

let serviceWorkerContext: ServiceWorkerContext = {};

export const getServiceWorkerContext = () => serviceWorkerContext;
