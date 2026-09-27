import { InputFieldType } from "../lib/inputfieldtypes";

export type InjectionContext = {
    hookedInputs: HTMLInputElement[];
    injectionTimer?: NodeJS.Timeout,
    lastPopupTime: number;
    pageChanges: number;

    getActiveInputType?: () => InputFieldType;

    injectPassword?: (password: string) => void;
    injectTotp?: (code: string) => void;
};

export type InjectionContextHolder = {
    ewpassext?: InjectionContext;
}

let contextHolder: InjectionContextHolder = window as InjectionContextHolder;

export const getInjectionContext = () => {
    let ctx: InjectionContext = contextHolder.ewpassext || {
        hookedInputs: [],
        lastPopupTime: 0,
        pageChanges: 0
    };
    contextHolder.ewpassext = ctx;
    return ctx;
};
