
export class DocumentSearcher {
    private document: Document;

    constructor (document?: Document) {
        this.document = document || (window ? window.document : undefined) || new Document();
    }

    public getPasswordInputsInDocument = () =>
        Array.from(this.document.getElementsByTagName('input')).filter(element => element.type === 'password');

    public getIFrameDocumentsInDocument = () =>
        Array.from(this.document.getElementsByTagName('iframe'), iframe => iframe.contentDocument)
             .filter(iframeDocument => iframeDocument) as Document[];

    public getPasswordInputsInDocumentAndIFrames = () =>
        Array.from([this.document].concat(this.getIFrameDocumentsInDocument()), document => 
            new DocumentSearcher(document).getPasswordInputsInDocument()
        ).reduce((all, part) => all.concat(part));
};
