import { describe, it, expect } from 'vitest';
import { parseSyncEnvelope } from './schema';

describe('parseSyncEnvelope', () => {
  it('parses valid envelope', () => {
    const raw = {
      vaultCiphertext: '{"salt":"x","nonce":"n","ciphertext":"abc","version":1}',
      revision: 1,
      deviceId: 'dev-123',
      updatedAt: '2025-01-15T12:00:00Z',
    };
    const parsed = parseSyncEnvelope(raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.vaultCiphertext).toBe(raw.vaultCiphertext);
    expect(parsed!.revision).toBe(1);
    expect(parsed!.deviceId).toBe('dev-123');
    expect(parsed!.updatedAt).toBe(raw.updatedAt);
    expect(parsed!.attachments).toBeUndefined();
  });

  it('parses envelope with attachments', () => {
    const raw = {
      vaultCiphertext: '{}',
      revision: 2,
      deviceId: 'd',
      updatedAt: '2025-01-15T12:00:00Z',
      attachments: { att1: 'base64blob1', att2: 'base64blob2' },
    };
    const parsed = parseSyncEnvelope(raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.attachments).toEqual({ att1: 'base64blob1', att2: 'base64blob2' });
  });

  it('returns null for null/undefined', () => {
    expect(parseSyncEnvelope(null)).toBeNull();
    expect(parseSyncEnvelope(undefined)).toBeNull();
  });

  it('returns null for non-object', () => {
    expect(parseSyncEnvelope('string')).toBeNull();
    expect(parseSyncEnvelope(123)).toBeNull();
  });

  it('returns null for missing vaultCiphertext', () => {
    expect(
      parseSyncEnvelope({
        revision: 1,
        deviceId: 'd',
        updatedAt: '2025-01-15T12:00:00Z',
      })
    ).toBeNull();
  });

  it('returns null for invalid revision', () => {
    expect(
      parseSyncEnvelope({
        vaultCiphertext: 'x',
        revision: -1,
        deviceId: 'd',
        updatedAt: '2025-01-15T12:00:00Z',
      })
    ).toBeNull();
    expect(
      parseSyncEnvelope({
        vaultCiphertext: 'x',
        revision: 1.5,
        deviceId: 'd',
        updatedAt: '2025-01-15T12:00:00Z',
      })
    ).toBeNull();
  });

  it('returns null for invalid attachments (non-object values)', () => {
    expect(
      parseSyncEnvelope({
        vaultCiphertext: 'x',
        revision: 1,
        deviceId: 'd',
        updatedAt: '2025-01-15T12:00:00Z',
        attachments: { a: 123 },
      })
    ).toBeNull();
  });
});
