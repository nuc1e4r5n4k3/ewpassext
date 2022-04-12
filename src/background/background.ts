
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

chrome.runtime.onMessage.addListener(e => {
    if (e.type === 'openPopup') {
        try {
            (chrome.action as any).openPopup();
        } catch (e) {
            console.debug(e);
        }
    }
});
