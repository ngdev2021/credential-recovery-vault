/// <reference types="vite/client" />

declare global {
  interface Window {
    vault: {
      exists: () => Promise<boolean>;
      create: (masterPassword: string) => Promise<{ success: boolean; metadata: unknown }>;
      unlock: (password: string) => Promise<{ success: boolean; metadata: unknown; items: unknown[] }>;
      lock: () => Promise<{ success: boolean }>;
      getState: () => Promise<{ metadata: unknown; items: unknown[] } | null>;
      addItem: (item: unknown) => Promise<unknown>;
      updateItem: (id: string, updates: unknown) => Promise<unknown>;
      deleteItem: (id: string) => Promise<{ success: boolean }>;
      search: (query: string) => Promise<unknown[]>;
      exportEncrypted: (password: string) => Promise<unknown>;
      importEncrypted: (encrypted: unknown, password: string) => Promise<unknown>;
      pickFile: (options?: { forImport?: boolean }) => Promise<string | null>;
      readAndParseRecoveryFile: (filePath: string) => Promise<{ text: string; filename: string }>;
      attachFile: (itemId: string) => Promise<unknown>;
      removeAttachment: (itemId: string, attachmentId: string) => Promise<{ success: boolean }>;
      openAttachment: (attachmentId: string) => Promise<{ success: boolean }>;
    };
  }
}

export {};
