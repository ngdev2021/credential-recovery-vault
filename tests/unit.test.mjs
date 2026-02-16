import test from 'node:test';
import assert from 'node:assert/strict';

import { parseRecoveryCodesFromFile, rotateRecoveryCodes } from '../dist-electron/shared/utils/recoveryCodes.js';
import { mergeVaultPayloads } from '../dist-electron/electron/importMerge.js';

const now = '2026-01-01T00:00:00.000Z';

test('parseRecoveryCodesFromFile parses and dedupes', () => {
  const input = 'Recovery Codes\n1. ABCD-1234\n2) EFGH-5678\nABCD-1234';
  const parsed = parseRecoveryCodesFromFile(input);
  assert.deepEqual(parsed.codes, ['ABCD-1234', 'EFGH-5678']);
  assert.equal(parsed.duplicateCount, 1);
});

test('rotateRecoveryCodes marks usable codes as replaced', () => {
  const rotated = rotateRecoveryCodes([
    { id: '1', code: 'A', status: 'unused', createdAt: now, source: 'imported' },
    { id: '2', code: 'B', status: 'used', createdAt: now, source: 'imported' },
    { id: '3', code: 'C', status: 'invalid', createdAt: now, source: 'imported' },
  ], now);

  assert.equal(rotated[0].status, 'replaced');
  assert.equal(rotated[1].status, 'replaced');
  assert.equal(rotated[2].status, 'invalid');
});

test('mergeVaultPayloads merges by conflict key and avoids duplicate recovery codes', () => {
  const existing = {
    metadata: { id: 'v', version: 1, createdAt: now, updatedAt: now, itemCount: 1, tags: ['work'] },
    items: [{
      id: 'item-1',
      title: 'GitHub',
      domain: 'github.com',
      category: 'dev',
      usernames: ['alice'],
      password: 'p1',
      recoveryCodes: [{ id: 'r1', code: 'CODE-1', status: 'unused', createdAt: now, source: 'imported' }],
      notes: '',
      tags: ['work'],
      createdAt: now,
      updatedAt: now,
    }],
  };

  const incoming = {
    metadata: { id: 'v2', version: 1, createdAt: now, updatedAt: now, itemCount: 1, tags: ['critical'] },
    items: [{
      id: 'different-id',
      title: 'GitHub',
      domain: 'github.com',
      category: 'dev',
      usernames: ['alice2'],
      password: 'p2',
      recoveryCodes: [
        { id: 'r2', code: 'CODE-1', status: 'unused', createdAt: now, source: 'imported' },
        { id: 'r3', code: 'CODE-2', status: 'unused', createdAt: now, source: 'imported' },
      ],
      notes: '',
      tags: ['critical'],
      createdAt: now,
      updatedAt: now,
    }],
  };

  const merged = mergeVaultPayloads(existing, incoming);
  assert.equal(merged.items.length, 1);
  assert.deepEqual(merged.items[0].recoveryCodes.map((c) => c.code), ['CODE-1', 'CODE-2']);
  assert.deepEqual(merged.metadata.tags.sort(), ['critical', 'work']);
});
