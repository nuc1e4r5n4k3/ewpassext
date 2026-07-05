import { EXTENSION_INTERNAL_ID, EXTENSION_URL } from "./requests";
import { MessageType, Request, Response } from "./types";


type Handlers = { [key: string]: [(request: Request) => Promise<Response>, boolean] };
let handlers: Handlers = {};

const isTrusted = (sender: chrome.runtime.MessageSender): boolean =>
    sender.id === EXTENSION_INTERNAL_ID &&
    sender.origin === EXTENSION_URL &&
    sender.url !== undefined && sender.url.startsWith(EXTENSION_URL + '/');

export const handleRequest = async <T extends Request> (request: T, reply: (response: Response) => void, sender: chrome.runtime.MessageSender) => {
    if (request.type in handlers) {
        const handler = handlers[request.type];
        if (!handler[1] || isTrusted(sender)) {
            reply(await handler[0](request));
        }
    } else {
        reply({ type: request.type });
    }
};

export const addRequestHandler = <RequestT extends Request, ResponseT extends Response> (type: MessageType, handler: (request: RequestT) => Promise<ResponseT>, trusted: boolean = false) => {
    handlers[type] = [async (request: Request) => await handler(request as RequestT) as Response, trusted];
};
