
type Context = {
    passwordHash?: string;
    passwordHashTimer?: NodeJS.Timeout;
};

let _context: Context = {};

chrome.webNavigation.onCompleted.addListener(e => {
    if (e.url.substr(0, 8) !== 'https://') {
        return;
    }

    const hookPasswordInputFocusHandlers = () => {
        const EXTENSION_ID = 'plnponcbnkhnjaopjjgagpkameffpllm';

        const getPasswordInputs = () => 
            Array.from(document.getElementsByTagName('input')).filter(element => element.type === 'password');

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

        for (const input of getPasswordInputs()) {
            hookFocusHandler(input, doOpenPopup);
        }
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
    } else {
        sendResponse({});
    }
});
