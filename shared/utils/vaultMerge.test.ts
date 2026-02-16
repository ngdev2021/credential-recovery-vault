import { describe, it, expect } from 'vitest';
import { remapAttachmentInItem, applyRotateToRecoveryCodes } from './vaultMerge';
import type { VaultItem, RecoveryCode, VaultAttachment } from '../types/vault';

describe('remapAttachmentInItem', () => {
  it('returns item unchanged when no attachments', () => {
    const item: VaultItem = {
      id: '1',
      title: 'Test',
      domain: 'test.com',
      category: 'other',
      usernames: [],
      password: '',
      recoveryCodes: [],
      notes: '',
      tags: [],
      createdAt: '',
      updatedAt: '',
    };
    const idMap = new Map([['a', 'b']]);
    expect(remapAttachmentInItem(item, idMap)).toBe(item);
  });

  it('remaps attachment IDs from idMap', () => {
    const att: VaultAttachment = {
      id: 'old1',
      filename: 'x.pdf',
      mimeType: 'application/pdf',
      size: 100,
      sha256: 'abc',
      createdAt: '',
      wrappedKey: '',
      keyNonce: '',
    };
    const item: VaultItem = {
      id: '1',
      title: 'Test',
      domain: 'test.com',
      category: 'other',
      usernames: [],
      password: '',
      recoveryCodes: [],
      notes: '',
      tags: [],
      attachments: [att],
      createdAt: '',
      updatedAt: '',
    };
    const idMap = new Map([['old1', 'new1']]);
    const result = remapAttachmentInItem(item, idMap);
    expect(result.attachments).toHaveLength(1);
    expect(result.attachments![0].id).toBe('new1');
  });

  it('leaves attachments unchanged when not in idMap', () => {
    const att: VaultAttachment = {
      id: 'unchanged',
      filename: 'x.pdf',
      mimeType: 'application/pdf',
      size: 100,
      sha256: 'abc',
      createdAt: '',
      wrappedKey: '',
      keyNonce: '',
    };
    const item: VaultItem = {
      id: '1',
      title: 'Test',
      domain: 'test.com',
      category: 'other',
      usernames: [],
      password: '',
      recoveryCodes: [],
      notes: '',
      tags: [],
      attachments: [att],
      createdAt: '',
      updatedAt: '',
    };
    const idMap = new Map([['other', 'new']]);
    const result = remapAttachmentInItem(item, idMap);
    expect(result.attachments![0].id).toBe('unchanged');
  });
});

describe('applyRotateToRecoveryCodes', () => {
  it('marks unused and used as replaced', () => {
    const codes: RecoveryCode[] = [
      { id: '1', code: 'a', status: 'unused', createdAt: '', source: 'imported' },
      { id: '2', code: 'b', status: 'used', createdAt: '', source: 'imported' },
      { id: '3', code: 'c', status: 'replaced', createdAt: '', source: 'imported' },
    ];
    const rotated = applyRotateToRecoveryCodes(codes, '2025-01-01T00:00:00Z');
    expect(rotated[0].status).toBe('replaced');
    expect(rotated[0].rotatedAt).toBe('2025-01-01T00:00:00Z');
    expect(rotated[1].status).toBe('replaced');
    expect(rotated[1].rotatedAt).toBe('2025-01-01T00:00:00Z');
    expect(rotated[2].status).toBe('replaced');
    expect(rotated[2].rotatedAt).toBeUndefined();
  });
});
