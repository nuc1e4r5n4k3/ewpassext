import { scripting } from "../lib/browsercompat";
import { InputFieldType } from "../lib/inputfieldtypes";
import { InjectionContextHolder } from "./context";

export class InjectionProxy {
    private target: { tabId: number };

    constructor(tabId: number) {
        this.target = { tabId: tabId };
    }

    /*
     *  NOTE: Under normal circumstances injection is performed by the service worker.
     */
    private ensureInjected = async (): Promise<void> => {
        const present = await scripting.executeScript({
            target: this.target,
            func: () => !!(window as InjectionContextHolder).ewpassext,
        });
        if (present[0]?.result) return;

        await scripting.executeScript({
            target: this.target,
            files: ['contentscript.js']
        });
    };

    public getActiveInputType = async (): Promise<InputFieldType> => {
        await this.ensureInjected();
        const result = await scripting.executeScript({
            target: this.target,
            func: () => (window as InjectionContextHolder).ewpassext!.getActiveInputType!(),
            args: []
        });
        return result[0]?.result as InputFieldType;
    };

    public injectPassword = async (password: string): Promise<void> => {
        await this.ensureInjected();
        await scripting.executeScript({
            target: this.target,
            func: (password: string) => (window as InjectionContextHolder).ewpassext!.injectPassword!(password),
            args: [password]
        });
    };

    public injectTotp = async (code: string): Promise<void> => {
        await this.ensureInjected();
        await scripting.executeScript({
            target: this.target,
            func: (code: string) => (window as InjectionContextHolder).ewpassext!.injectTotp!(code),
            args: [code]
        });
    };
}
