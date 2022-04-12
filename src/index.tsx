import React from 'react';
import { createRoot } from 'react-dom/client';
import { Popup } from './components/popup/Popup.component';

createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Popup />
    </React.StrictMode>
);
