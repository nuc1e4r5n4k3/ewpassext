
export type MessageType = 'keepAlive'|'openPopup'|'getPasswordHash'|'storePasswordHash'|'getDerivedPassword';

export interface Message {
    type: MessageType
};

export interface Request extends Message {};
export interface Response extends Message {};

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
    passwordHash: string|undefined;
    expiresAt: number|undefined;
};

export interface GetDerivedPasswordRequest extends Request {
    type: 'getDerivedPassword';
};

export interface GetDerivedPasswordResponse extends Response {
    type: 'getDerivedPassword';
    password: string|undefined;
};