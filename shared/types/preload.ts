import type { EncryptedVault, VaultAttachment, VaultItem, VaultMetadata } from './vault';

export interface VaultState {
  metadata: VaultMetadata;
  items: VaultItem[];
}

export interface LastBackupInfo {
  path: string;
  exportedAt: string;
}

export interface ReadRecoveryFileResult {
  text: string;
  filename: string;
}

export type VaultSaveItemInput =
  | Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>
  | (Partial<VaultItem> & Pick<VaultItem, 'id'>);

export interface VaultApi {
  exists: () => Promise<boolean>;
  getState: () => Promise<VaultState | null>;
  create: (masterPassword: string) => Promise<{ success: true; metadata: VaultMetadata }>;
  unlock: (password: string) => Promise<{ success: true; metadata: VaultMetadata; items: VaultItem[] }>;
  lock: () => Promise<{ success: true }>;
  addItem: (item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<VaultItem>;
  updateItem: (id: string, updates: Partial<VaultItem>) => Promise<VaultItem>;
  saveItem: (item: VaultSaveItemInput) => Promise<VaultItem>;
  deleteItem: (id: string) => Promise<{ success: true }>;
  listItems: () => Promise<VaultItem[]>;
  search: (query: string) => Promise<VaultItem[]>;
  exportEncrypted: (password: string) => Promise<EncryptedVault>;
  importEncrypted: (encrypted: EncryptedVault, password: string) => Promise<{ success: true; metadata: VaultMetadata; items: VaultItem[] }>;
  pickFile: (options?: { forImport?: boolean; forBundle?: boolean }) => Promise<string | null>;
  readAndParseRecoveryFile: (filePath: string) => Promise<ReadRecoveryFileResult>;
  attachFile: (itemId: string) => Promise<VaultAttachment | null>;
  removeAttachment: (itemId: string, attachmentId: string) => Promise<{ success: true }>;
  openAttachment: (attachmentId: string) => Promise<string>;
  exportBundle: () => Promise<{ path: string } | null>;
  importBundleReplace: (filePath: string, password: string) => Promise<{ success: true; metadata: VaultMetadata; items: VaultItem[] }>;
  importBundleMerge: (filePath: string, password: string) => Promise<{ success: true; metadata: VaultMetadata; items: VaultItem[] }>;
  importBundle: (filePath: string, password: string, mode: 'replace' | 'merge') => Promise<{ success: true; metadata: VaultMetadata; items: VaultItem[] }>;
  getLastBackup: () => Promise<LastBackupInfo | null>;
  copyWithTimeout: (text: string) => Promise<void>;
  onLocked: (callback: () => void) => () => void;
}
