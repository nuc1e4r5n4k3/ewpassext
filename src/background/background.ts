
type Context = {
    passwordHash?: string;
    passwordHashTimer?: NodeJS.Timeout;
};

type InjectionContext = {
    hookedInputs: HTMLInputElement[];
    injectionTimer?: NodeJS.Timeout,
    lastPopupTime: number;
};

type InjectionContextHolder = {
    ewpassext?: InjectionContext;
}

let _context: Context = {};

chrome.webNavigation.onCompleted.addListener(e => {
    if (e.url.substr(0, 8) !== 'https://') {
        return;
    }

    const hookPasswordInputFocusHandlers = () => {
        const EXTENSION_ID = 'plnponcbnkhnjaopjjgagpkameffpllm';
        let contextHolder = window as InjectionContextHolder;
        let ctx: InjectionContext = contextHolder.ewpassext || {
            hookedInputs: [],
            lastPopupTime: 0
        };
        contextHolder.ewpassext = ctx;

        const getPasswordInputs = (document: Document) =>
            Array.from(document.getElementsByTagName('input')).filter(element => element.type === 'password');

        const getIFrameDocuments = (document: Document) =>
            Array.from(document.getElementsByTagName('iframe'), iframe => iframe.contentDocument)
                 .filter(document => document) as Document[];

        const getAllPasswordInputs = () =>
            Array.from([document].concat(getIFrameDocuments(document)), document => getPasswordInputs(document)).reduce((all, part) => all.concat(part));

        const hookFocusHandler = (input: HTMLInputElement, hook: (event: FocusEvent) => void) => {
            const oldHandler = input.onfocus;
            input.onfocus = function (event) {
                hook(event);
                if (oldHandler !== null)
                    return oldHandler.apply(this, [event])
            };
        };

        const doOpenPopup = () => {
            chrome.runtime.sendMessage(EXTENSION_ID, {type: 'openPopup'});
        };

        const injectHooks = () => {
            for (const input of getAllPasswordInputs()) {
                if (ctx.hookedInputs.includes(input))
                    continue;
                hookFocusHandler(input, () => {
                    const now = new Date().getTime();
                    const last = ctx.lastPopupTime || 0;
                    if (input.value === '' && now - last > 3000) {
                        ctx.lastPopupTime = now;
                        doOpenPopup();
                    }
                });
                ctx.hookedInputs.push(input);
                console.debug(`ewpassext: Hooked password input ${input.id}`, input);
            }
        };

        const triggerInjection = () => {
            if (ctx.injectionTimer)
                clearTimeout(ctx.injectionTimer);

            ctx.injectionTimer = setTimeout(injectHooks, 100);
        };
        
        triggerInjection();
        new MutationObserver(triggerInjection).observe(document, {
            subtree: true,
            childList: true
        });
    };

    chrome.scripting.executeScript({
        func: hookPasswordInputFocusHandlers,
        target: {tabId: e.tabId},
        args: []
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'openPopup') {
        try {
            (chrome.action as any).openPopup();
            sendResponse({type: 'openPopup', result: true});
        } catch (e) {
            console.debug(e);
            sendResponse({type: 'openPopup', result: false});
        }
    } else if (message.type === 'storePasswordHash') {
        _context.passwordHash = message.passwordHash;
        if (_context.passwordHashTimer !== undefined) {
            clearTimeout(_context.passwordHashTimer);
        }
        if (_context.passwordHash !== undefined) {
            _context.passwordHashTimer = setTimeout(() => {
                _context.passwordHash = undefined;
                _context.passwordHashTimer = undefined;
            }, message.passwordHashTtl * 1000);
        }
        sendResponse({});
    } else if (message.type === 'getPasswordHash') {
        sendResponse({
            type: 'passwordHash',
            passwordHash: _context.passwordHash
        });
    } else if (message.type === 'keepAlive') {
        sendResponse({
            type: 'keepAlive',
            cacheState: _context.passwordHash !== undefined
        });
    } else {
        sendResponse({});
    }
});
