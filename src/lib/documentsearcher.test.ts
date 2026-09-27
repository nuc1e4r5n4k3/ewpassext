import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentSearcher } from './documentsearcher';

beforeEach(() => {
    document.body.innerHTML = '';
});

const input = (type: string): HTMLInputElement => {
    const el = document.createElement('input');
    el.type = type;
    document.body.appendChild(el);
    return el;
};

const loadIframe = (srcdoc: string): Promise<HTMLIFrameElement> => new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.srcdoc = srcdoc;
    iframe.addEventListener('load', () => resolve(iframe), { once: true });
    document.body.appendChild(iframe);
});

describe('getPasswordInputsInDocument', () => {
    it('finds only password inputs', () => {
        const pw = input('password');
        input('text');
        expect(new DocumentSearcher().getPasswordInputsInDocument()).toEqual([pw]);
    });

    it('finds multiple password inputs', () => {
        const pw1 = input('password');
        const pw2 = input('password');
        expect(new DocumentSearcher().getPasswordInputsInDocument()).toEqual([pw1, pw2]);
    });

    it('searches within a given document', () => {
        const doc = document.implementation.createHTMLDocument();
        const pw = doc.createElement('input');
        pw.type = 'password';
        doc.body.appendChild(pw);
        expect(new DocumentSearcher(doc).getPasswordInputsInDocument()).toEqual([pw]);
    });
});

describe('getPasswordInputsInDocumentAndIFrames', () => {
    it('includes password inputs inside same-origin iframes', async () => {
        const pw = input('password');
        const iframe = await loadIframe('<input type="password"><input type="text">');
        const iframePw = iframe.contentDocument!.querySelector('input[type="password"]')!;

        const searcher = new DocumentSearcher();
        expect(searcher.getPasswordInputsInDocumentAndIFrames()).toContain(pw);
        expect(searcher.getPasswordInputsInDocumentAndIFrames()).toContain(iframePw);
    });
});

describe('getActiveInputInDocumentAndIFrames', () => {
    it('returns the active text input', () => {
        const el = input('text');
        const pw = input('password');
        pw.focus();
        expect(new DocumentSearcher().getActiveInputInDocumentAndIFrames()).toBe(pw);
        el.focus();
        expect(new DocumentSearcher().getActiveInputInDocumentAndIFrames()).toBe(el);
    });

    it('returns an active contenteditable element', () => {
        const div = document.createElement('div');
        div.contentEditable = 'true';
        document.body.appendChild(div);
        div.focus();
        expect(new DocumentSearcher().getActiveInputInDocumentAndIFrames()).toBe(div);
    });

    it('returns undefined when the active element is not editable', () => {
        input('text').focus();
        input('text');
        const button = document.createElement('button');
        document.body.appendChild(button);
        button.focus();
        expect(new DocumentSearcher().getActiveInputInDocumentAndIFrames()).toBeUndefined();
    });

    it('finds an editable active element inside an iframe', async () => {
        const iframe = await loadIframe('<input type="text" id="inner">');
        const inner = iframe.contentDocument!.getElementById('inner') as HTMLInputElement;
        inner.focus();
        expect(new DocumentSearcher().getActiveInputInDocumentAndIFrames()).toBe(inner);
    });
});

describe('injectIntoActiveInputInDocumentAndIFrames', () => {
    it('injects into the active input when its type is allowed', () => {
        const el = input('text');
        el.focus();
        expect(new DocumentSearcher().injectIntoActiveInputInDocumentAndIFrames('abc', ['textinput'])).toBe(true);
        expect(el.value).toBe('abc');
    });

    it('injects into the active password input when allowed', () => {
        const el = input('password');
        el.focus();
        expect(new DocumentSearcher().injectIntoActiveInputInDocumentAndIFrames('secret', ['passwordinput'])).toBe(true);
        expect(el.value).toBe('secret');
    });

    it('refuses to inject when the active type is not in allowedTargets', () => {
        const el = input('text');
        el.focus();
        expect(new DocumentSearcher().injectIntoActiveInputInDocumentAndIFrames('abc', ['passwordinput'])).toBe(false);
        expect(el.value).toBe('');
    });

    it('returns false when the active element is not editable', () => {
        const button = document.createElement('button');
        document.body.appendChild(button);
        button.focus();
        expect(new DocumentSearcher().injectIntoActiveInputInDocumentAndIFrames('abc', ['textinput'])).toBe(false);
    });

    it('respects maxLength of the active input', () => {
        const el = document.createElement('input');
        el.type = 'text';
        el.maxLength = 3;
        document.body.appendChild(el);
        el.focus();
        expect(new DocumentSearcher().injectIntoActiveInputInDocumentAndIFrames('toolong', ['textinput'])).toBe(false);
        expect(el.value).toBe('');
    });

    it('injects into an editable active element inside an iframe', async () => {
        const iframe = await loadIframe('<input type="text" id="inner">');
        const inner = iframe.contentDocument!.getElementById('inner') as HTMLInputElement;
        inner.focus();
        expect(new DocumentSearcher().injectIntoActiveInputInDocumentAndIFrames('123456', ['textinput'])).toBe(true);
        expect(inner.value).toBe('123456');
    });
});
