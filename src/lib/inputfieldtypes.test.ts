import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getElementInputType,
    injectValue,
    isEditableTarget,
    isPasswordField,
    singleControlInjectValue,
} from './inputfieldtypes';

beforeEach(() => {
    document.body.innerHTML = '';
});

const input = (type: string, maxLength?: number): HTMLInputElement => {
    const el = document.createElement('input');
    el.type = type;
    if (maxLength !== undefined) el.maxLength = maxLength;
    document.body.appendChild(el);
    return el;
};

describe('isPasswordField', () => {
    it('returns true for a password input', () => {
        expect(isPasswordField(input('password'))).toBe(true);
    });

    it('returns false for non-password inputs', () => {
        expect(isPasswordField(input('text'))).toBe(false);
        expect(isPasswordField(input('number'))).toBe(false);
    });

    it('returns false for non-input elements and null', () => {
        const div = document.createElement('div');
        document.body.appendChild(div);
        expect(isPasswordField(div)).toBe(false);
        expect(isPasswordField(null)).toBe(false);
    });
});

describe('isEditableTarget', () => {
    it('accepts text-area style inputs', () => {
        for (const t of ['text', 'tel', 'number', 'email', 'search', 'url']) {
            expect(isEditableTarget(input(t))).toBe(true);
        }
    });

    it('accepts a textarea', () => {
        const ta = document.createElement('textarea');
        document.body.appendChild(ta);
        expect(isEditableTarget(ta)).toBe(true);
    });

    it('accepts a contenteditable element', () => {
        const div = document.createElement('div');
        div.contentEditable = 'true';
        document.body.appendChild(div);
        expect(isEditableTarget(div)).toBe(true);
    });

    it('rejects password and non-editable inputs', () => {
        expect(isEditableTarget(input('password'))).toBe(false);
        expect(isEditableTarget(input('checkbox'))).toBe(false);
        expect(isEditableTarget(input('radio'))).toBe(false);
        expect(isEditableTarget(input('submit'))).toBe(false);
    });

    it('rejects non-editable elements and null', () => {
        const div = document.createElement('div');
        document.body.appendChild(div);
        expect(isEditableTarget(div)).toBe(false);
        expect(isEditableTarget(document.createElement('button'))).toBe(false);
        expect(isEditableTarget(null)).toBe(false);
    });
});

describe('getElementInputType', () => {
    it('classifies a password input as passwordinput', () => {
        expect(getElementInputType(input('password'))).toBe('passwordinput');
    });

    it('classifies editable targets as textinput', () => {
        expect(getElementInputType(input('text'))).toBe('textinput');
        const ta = document.createElement('textarea');
        document.body.appendChild(ta);
        expect(getElementInputType(ta)).toBe('textinput');
        const div = document.createElement('div');
        div.contentEditable = 'true';
        document.body.appendChild(div);
        expect(getElementInputType(div)).toBe('textinput');
    });

    it('returns undefined for body, documentElement and non-editable elements', () => {
        expect(getElementInputType(document.body)).toBeUndefined();
        expect(getElementInputType(document.documentElement)).toBeUndefined();
        expect(getElementInputType(input('checkbox'))).toBeUndefined();
        const div = document.createElement('div');
        document.body.appendChild(div);
        expect(getElementInputType(div)).toBeUndefined();
        expect(getElementInputType(null)).toBeUndefined();
    });
});

describe('singleControlInjectValue', () => {
    it('sets the value of a text input and returns true', () => {
        const el = input('text');
        expect(singleControlInjectValue('abc', el)).toBe(true);
        expect(el.value).toBe('abc');
    });

    it('sets the value of a textarea', () => {
        const ta = document.createElement('textarea');
        document.body.appendChild(ta);
        expect(singleControlInjectValue('line', ta)).toBe(true);
        expect(ta.value).toBe('line');
    });

    it('sets the textContent of a contenteditable element', () => {
        const div = document.createElement('div');
        div.contentEditable = 'true';
        document.body.appendChild(div);
        expect(singleControlInjectValue('text', div)).toBe(true);
        expect(div.textContent).toBe('text');
    });

    it('respects maxLength (rejects too-long values)', () => {
        const el = input('text', 4);
        expect(singleControlInjectValue('toolong', el)).toBe(false);
        expect(el.value).toBe('');
    });

    it('accepts values that fit exactly within maxLength', () => {
        const el = input('text', 4);
        expect(singleControlInjectValue('1234', el)).toBe(true);
        expect(el.value).toBe('1234');
    });

    it('accepts values shorter than maxLength without padding or truncation', () => {
        const el = input('text', 8);
        expect(singleControlInjectValue('ab', el)).toBe(true);
        expect(el.value).toBe('ab');
    });

    it('rejects non-editable elements', () => {
        const button = document.createElement('button');
        document.body.appendChild(button);
        expect(singleControlInjectValue('x', button)).toBe(false);
    });

    it('dispatches a bubbling input event marked as simulated (React 15 compat)', () => {
        const el = input('text');
        const listener = vi.fn((event: Event) => {
            expect((event as any).simulated).toBe(true);
            expect(event.bubbles).toBe(true);
        });
        el.addEventListener('input', listener);
        singleControlInjectValue('abc', el);
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('notifies the React 16 _valueTracker with the previous value', () => {
        const el = input('text');
        el.value = 'old';
        const setValue = vi.fn();
        (el as any)._valueTracker = { setValue };
        singleControlInjectValue('new', el);
        expect(el.value).toBe('new');
        expect(setValue).toHaveBeenCalledWith('old');
    });
});

describe('injectValue', () => {
    it('injects into an ordinary text input', () => {
        const el = input('text');
        expect(injectValue('abc', el)).toBe(true);
        expect(el.value).toBe('abc');
    });

    describe('character-box groups (e.g. OTP inputs)', () => {
        const groupContainer = (count: number, type: string = 'text'): HTMLInputElement[] => {
            const wrap = document.createElement('div');
            const boxes: HTMLInputElement[] = [];
            for (let i = 0; i < count; i++) {
                const box = input(type, 1);
                wrap.appendChild(box);
                boxes.push(box);
            }
            document.body.appendChild(wrap);
            return boxes;
        };

        it('distributes one character per box when the focused box is first', () => {
            const [b0, b1, b2] = groupContainer(3);
            expect(injectValue('123', b0)).toBe(true);
            expect(b0.value).toBe('1');
            expect(b1.value).toBe('2');
            expect(b2.value).toBe('3');
        });

        it('rejects values longer than the number of boxes', () => {
            const [b0] = groupContainer(3);
            expect(injectValue('1234', b0)).toBe(false);
            expect(b0.value).toBe('');
        });

        it('does not treat a focused box that is not the first as part of a group', () => {
            const [b0, b1, b2] = groupContainer(3);
            expect(injectValue('X', b1)).toBe(true);
            expect(b0.value).toBe('');
            expect(b1.value).toBe('X');
            expect(b2.value).toBe('');
        });

        it('injects a single character into a single-character box', () => {
            const [b0] = groupContainer(1);
            expect(injectValue('1', b0)).toBe(true);
            expect(b0.value).toBe('1');
        });

        it('does not group single-character password boxes', () => {
            const [p0, p1] = groupContainer(2, 'password');
            expect(injectValue('1', p0)).toBe(true);
            expect(p0.value).toBe('1');
            expect(p1.value).toBe('');
        });
    });
});
