/**
 * Sync engine: computes revision, pushes/pulls encrypted vault + attachments,
 * detects conflicts. Never auto-overwrites without user action.
 */
import { readEncryptedVault, writeEncryptedVault } from '../vaultStore';
import { readAttachmentBlobRaw, writeAttachmentBlobRaw } from '../attachmentsStore';
import type { EncryptedVault } from '../../shared/types/vault';
import { pushEnvelope, pullEnvelope } from './syncApi';
import { loadSyncConfig, saveSyncConfig } from './syncConfigStore';
import { getSyncMeta, setRevision, bumpRevision } from './syncRevisionStore';
import { compareRevisions } from '../../shared/sync/mergeDecision';
import type {
  SyncStatus,
  SyncError,
  SyncConfig,
  SyncEnvelope,
  DeviceId,
} from '../../shared/sync/types';
import { decryptVault } from '../crypto/vaultCrypto';

/** Build SyncEnvelope from local encrypted vault + attachments. */
function buildEnvelopeFromLocal(
  vaultCiphertext: string,
  attachmentsBase64: Record<string, string>,
  revision: number,
  deviceId: DeviceId
): SyncEnvelope {
  return {
    vaultCiphertext,
    attachments: Object.keys(attachmentsBase64).length > 0 ? attachmentsBase64 : undefined,
    revision,
    deviceId,
    updatedAt: new Date().toISOString(),
  };
}

export type StatusListener = (status: SyncStatus) => void;

const listeners: Set<StatusListener> = new Set();

function emitStatus(status: SyncStatus): void {
  listeners.forEach((fn) => {
    try {
      fn(status);
    } catch {
      // ignore listener errors
    }
  });
}

export function onStatus(handler: StatusListener): () => void {
  listeners.add(handler);
  return () => listeners.delete(handler);
}

let cachedStatus: SyncStatus = { state: 'idle' };

export function getStatus(): SyncStatus {
  return cachedStatus;
}

function setStatus(s: SyncStatus): void {
  cachedStatus = s;
  emitStatus(s);
}

export async function configure(config: { serverUrl: string; deviceName: string; syncToken?: string }): Promise<SyncStatus> {
  setStatus({ state: 'configuring' });
  try {
    const fullConfig: SyncConfig = {
      serverUrl: config.serverUrl,
      deviceName: config.deviceName,
      syncToken: config.syncToken,
    };
    await saveSyncConfig(fullConfig);
    const status: SyncStatus = {
      state: 'configured',
      serverUrl: fullConfig.serverUrl,
      deviceName: fullConfig.deviceName,
    };
    setStatus(status);
    return status;
  } catch (e) {
    const err: SyncError = {
      code: 'CONFIGURE_FAILED',
      message: e instanceof Error ? e.message : String(e),
    };
    setStatus({ state: 'error', error: err });
    return cachedStatus;
  }
}

export async function start(): Promise<SyncStatus> {
  const config = await loadSyncConfig();
  if (!config) {
    setStatus({
      state: 'error',
      error: { code: 'NOT_CONFIGURED', message: 'Sync is not configured. Call configure() first.' },
    });
    return cachedStatus;
  }
  setStatus({
    state: 'configured',
    serverUrl: config.serverUrl,
    deviceName: config.deviceName,
  });
  return cachedStatus;
}

export function stop(): void {
  setStatus({ state: 'stopped' });
}

/** Push local vault to server. Requires vault to exist. */
export async function pushOnce(attachmentIds: string[]): Promise<SyncStatus> {
  setStatus({ state: 'syncing', direction: 'push' });

  const config = await loadSyncConfig();
  if (!config) {
    setStatus({
      state: 'error',
      error: { code: 'NOT_CONFIGURED', message: 'Sync is not configured.' },
    });
    return cachedStatus;
  }

  const encrypted = await readEncryptedVault();
  if (!encrypted) {
    setStatus({
      state: 'error',
      error: { code: 'NO_VAULT', message: 'No vault to sync.' },
    });
    return cachedStatus;
  }

  const meta = await getSyncMeta();
  const vaultCiphertext = JSON.stringify(encrypted);

  // attachmentIds passed from main (gathered from decryptedPayload when unlocked)
  const attachments: Record<string, string> = {};
  for (const id of attachmentIds) {
    try {
      const blob = await readAttachmentBlobRaw(id);
      attachments[id] = blob.toString('base64');
    } catch {
      // skip missing
    }
  }

  const envelope = await buildEnvelopeFromLocal(
    vaultCiphertext,
    attachments,
    meta.revision,
    meta.deviceId
  );

  const result = await pushEnvelope(config, envelope);
  if (!result.ok) {
    setStatus({ state: 'error', error: result.error! });
    return cachedStatus;
  }

  setStatus({
    state: 'configured',
    serverUrl: config.serverUrl,
    deviceName: config.deviceName,
  });
  return cachedStatus;
}

/** Pull from server. Detects conflicts; never auto-applies. Returns status; conflict surfaced for user. */
export async function pullOnce(): Promise<SyncStatus> {
  setStatus({ state: 'syncing', direction: 'pull' });

  const config = await loadSyncConfig();
  if (!config) {
    setStatus({
      state: 'error',
      error: { code: 'NOT_CONFIGURED', message: 'Sync is not configured.' },
    });
    return cachedStatus;
  }

  const result = await pullEnvelope(config);
  if (!result.ok) {
    setStatus({ state: 'error', error: result.error! });
    return cachedStatus;
  }

  const remote = result.data;
  const localRevision = (await getSyncMeta()).revision;

  if (!remote) {
    setStatus({
      state: 'configured',
      serverUrl: config.serverUrl,
      deviceName: config.deviceName,
    });
    return cachedStatus;
  }

  const decision = compareRevisions(localRevision, remote.revision);

  if (decision.same) {
    setStatus({
      state: 'configured',
      serverUrl: config.serverUrl,
      deviceName: config.deviceName,
    });
    return cachedStatus;
  }

  setStatus({
    state: 'conflict',
    remoteNewer: decision.remoteNewer,
    localRevision,
    remoteRevision: remote.revision,
  });
  return cachedStatus;
}

/**
 * Apply remote envelope (replace local). Called after user confirms.
 * Requires masterPassword to verify vault can be decrypted (we don't store password).
 */
export async function applyRemoteEnvelope(
  masterPassword: string
): Promise<SyncStatus> {
  const config = await loadSyncConfig();
  if (!config) {
    setStatus({
      state: 'error',
      error: { code: 'NOT_CONFIGURED', message: 'Sync is not configured.' },
    });
    return cachedStatus;
  }

  const result = await pullEnvelope(config);
  if (!result.ok || !result.data) {
    setStatus(result.error ? { state: 'error', error: result.error } : cachedStatus);
    return cachedStatus;
  }

  const envelope = result.data;
  let encrypted: EncryptedVault;
  try {
    encrypted = JSON.parse(envelope.vaultCiphertext) as EncryptedVault;
  } catch {
    setStatus({
      state: 'error',
      error: { code: 'INVALID_ENVELOPE', message: 'Invalid vault ciphertext from server.' },
    });
    return cachedStatus;
  }

  await decryptVault(encrypted, masterPassword);
  await writeEncryptedVault(encrypted);

  if (envelope.attachments) {
    for (const [id, b64] of Object.entries(envelope.attachments)) {
      await writeAttachmentBlobRaw(id, Buffer.from(b64, 'base64'));
    }
  }

  await setRevision(envelope.revision);

  setStatus({
    state: 'configured',
    serverUrl: config.serverUrl,
    deviceName: config.deviceName,
  });
  return cachedStatus;
}

/**
 * Called when user chooses "replace remote with local". Pushes and bumps local revision.
 * Requires attachmentIds (from main when unlocked).
 */
export async function pushAndBumpRevision(attachmentIds: string[]): Promise<SyncStatus> {
  const status = await pushOnce(attachmentIds);
  if (cachedStatus.state === 'error') return status;
  await bumpRevision();
  return getStatus();
}

// Remove unused imports and the old pushOnce that had the decrypt issue.
// Also need to export bumpRevision for main to call on vault save.
export { bumpRevision };
