/**
 * Sync API client. Communicates with a sync server that stores
 * ciphertext only. Uses optional sync token for placeholder auth.
 */
import type { SyncConfig, SyncEnvelope, SyncError } from '../../shared/sync/types';
import { parseSyncEnvelope } from '../../shared/sync/schema';

export interface SyncApiResult<T> {
  ok: boolean;
  data?: T;
  error?: SyncError;
}

const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

function toSyncError(e: unknown): SyncError {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as Error).message === 'string') {
    return {
      code: 'NETWORK_ERROR',
      message: (e as Error).message,
      details: e,
    };
  }
  return {
    code: 'UNKNOWN',
    message: String(e),
  };
}

export async function pushEnvelope(
  config: SyncConfig,
  envelope: SyncEnvelope
): Promise<SyncApiResult<void>> {
  const url = config.serverUrl.replace(/\/$/, '') + '/vault';
  const headers: Record<string, string> = { ...DEFAULT_HEADERS };
  if (config.syncToken) {
    headers['X-Sync-Token'] = config.syncToken;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(envelope),
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        error: {
          code: 'PUSH_FAILED',
          message: `Server returned ${res.status}: ${text.slice(0, 200)}`,
          details: { status: res.status },
        },
      };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toSyncError(e) };
  }
}

export async function pullEnvelope(
  config: SyncConfig
): Promise<SyncApiResult<SyncEnvelope | null>> {
  const url = config.serverUrl.replace(/\/$/, '') + '/vault';
  const headers: Record<string, string> = { ...DEFAULT_HEADERS };
  if (config.syncToken) {
    headers['X-Sync-Token'] = config.syncToken;
  }
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers,
    });
    if (res.status === 404) {
      return { ok: true, data: null };
    }
    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        error: {
          code: 'PULL_FAILED',
          message: `Server returned ${res.status}: ${text.slice(0, 200)}`,
          details: { status: res.status },
        },
      };
    }
    const raw = await res.json();
    const envelope = parseSyncEnvelope(raw);
    return { ok: true, data: envelope ?? null };
  } catch (e) {
    return { ok: false, error: toSyncError(e) };
  }
}
