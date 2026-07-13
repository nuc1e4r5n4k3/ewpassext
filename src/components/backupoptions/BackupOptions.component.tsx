import { useContext, useEffect, useState } from 'react';
import classes from './BackupOptions.module.scss';
import { ConfigurationContext } from '../contexts/ConfigurationContext.component';
import { UIGroup } from '../uiutils/UIGroup.component';
import { Row } from '../uiutils/Row.component';
import { RowHeader } from '../uiutils/RowHeader.component';
import { preParseBackup } from '../../lib/storage';
import { Permissions, permissions } from '../../lib/browsercompat';

const CLIPBOARD_PERMISSION: Permissions = { permissions: ['clipboardRead'] };


export const BackupOptions: React.FC = () => {
    const storage = useContext(ConfigurationContext);
    const [clipboardText, setClipboardText] = useState<string | null>();
    const [importText, setImportText] = useState<string>();
    const [backupConfigurations, setBackupConfigurations] = useState<number>();
    const [importStatus, setImportStatus] = useState<string>('Checking...');
    const [overwriteExisting, setOverwriteExisting] = useState<boolean>(false);

    useEffect(() => {
        if (clipboardText === undefined || clipboardText === null) {
            setBackupConfigurations(undefined);
            setImportText(undefined);
        } else {
            const importString = clipboardText.trim();
            const configsInBackup = preParseBackup(importString);
            setBackupConfigurations(configsInBackup);
            setImportText(configsInBackup !== undefined ? importString : undefined);
        }
    }, [clipboardText])

    useEffect(() => {
        const readClipboardIfAllowed = async () => {
            if (await permissions.contains(CLIPBOARD_PERMISSION)) {
                try {
                    setClipboardText(await navigator.clipboard.readText());
                } catch {
                    setClipboardText(null);
                }
            } else {
                setClipboardText(null);
            }
        };
        readClipboardIfAllowed();
    }, [])

    useEffect(() => {
        const getStatusLine = () => {
            if (!storage.importConfigurations) return 'Storage layer not ready';
            if (clipboardText === undefined) return 'Waiting...';
            if (clipboardText === null) return 'Missing permission';
            if (backupConfigurations === undefined) {
                if (clipboardText) return 'Clipboard data invalid';
                return 'Clipboard empty';
            }
            return 'Ready to import';
        };
        setImportStatus(getStatusLine());
    }, [backupConfigurations, clipboardText]);

    const exportConfig = async () => {
        if (!storage.exportConfigurations) {
            return;
        }

        const backupText = await storage.exportConfigurations();
        const configsInBackup = preParseBackup(backupText);
        if (configsInBackup === undefined) {
            return;
        }

        await navigator.clipboard.writeText(backupText);
        setClipboardText(backupText);
    };

    const importConfig = async () => {
        if (storage.importConfigurations && importText !== undefined) {
            await storage.importConfigurations(importText, overwriteExisting);
        }
    };

    return (
        <UIGroup title='Backup & Restore'>
            <p className={classes.info}>Allows importing & exporting your domain configurations via the clipboard.</p>
            <div className={classes.table}>
                <Row>
                    <RowHeader value='Currently stored:' />
                    {storage.totalConfigurations ? <>{storage.totalConfigurations} configurations</> : <>Uninitialized</>}
                </Row>
                <Row>
                    <RowHeader value='Import clears existing:' />
                    <input type='checkbox' className={classes.checkbox} checked={overwriteExisting} onChange={e => setOverwriteExisting(e.target.checked)} />
                </Row>
                <Row>
                    <RowHeader value='Import status:' />
                    <>{importStatus}</>
                </Row>
                {backupConfigurations !== undefined ?
                    <Row>
                        <RowHeader value='Import contents:' />
                        {backupConfigurations} configurations
                    </Row> : <></>}
                <input type='button' value='Import from Clipboard' disabled={backupConfigurations === undefined || !storage.importConfigurations} className={classes.button} onClick={importConfig} />
                <input type='button' value='Export to Clipboard' className={classes.button} onClick={exportConfig} />
            </div>
        </UIGroup >
    );
}
