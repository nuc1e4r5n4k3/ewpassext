import { MessageType, Request, Response } from "./types";


type Handlers = { [key: string]: (request: Request) => Response };
let handlers: Handlers = {};

export const handleRequest = <T extends Request> (request: T, reply: (response: Response) => void) => {
    if (request.type in handlers) {
        reply(handlers[request.type](request));
    } else {
        reply({ type: request.type });
    }
};

export const addRequestHandler = <RequestT extends Request, ResponseT extends Response> (type: MessageType, handler: (request: RequestT) => ResponseT) => {
    handlers[type] = (request: Request) => handler(request as RequestT) as Response;
};
