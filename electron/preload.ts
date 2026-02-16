import { contextBridge, ipcRenderer } from 'electron';

ipcRenderer.on('vault:locked', () => {
  window.dispatchEvent(new Event('vault-locked'));
});
import type { VaultItem, EncryptedVault, VaultAttachment } from '../shared/types/vault';

const vaultApi = {
  exists: () => ipcRenderer.invoke('vault:exists'),
  create: (masterPassword: string) =>
    ipcRenderer.invoke('vault:create', masterPassword),
  unlock: (password: string) => ipcRenderer.invoke('vault:unlock', password),
  lock: () => ipcRenderer.invoke('vault:lock'),
  getState: () => ipcRenderer.invoke('vault:getState'),
  addItem: (item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>) =>
    ipcRenderer.invoke('vault:addItem', item),
  updateItem: (id: string, updates: Partial<VaultItem>) =>
    ipcRenderer.invoke('vault:updateItem', id, updates),
  deleteItem: (id: string) => ipcRenderer.invoke('vault:deleteItem', id),
  search: (query: string) => ipcRenderer.invoke('vault:search', query),
  exportEncrypted: (password: string) =>
    ipcRenderer.invoke('vault:exportEncrypted', password),
  importEncrypted: (encrypted: EncryptedVault, password: string) =>
    ipcRenderer.invoke('vault:importEncrypted', encrypted, password),
  pickFile: (options?: { forImport?: boolean; forBundle?: boolean }) =>
    ipcRenderer.invoke('vault:pickFile', options),
  readAndParseRecoveryFile: (filePath: string) =>
    ipcRenderer.invoke('vault:readAndParseRecoveryFile', filePath),
  attachFile: (itemId: string) => ipcRenderer.invoke('vault:attachFile', itemId),
  removeAttachment: (itemId: string, attachmentId: string) =>
    ipcRenderer.invoke('vault:removeAttachment', itemId, attachmentId),
  openAttachment: (attachmentId: string) =>
    ipcRenderer.invoke('vault:openAttachment', attachmentId),
  exportBundle: () => ipcRenderer.invoke('vault:exportBundle'),
  getLastBackup: () => ipcRenderer.invoke('vault:getLastBackup'),
  copyWithTimeout: (text: string) => ipcRenderer.invoke('vault:copyWithTimeout', text),
  importBundle: (filePath: string, password: string, mode: 'replace' | 'merge') =>
    ipcRenderer.invoke('vault:importBundle', filePath, password, mode),
};

const vaultSyncApi = {
  getStatus: () => ipcRenderer.invoke('vaultSync:getStatus'),
  configure: (config: { serverUrl: string; deviceName: string; syncToken?: string }) =>
    ipcRenderer.invoke('vaultSync:configure', config),
  start: () => ipcRenderer.invoke('vaultSync:start'),
  stop: () => ipcRenderer.invoke('vaultSync:stop'),
  pushOnce: () => ipcRenderer.invoke('vaultSync:pushOnce'),
  pullOnce: () => ipcRenderer.invoke('vaultSync:pullOnce'),
  applyRemote: (password: string) => ipcRenderer.invoke('vaultSync:applyRemote', password),
  onStatus: (handler: (status: unknown) => void) => {
    const listener = (_: unknown, status: unknown) => handler(status);
    ipcRenderer.on('vaultSync:status', listener);
    return () => ipcRenderer.removeListener('vaultSync:status', listener);
  },
};

contextBridge.exposeInMainWorld('vault', vaultApi);
contextBridge.exposeInMainWorld('vaultSync', vaultSyncApi);

declare global {
  interface Window {
    vault: typeof vaultApi;
    vaultSync: typeof vaultSyncApi;
  }
}
