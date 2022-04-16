
export const hookEventHandler = <ElementT extends HTMLElement, EventT extends Event>(element: ElementT, eventHandlerName: string, hook: (event: EventT) => void) => {
    let rawElement = element as any;
    
    if (!(eventHandlerName in rawElement))
        throw Error(`Invalid event handler '${eventHandlerName}' on element ${element}`);

    const oldHandler = rawElement[eventHandlerName];
    rawElement[eventHandlerName] = function (event: EventT) {
        hook(event);
        if (oldHandler !== null)
            return oldHandler.apply(this, [event])
    };
};

export const hookNewElements = <ElementT extends HTMLElement, EventT extends Event> (eventHandlerName: string, hook: (element: ElementT, event: EventT) => void, elementsToHook: ElementT[], alreadyHooked: ElementT[] = []) => {
    for (const element of elementsToHook) {
        if (alreadyHooked.includes(element))
            continue;

        hookEventHandler(element, eventHandlerName, e => hook(element, e as EventT));
        alreadyHooked.push(element);
        console.debug(`ewpassext: Hooked '${eventHandlerName}' of`, element);
    }
};

