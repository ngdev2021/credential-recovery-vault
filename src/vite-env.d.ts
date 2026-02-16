/// <reference types="vite/client" />

import type { VaultMetadata } from '../shared/types/vault';

declare global {
  interface Window {
    vault: {
      exists: () => Promise<boolean>;
      create: (masterPassword: string) => Promise<{ success: boolean; metadata: VaultMetadata }>;
      unlock: (password: string) => Promise<{ success: boolean; metadata: VaultMetadata; items: unknown[] }>;
      lock: () => Promise<{ success: boolean }>;
      getState: () => Promise<{ metadata: VaultMetadata; items: unknown[] } | null>;
      addItem: (item: unknown) => Promise<unknown>;
      updateItem: (id: string, updates: unknown) => Promise<unknown>;
      deleteItem: (id: string) => Promise<{ success: boolean }>;
      search: (query: string) => Promise<unknown[]>;
      exportEncrypted: (password: string) => Promise<unknown>;
      importEncrypted: (encrypted: unknown, password: string) => Promise<unknown>;
      pickFile: (options?: { forImport?: boolean; forBundle?: boolean }) => Promise<string | null>;
      readAndParseRecoveryFile: (filePath: string) => Promise<{ text: string; filename: string }>;
      attachFile: (itemId: string) => Promise<unknown>;
      removeAttachment: (itemId: string, attachmentId: string) => Promise<{ success: boolean }>;
      openAttachment: (attachmentId: string) => Promise<{ success: boolean }>;
      exportBundle: () => Promise<{ path: string } | null>;
      getLastBackup: () => Promise<{ path: string; exportedAt: string } | null>;
      copyWithTimeout: (text: string) => Promise<void>;
      importBundle: (filePath: string, password: string, mode: 'replace' | 'merge') => Promise<{ success: boolean; metadata: VaultMetadata; items: unknown[] }>;
    };
  }
}

export {};
