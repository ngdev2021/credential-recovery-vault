/** Opaque device identifier for sync metadata (e.g. UUID). */
export type DeviceId = string;

/** Sync state machine states. */
export type SyncStatus =
  | { state: 'idle' }
  | { state: 'configuring' }
  | { state: 'configured'; serverUrl: string; deviceName: string }
  | { state: 'syncing'; direction: 'push' | 'pull' }
  | { state: 'conflict'; remoteNewer: boolean; localRevision: number; remoteRevision: number }
  | { state: 'error'; error: SyncError }
  | { state: 'stopped' };

/** Structured sync error for IPC/UI. */
export interface SyncError {
  code: string;
  message: string;
  details?: unknown;
}

/** Configuration for sync (server URL, device name, optional shared token). */
export interface SyncConfig {
  serverUrl: string;
  deviceName: string;
  /** Optional shared sync token for placeholder auth; not used for encryption. */
  syncToken?: string;
}

/**
 * Envelope sent to/stored by server. Client encrypts everything;
 * server stores ciphertext + minimal metadata only.
 */
export interface SyncEnvelope {
  /** Encrypted vault (already encrypted by vault crypto). */
  vaultCiphertext: string;
  /** Optional encrypted attachment blobs: attachmentId -> base64. */
  attachments?: Record<string, string>;
  /** Monotonic revision sequence. */
  revision: number;
  /** Device that produced this revision. */
  deviceId: DeviceId;
  /** ISO timestamp when this revision was created. */
  updatedAt: string;
}
