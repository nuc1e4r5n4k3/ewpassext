import { EXTENSION_ID, EXTENSION_URL } from "./requests";
import { MessageType, Request, Response } from "./types";


type Handlers = { [key: string]: [(request: Request) => Response, boolean] };
let handlers: Handlers = {};

const isTrusted = (sender: chrome.runtime.MessageSender): boolean =>
    sender.id === EXTENSION_ID &&
    sender.origin === EXTENSION_URL &&
    sender.url !== undefined && sender.url.startsWith(EXTENSION_URL + '/');

export const handleRequest = <T extends Request> (request: T, reply: (response: Response) => void, sender: chrome.runtime.MessageSender) => {
    if (request.type in handlers) {
        const handler = handlers[request.type];
        if (!handler[1] || isTrusted(sender)) {
            reply(handler[0](request));
        }
    } else {
        reply({ type: request.type });
    }
};

export const addRequestHandler = <RequestT extends Request, ResponseT extends Response> (type: MessageType, handler: (request: RequestT) => ResponseT, trusted: boolean = false) => {
    handlers[type] = [(request: Request) => handler(request as RequestT) as Response, trusted];
};
