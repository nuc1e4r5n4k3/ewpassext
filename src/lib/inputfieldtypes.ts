
export type InputFieldType = 'textinput' | 'passwordinput' | undefined;


export const isPasswordField = (element: Element | null): boolean =>
    element instanceof HTMLInputElement && element.type === 'password';

export const isEditableTarget = (element: Element | null): element is HTMLInputElement | HTMLTextAreaElement | HTMLElement =>
    !!element && (
        element instanceof HTMLTextAreaElement ||
        (element instanceof HTMLInputElement && [
            'text', 'tel', 'number', 'email', 'search', 'url'
        ].includes(element.type)) ||
        (element instanceof HTMLElement && element.isContentEditable)
    );


export const getElementInputType = (element: Element | null): InputFieldType => {
    if (!element || element === document.body || element === document.documentElement)
        return undefined;

    if (isPasswordField(element)) return 'passwordinput';
    if (isEditableTarget(element)) return 'textinput';
    return undefined;
};


/*
 *  Attempt to find a multi-field custom input, e.g. for OTP codes
 *
 *  This is a very naive implementation, that nonetheless should work reasonable well.
 *  If the first box of a group is not currently selected (which would be expected), the scan will fail.
 */
const findCharBoxGroup = (element: HTMLInputElement): HTMLInputElement[] | undefined => {
    if (element.maxLength !== 1)
        return undefined;

    let node = element.parentElement;
    for (let depth = 0; node !== null && depth < 3; node = node.parentElement as HTMLElement | null, depth++) {
        const boxes = Array.from(node.querySelectorAll('input')).filter((input: HTMLInputElement): boolean =>
            (input.type === 'text' || input.type === 'tel' || input.type === 'number') && input.maxLength === 1
        );

        if (boxes.length >= 2 && boxes[0] === element)
            return boxes;

        if (node.tagName === 'FORM')
            break;
    }
    return undefined;
};


export const singleControlInjectValue = (value: string, element: HTMLElement): boolean => {
    const emitFrameworkEvents = <E extends HTMLElement>(input: E, update: (element: E) => string): void => {
        const lastValue = update(input);
        const event = new Event('input', { bubbles: true });

        // React 15
        (event as any).simulated = true;

        // React 16
        const tracker = (input as any)._valueTracker;
        if (tracker) {
            tracker.setValue(lastValue);
        }

        input.dispatchEvent(event);
    };

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        if (element.maxLength === -1 || element.maxLength >= value.length) {
            emitFrameworkEvents(element, element => {
                const lastValue = element.value;
                element.value = value;
                return lastValue;
            });
            return true;
        }
    } else if (element instanceof HTMLElement && element.isContentEditable) {
        emitFrameworkEvents(element, element => {
            const lastValue = element.textContent;
            element.textContent = value;
            return lastValue;
        });
        return true;
    }

    return false;
};

const charBoxGroupInjectValue = (value: string, group: HTMLInputElement[]): boolean => {
    if (value.length > group.length)
        return false;

    for (let i = 0; i < value.length; i++) {
        singleControlInjectValue(value[i], group[i]);
    }
    return true;
};

export const injectValue = (value: string, element: HTMLElement): boolean => {
    const charGroup = element instanceof HTMLInputElement ? findCharBoxGroup(element) : undefined;
    return charGroup ? charBoxGroupInjectValue(value, charGroup) : singleControlInjectValue(value, element);
};
