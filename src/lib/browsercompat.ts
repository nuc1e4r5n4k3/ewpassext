import { on_chrome } from "./browserdetect";

export const action =       (on_chrome ? chrome.action       : browser.action)       as typeof chrome.action;
export const alarms =       (on_chrome ? chrome.alarms       : browser.alarms)       as typeof chrome.alarms;
export const storage =      (on_chrome ? chrome.storage      : browser.storage)      as typeof chrome.storage;
export const runtime =      (on_chrome ? chrome.runtime      : browser.runtime)      as typeof chrome.runtime;
export const scripting =    (on_chrome ? chrome.scripting    : browser.scripting)    as typeof chrome.scripting;
export const tabs =         (on_chrome ? chrome.tabs         : browser.tabs)         as typeof chrome.tabs;
export const webNavigation =(on_chrome ? chrome.webNavigation: browser.webNavigation)as typeof chrome.webNavigation;
export const windows =      (on_chrome ? chrome.windows      : browser.windows)      as typeof chrome.windows;

const _everything = {
    'action': action,
    'alarms': alarms,
    'storage': storage,
    'runtime': runtime,
    'scripting': scripting,
    'tabs': tabs,
    'webNavigation': webNavigation,
    'windows': windows
};

export default _everything;
