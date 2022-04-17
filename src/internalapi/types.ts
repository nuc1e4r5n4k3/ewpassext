
export type MessageType = 'keepAlive'|'openPopup'|'getPasswordHash'|'storePasswordHash';

export interface Message {
    type: MessageType
};

export interface Request extends Message {};
export interface Response extends Message {};

export type KeepAliveSource = 'popup'|'keepAliveTab';
export interface KeepAliveRequest extends Request {
    type: 'keepAlive';
    from: KeepAliveSource;
};

export interface KeepAliveResponse extends Response {
    type: 'keepAlive';
    cacheState: boolean;
};

export interface OpenPopupRequest extends Request {
    type: 'openPopup';
};

export interface OpenPopupResponse extends Response {
    type: 'openPopup';
};

export interface StorePasswordHashRequest extends Request {
    type: 'storePasswordHash';
    passwordHash: string|undefined;
    passwordHashTtl?: number;
};

export interface StorePasswordHashResponse extends Response {
    type: 'storePasswordHash';
};

export interface GetPasswordHashRequest extends Request {
    type: 'getPasswordHash';
};

export interface GetPasswordHashResponse extends Response {
    type: 'getPasswordHash';
    passwordHash: string|null|undefined;
};
