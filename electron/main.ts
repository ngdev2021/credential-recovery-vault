import { app, BrowserWindow, ipcMain, dialog, shell, clipboard, powerMonitor } from 'electron';
import { join } from 'path';
import { readEncryptedVault } from './vaultStore';
import {
  vaultExists,
  createVault,
  unlockVault,
  saveVault,
  exportVaultEncrypted,
  importVaultEncrypted,
  exportVaultBundle,
  importVaultBundleReplace,
  importVaultBundleMerge,
  collectAttachmentIds,
} from './vaultStore';
import {
  saveEncryptedAttachment,
  decryptAttachment,
  deleteAttachmentBlob,
  computeFileSha256,
} from './attachmentsStore';
import { getVaultKey } from './crypto/vaultCrypto';
import { saveLastBackupInfo, getLastBackupInfo } from './backupStore';
import {
  getStatus,
  configure,
  start,
  stop,
  pushOnce,
  pullOnce,
  applyRemoteEnvelope,
  onStatus,
  bumpRevision,
} from './sync/syncEngine';
import type { VaultPayload, VaultItem, EncryptedVault, VaultAttachment, VaultExportBundle } from '../shared/types/vault';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, readFile, mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';

let mainWindow: BrowserWindow | null = null;
let decryptedPayload: VaultPayload | null = null;
let masterPassword: string | null = null;
let vaultKey: Buffer | null = null;

function clearSensitiveData(): void {
  decryptedPayload = null;
  masterPassword = null;
  vaultKey = null;
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false,
  });

  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
    clearSensitiveData();
  });

  mainWindow.on('blur', () => {
    if (decryptedPayload || masterPassword) {
      clearSensitiveData();
      mainWindow?.webContents.send('vault:locked');
    }
  });
}

function lockOnSuspendOrScreenLock(): void {
  if (!decryptedPayload && !masterPassword) return;
  clearSensitiveData();
  mainWindow?.webContents.send('vault:locked');
}

app.whenReady().then(() => {
  createWindow();
  powerMonitor.on('lock-screen', lockOnSuspendOrScreenLock);
  powerMonitor.on('suspend', lockOnSuspendOrScreenLock);
});
app.on('window-all-closed', () => app.quit());
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('vault:exists', async () => vaultExists());

ipcMain.handle('vault:create', async (_, masterPasswordArg: string) => {
  await createVault(masterPasswordArg);
  const encrypted = await readEncryptedVault();
  if (encrypted) vaultKey = await getVaultKey(masterPasswordArg, encrypted.salt);
  const payload = await unlockVault(masterPasswordArg);
  decryptedPayload = payload;
  masterPassword = masterPasswordArg;
  return { success: true, metadata: payload.metadata };
});

ipcMain.handle('vault:unlock', async (_, password: string) => {
  const encrypted = await readEncryptedVault();
  if (!encrypted) throw new Error('No vault found.');
  vaultKey = await getVaultKey(password, encrypted.salt);
  const payload = await unlockVault(password);
  decryptedPayload = payload;
  masterPassword = password;
  return { success: true, metadata: payload.metadata, items: payload.items };
});

ipcMain.handle('vault:lock', async () => {
  clearSensitiveData();
  return { success: true };
});

ipcMain.handle('vault:getState', async () => {
  if (!decryptedPayload) return null;
  return {
    metadata: decryptedPayload.metadata,
    items: decryptedPayload.items,
  };
});

ipcMain.handle('vault:addItem', async (_, item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>) => {
  if (!decryptedPayload || !masterPassword) {
    throw new Error('Vault is locked');
  }
  const now = new Date().toISOString();
  const newItem: VaultItem = {
    ...item,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  decryptedPayload.items.push(newItem);
  decryptedPayload.metadata.itemCount = decryptedPayload.items.length;
  decryptedPayload.metadata.updatedAt = now;

  const allTags = new Set(decryptedPayload.metadata.tags);
  item.tags.forEach((t) => allTags.add(t));
  decryptedPayload.metadata.tags = Array.from(allTags);

  await saveVault(masterPassword, decryptedPayload);
  await bumpRevision();
  return newItem;
});

ipcMain.handle('vault:updateItem', async (_, id: string, updates: Partial<VaultItem>) => {
  if (!decryptedPayload || !masterPassword) {
    throw new Error('Vault is locked');
  }
  const index = decryptedPayload.items.findIndex((i) => i.id === id);
  if (index === -1) throw new Error('Item not found');

  const { id: _id, createdAt, ...allowable } = updates;
  decryptedPayload.items[index] = {
    ...decryptedPayload.items[index],
    ...allowable,
    updatedAt: new Date().toISOString(),
  };

  decryptedPayload.metadata.updatedAt = decryptedPayload.items[index].updatedAt;
  const allTags = new Set<string>();
  decryptedPayload.items.forEach((i) => i.tags.forEach((t) => allTags.add(t)));
  decryptedPayload.metadata.tags = Array.from(allTags);

  await saveVault(masterPassword, decryptedPayload);
  await bumpRevision();
  return decryptedPayload.items[index];
});

ipcMain.handle('vault:deleteItem', async (_, id: string) => {
  if (!decryptedPayload || !masterPassword) {
    throw new Error('Vault is locked');
  }
  const item = decryptedPayload.items.find((i) => i.id === id);
  if (item?.attachments) {
    for (const a of item.attachments) {
      await deleteAttachmentBlob(a.id);
    }
  }
  decryptedPayload.items = decryptedPayload.items.filter((i) => i.id !== id);
  decryptedPayload.metadata.itemCount = decryptedPayload.items.length;
  decryptedPayload.metadata.updatedAt = new Date().toISOString();
  const allTags = new Set<string>();
  decryptedPayload.items.forEach((i) => i.tags.forEach((t) => allTags.add(t)));
  decryptedPayload.metadata.tags = Array.from(allTags);
  await saveVault(masterPassword, decryptedPayload);
  await bumpRevision();
  return { success: true };
});

ipcMain.handle('vault:search', async (_, query: string) => {
  if (!decryptedPayload) return [];
  const q = query.toLowerCase().trim();
  if (!q) return decryptedPayload.items;
  return decryptedPayload.items.filter(
    (i) =>
      i.title.toLowerCase().includes(q) ||
      i.domain.toLowerCase().includes(q) ||
      i.tags.some((t) => t.toLowerCase().includes(q)) ||
      i.usernames.some((u) => u.toLowerCase().includes(q))
  );
});

ipcMain.handle('vault:exportEncrypted', async (_, password: string) => {
  const encrypted = await exportVaultEncrypted(password);
  return encrypted;
});

ipcMain.handle('vault:importEncrypted', async (_, encrypted: EncryptedVault, password: string) => {
  await importVaultEncrypted(encrypted, password);
  vaultKey = await getVaultKey(password, encrypted.salt);
  decryptedPayload = await unlockVault(password);
  masterPassword = password;
  return {
    success: true,
    metadata: decryptedPayload!.metadata,
    items: decryptedPayload!.items,
  };
});

ipcMain.handle('vault:exportBundle', async () => {
  if (!decryptedPayload || !masterPassword) throw new Error('Vault is locked');
  const bundle = await exportVaultBundle(masterPassword, decryptedPayload);
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: `vault-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'Vault backup', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePath) return null;
  await writeFile(result.filePath, JSON.stringify(bundle), 'utf-8');
  await saveLastBackupInfo({
    path: result.filePath,
    exportedAt: new Date().toISOString(),
  });
  return { path: result.filePath };
});

function validateBundleStructure(bundle: unknown): bundle is VaultExportBundle {
  if (!bundle || typeof bundle !== 'object') return false;
  const b = bundle as Record<string, unknown>;
  if (!b.vault || typeof b.vault !== 'object') return false;
  if (!b.attachments || typeof b.attachments !== 'object') return false;
  return true;
}

ipcMain.handle('vault:importBundle', async (_, filePath: string, password: string, mode: 'replace' | 'merge') => {
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch (e) {
    throw new Error('Could not read backup file');
  }
  let bundle: VaultExportBundle;
  try {
    bundle = JSON.parse(raw) as VaultExportBundle;
  } catch {
    throw new Error('Invalid vault backup: malformed JSON');
  }
  if (!validateBundleStructure(bundle)) {
    throw new Error('Invalid vault backup: missing vault or attachments');
  }

  if (mode === 'replace') {
    await importVaultBundleReplace(bundle, password);
    vaultKey = await getVaultKey(password, bundle.vault.salt);
    decryptedPayload = await unlockVault(password);
    masterPassword = password;
  } else {
    if (!masterPassword) throw new Error('Vault must be unlocked to merge');
    decryptedPayload = await importVaultBundleMerge(bundle, password, masterPassword);
  }
  return {
    success: true,
    metadata: decryptedPayload!.metadata,
    items: decryptedPayload!.items,
  };
});

ipcMain.handle('vault:getLastBackup', async () => getLastBackupInfo());

const CLIPBOARD_TIMEOUT_MS = 30 * 1000;
ipcMain.handle('vault:copyWithTimeout', async (_, text: string) => {
  clipboard.writeText(text);
  setTimeout(() => {
    if (clipboard.readText() === text) {
      clipboard.clear();
    }
  }, CLIPBOARD_TIMEOUT_MS);
});

ipcMain.handle('vault:pickFile', async (_, options?: { forImport?: boolean; forBundle?: boolean }) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: options?.forBundle
      ? [{ name: 'Vault backup', extensions: ['json'] }, { name: 'All files', extensions: ['*'] }]
      : options?.forImport
        ? [
            { name: 'Text files', extensions: ['txt', 'csv'] },
            { name: 'All files', extensions: ['*'] },
          ]
        : [
            { name: 'Documents', extensions: ['txt', 'csv', 'pdf', 'png', 'jpg', 'jpeg'] },
            { name: 'All files', extensions: ['*'] },
          ],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return result.filePaths[0];
});

ipcMain.handle('vault:readAndParseRecoveryFile', async (_, filePath: string) => {
  const fs = await import('fs/promises');
  const text = await fs.readFile(filePath, 'utf-8');
  const path = await import('path');
  const filename = path.basename(filePath);
  return { text, filename };
});

ipcMain.handle('vault:attachFile', async (_, itemId: string) => {
  if (!decryptedPayload || !masterPassword || !vaultKey) {
    throw new Error('Vault is locked');
  }
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: 'Documents', extensions: ['txt', 'csv', 'pdf', 'png', 'jpg', 'jpeg'] },
      { name: 'All files', extensions: ['*'] },
    ],
  });
  if (result.canceled || !result.filePaths[0]) return null;

  const index = decryptedPayload.items.findIndex((i) => i.id === itemId);
  if (index === -1) throw new Error('Item not found');

  const item = decryptedPayload.items[index];
  const newSha256 = await computeFileSha256(result.filePaths[0]);
  const exists = (item.attachments ?? []).some((a) => a.sha256 === newSha256);
  if (exists) return null;

  const { attachment } = await saveEncryptedAttachment(result.filePaths[0], vaultKey);
  const attachments = [...(item.attachments ?? []), attachment];
  decryptedPayload.items[index] = {
    ...item,
    attachments,
    updatedAt: new Date().toISOString(),
  };

  await saveVault(masterPassword, decryptedPayload);
  await bumpRevision();
  return attachment;
});

ipcMain.handle('vault:removeAttachment', async (_, itemId: string, attachmentId: string) => {
  if (!decryptedPayload || !masterPassword) {
    throw new Error('Vault is locked');
  }
  const index = decryptedPayload.items.findIndex((i) => i.id === itemId);
  if (index === -1) throw new Error('Item not found');

  const item = decryptedPayload.items[index];
  const attachments = (item.attachments ?? []).filter((a) => a.id !== attachmentId);
  decryptedPayload.items[index] = {
    ...item,
    attachments,
    updatedAt: new Date().toISOString(),
  };

  await deleteAttachmentBlob(attachmentId);
  await saveVault(masterPassword, decryptedPayload);
  await bumpRevision();
  return { success: true };
});

ipcMain.handle('vault:openAttachment', async (_, attachmentId: string) => {
  if (!decryptedPayload || !vaultKey) {
    throw new Error('Vault is locked');
  }
  let attachment: VaultAttachment | null = null;
  for (const item of decryptedPayload.items) {
    const found = (item.attachments ?? []).find((a) => a.id === attachmentId);
    if (found) {
      attachment = found;
      break;
    }
  }
  if (!attachment) throw new Error('Attachment not found');

  const decrypted = await decryptAttachment(attachment, vaultKey);
  const tmpDir = await mkdtemp(join(tmpdir(), 'vault-attach-'));
  const tmpPath = join(tmpDir, attachment.filename);
  await writeFile(tmpPath, decrypted);
  await shell.openPath(tmpPath);
  return { success: true };
});

// --- vaultSync IPC ---
onStatus((status) => {
  mainWindow?.webContents.send('vaultSync:status', status);
});

ipcMain.handle('vaultSync:getStatus', async () => getStatus());

ipcMain.handle('vaultSync:configure', async (_, config: { serverUrl: string; deviceName: string; syncToken?: string }) =>
  configure(config)
);

ipcMain.handle('vaultSync:start', async () => start());

ipcMain.handle('vaultSync:stop', () => {
  stop();
  return undefined;
});

ipcMain.handle('vaultSync:pushOnce', async () => {
  if (!decryptedPayload) throw new Error('Vault is locked');
  const ids = collectAttachmentIds(decryptedPayload);
  return pushOnce(ids);
});

ipcMain.handle('vaultSync:pullOnce', async () => pullOnce());

ipcMain.handle('vaultSync:applyRemote', async (_, password: string) => {
  const status = await applyRemoteEnvelope(password);
  if (status.state === 'configured') {
    const payload = await unlockVault(password);
    const encrypted = await readEncryptedVault();
    if (encrypted) vaultKey = await getVaultKey(password, encrypted.salt);
    decryptedPayload = payload;
    masterPassword = password;
    return { ...status, refreshed: true, items: payload.items };
  }
  return status;
});
