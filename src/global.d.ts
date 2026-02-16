import type { VaultApi } from '../shared/types/preload';

declare global {
  interface Window {
    vault: VaultApi;
  }
}

export {};
