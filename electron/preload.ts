import { contextBridge, ipcRenderer } from 'electron';
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
  pickFile: (options?: { forImport?: boolean }) =>
    ipcRenderer.invoke('vault:pickFile', options),
  readAndParseRecoveryFile: (filePath: string) =>
    ipcRenderer.invoke('vault:readAndParseRecoveryFile', filePath),
  attachFile: (itemId: string) => ipcRenderer.invoke('vault:attachFile', itemId),
  removeAttachment: (itemId: string, attachmentId: string) =>
    ipcRenderer.invoke('vault:removeAttachment', itemId, attachmentId),
  openAttachment: (attachmentId: string) =>
    ipcRenderer.invoke('vault:openAttachment', attachmentId),
};

contextBridge.exposeInMainWorld('vault', vaultApi);

declare global {
  interface Window {
    vault: typeof vaultApi;
  }
}
