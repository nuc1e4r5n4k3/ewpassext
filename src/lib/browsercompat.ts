
export const action =       (chrome !== undefined ? chrome.action       : browser.action)       as typeof chrome.action;
export const runtime =      (chrome !== undefined ? chrome.runtime      : browser.runtime)      as typeof chrome.runtime;
export const scripting =    (chrome !== undefined ? chrome.scripting    : browser.scripting)    as typeof chrome.scripting;
export const tabs =         (chrome !== undefined ? chrome.tabs         : browser.tabs)         as typeof chrome.tabs;
export const webNavigation =(chrome !== undefined ? chrome.webNavigation: browser.webNavigation)as typeof chrome.webNavigation;
export const windows =      (chrome !== undefined ? chrome.windows      : browser.windows)      as typeof chrome.windows;

const _everything = {
    'action': action,
    'runtime': runtime,
    'scripting': scripting,
    'tabs': tabs,
    'webNavigation': webNavigation,
    'windows': windows
};

export default _everything;
