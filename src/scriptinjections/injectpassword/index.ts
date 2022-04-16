import { DocumentSearcher } from "../../lib/documentsearcher";
import { getInjectionContext, InjectionContextHolder } from "../context";


getInjectionContext().injectPassword = (password: string) => {
    for (let input of new DocumentSearcher().getPasswordInputsInDocumentAndIFrames()) {
        input.value = password;
    }
};

console.debug(window, (window as InjectionContextHolder).ewpassext, (window as InjectionContextHolder).ewpassext?.injectPassword);
