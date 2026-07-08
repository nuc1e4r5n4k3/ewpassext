import { EXTENSION_INTERNAL_ID, EXTENSION_URL } from "./requests";
import { MessageType, Request, Response } from "./types";

export enum TrustLevel {
    Untrusted,
    ExtensionContext,
    FromExtension
};

type Handlers = { [key: string]: [(request: Request, origin?: string) => Promise<Response>, TrustLevel] };
let handlers: Handlers = {};

const isTrusted = (sender: chrome.runtime.MessageSender, requiredLevel: TrustLevel = TrustLevel.Untrusted): boolean => {
    if (requiredLevel == TrustLevel.Untrusted) {
        return true;
    }

    if (sender.id !== EXTENSION_INTERNAL_ID) {
        return false;
    }

    return (requiredLevel === TrustLevel.ExtensionContext || (
        sender.origin === EXTENSION_URL &&
        sender.url !== undefined && sender.url.startsWith(EXTENSION_URL + '/')
    ));
}

export const handleRequest = async <T extends Request> (request: T, reply: (response: Response) => void, sender: chrome.runtime.MessageSender) => {
    if (request.type in handlers) {
        const handler = handlers[request.type];
        if (isTrusted(sender, handler[1])) {
            reply(await handler[0](request, sender.origin));
        }
    } else {
        reply({ type: request.type });
    }
};

export const addRequestHandler = <RequestT extends Request, ResponseT extends Response> (type: MessageType, handler: (request: RequestT, requestOrigin?: string) => Promise<ResponseT>, trusted: TrustLevel = TrustLevel.Untrusted) => {
    handlers[type] = [async (request: Request, requestOrigin?: string) => await handler(request as RequestT, requestOrigin) as Response, trusted];
};
