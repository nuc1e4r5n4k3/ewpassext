import React from 'react';
import { createRoot } from 'react-dom/client';
import { Popup } from './components/popup/Popup.component';
import { importBackup, importLegacyBackup, serializeAll } from './lib/storage';

createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Popup />
    </React.StrictMode>
);

(window as any).storage = {
    dump: serializeAll,
    'import': importBackup,
    importLegacy: importLegacyBackup
};
