import type { SyncEnvelope } from './types';

/**
 * Validates and parses a SyncEnvelope from unknown input.
 * Returns null if invalid.
 */
export function parseSyncEnvelope(raw: unknown): SyncEnvelope | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const vaultCiphertext = o.vaultCiphertext;
  if (typeof vaultCiphertext !== 'string' || !vaultCiphertext.trim()) return null;

  const revision = o.revision;
  if (typeof revision !== 'number' || !Number.isInteger(revision) || revision < 0) return null;

  const deviceId = o.deviceId;
  if (typeof deviceId !== 'string' || !deviceId.trim()) return null;

  const updatedAt = o.updatedAt;
  if (typeof updatedAt !== 'string' || !updatedAt.trim()) return null;

  const attachments = o.attachments;
  let attachmentsRecord: Record<string, string> | undefined;
  if (attachments !== undefined) {
    if (typeof attachments !== 'object' || attachments === null) return null;
    const entries = Object.entries(attachments);
    for (const [k, v] of entries) {
      if (typeof k !== 'string' || typeof v !== 'string') return null;
    }
    attachmentsRecord = attachments as Record<string, string>;
  }

  return {
    vaultCiphertext,
    attachments: attachmentsRecord,
    revision,
    deviceId,
    updatedAt,
  };
}
