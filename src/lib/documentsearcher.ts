import { getElementInputType, injectValue, InputFieldType, isEditableTarget, isPasswordField } from "./inputfieldtypes";

export class DocumentSearcher {
    private document: Document;

    constructor(document?: Document) {
        this.document = document || (window ? window.document : undefined) || new Document();
    }

    public getPasswordInputsInDocument = () =>
        Array.from(this.document.getElementsByTagName('input')).filter(isPasswordField);

    public getIFrameDocumentsInDocument = () =>
        Array.from(this.document.getElementsByTagName('iframe'), iframe => iframe.contentDocument)
            .filter(iframeDocument => iframeDocument) as Document[];

    public getPasswordInputsInDocumentAndIFrames = () =>
        Array.from([this.document].concat(this.getIFrameDocumentsInDocument()), document =>
            new DocumentSearcher(document).getPasswordInputsInDocument()
        ).reduce((all, part) => all.concat(part));

    public getActiveInputInDocumentAndIFrames = () =>
        Array.from([this.document].concat(this.getIFrameDocumentsInDocument()), document =>
            document.activeElement
        ).find(element => isPasswordField(element) || isEditableTarget(element));

    public injectIntoActiveInputInDocumentAndIFrames = (value: string, allowedTargets: InputFieldType[]): boolean => {
        const element = this.getActiveInputInDocumentAndIFrames();
        if (!element || !(element instanceof HTMLElement) || !allowedTargets.includes(getElementInputType(element)))
            return false;

        return injectValue(value, element);
    };
};
