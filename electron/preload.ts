import { contextBridge, ipcRenderer } from 'electron';
import type { VaultApi } from '../shared/types/preload';

const vaultApi: VaultApi = {
  exists: () => ipcRenderer.invoke('vault:exists'),
  getState: () => ipcRenderer.invoke('vault:getState'),
  create: (masterPassword: string) => ipcRenderer.invoke('vault:create', masterPassword),
  unlock: (password: string) => ipcRenderer.invoke('vault:unlock', password),
  lock: () => ipcRenderer.invoke('vault:lock'),
  addItem: (item) => ipcRenderer.invoke('vault:addItem', item),
  updateItem: (id, updates) => ipcRenderer.invoke('vault:updateItem', id, updates),
  deleteItem: (id) => ipcRenderer.invoke('vault:deleteItem', id),
  listItems: async () => {
    const state = await ipcRenderer.invoke('vault:getState');
    return state?.items ?? [];
  },
  search: (query: string) => ipcRenderer.invoke('vault:search', query),
  saveItem: async (item) => {
    if ('id' in item && item.id) {
      return ipcRenderer.invoke('vault:updateItem', item.id, item);
    }
    return ipcRenderer.invoke('vault:addItem', item);
  },
  exportEncrypted: (password: string) => ipcRenderer.invoke('vault:exportEncrypted', password),
  importEncrypted: (encrypted, password: string) => ipcRenderer.invoke('vault:importEncrypted', encrypted, password),
  pickFile: (options) => ipcRenderer.invoke('vault:pickFile', options),
  readAndParseRecoveryFile: (filePath: string) => ipcRenderer.invoke('vault:readAndParseRecoveryFile', filePath),
  attachFile: (itemId: string) => ipcRenderer.invoke('vault:attachFile', itemId),
  removeAttachment: (itemId: string, attachmentId: string) => ipcRenderer.invoke('vault:removeAttachment', itemId, attachmentId),
  openAttachment: (attachmentId: string) => ipcRenderer.invoke('vault:openAttachment', attachmentId),
  exportBundle: () => ipcRenderer.invoke('vault:exportBundle'),
  importBundleReplace: (filePath: string, password: string) => ipcRenderer.invoke('vault:importBundle', filePath, password, 'replace'),
  importBundleMerge: (filePath: string, password: string) => ipcRenderer.invoke('vault:importBundle', filePath, password, 'merge'),
  importBundle: (filePath: string, password: string, mode: 'replace' | 'merge') => ipcRenderer.invoke('vault:importBundle', filePath, password, mode),
  getLastBackup: () => ipcRenderer.invoke('vault:getLastBackup'),
  copyWithTimeout: (text: string) => ipcRenderer.invoke('vault:copyWithTimeout', text),
  onLocked: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('vault:locked', listener);
    return () => {
      ipcRenderer.removeListener('vault:locked', listener);
    };
  },
};

contextBridge.exposeInMainWorld('vault', vaultApi);
