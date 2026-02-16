import { createHash, randomUUID } from 'crypto';
import type { RecoveryCode, VaultAttachment, VaultItem, VaultPayload } from '../shared/types/vault';

function stableHash(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 12);
}

function normalizeCode(code: string): string {
  return code.trim().replace(/\s+/g, '').toLowerCase();
}

function dedupeRecoveryCodes(codes: RecoveryCode[]): RecoveryCode[] {
  const seen = new Set<string>();
  const result: RecoveryCode[] = [];
  for (const code of codes) {
    const key = normalizeCode(code.code);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(code);
  }
  return result;
}

function dedupeAttachments(attachments: VaultAttachment[]): VaultAttachment[] {
  const seen = new Set<string>();
  const result: VaultAttachment[] = [];
  for (const attachment of attachments) {
    const key = attachment.sha256 || attachment.id;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(attachment);
  }
  return result;
}

function mergeItems(existing: VaultItem, incoming: VaultItem): VaultItem {
  const mergedAttachments = dedupeAttachments([...(existing.attachments ?? []), ...(incoming.attachments ?? [])]);
  const mergedCodes = dedupeRecoveryCodes([...(existing.recoveryCodes ?? []), ...(incoming.recoveryCodes ?? [])]);
  return {
    ...existing,
    ...incoming,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date(Math.max(new Date(existing.updatedAt).getTime(), new Date(incoming.updatedAt).getTime())).toISOString(),
    usernames: [...new Set([...(existing.usernames ?? []), ...(incoming.usernames ?? [])])],
    tags: [...new Set([...(existing.tags ?? []), ...(incoming.tags ?? [])])],
    recoveryCodes: mergedCodes,
    attachments: mergedAttachments,
  };
}

function itemConflictKey(item: VaultItem): string {
  return `${item.domain.toLowerCase()}::${item.title.toLowerCase()}`;
}

function resolveItemId(existingIds: Set<string>, item: VaultItem): VaultItem {
  if (!existingIds.has(item.id)) {
    existingIds.add(item.id);
    return item;
  }

  const suffix = stableHash(`${item.id}:${item.domain}:${item.title}`);
  let nextId = `${item.id}-${suffix}`;
  while (existingIds.has(nextId)) {
    nextId = `${nextId}-${randomUUID().slice(0, 6)}`;
  }
  existingIds.add(nextId);
  return { ...item, id: nextId };
}

export function mergeVaultPayloads(existingPayload: VaultPayload, importedPayload: VaultPayload): VaultPayload {
  const byId = new Map(existingPayload.items.map((item) => [item.id, item]));
  const byConflict = new Map(existingPayload.items.map((item) => [itemConflictKey(item), item.id]));
  const existingIds = new Set(existingPayload.items.map((item) => item.id));

  for (const importedItem of importedPayload.items) {
    const exact = byId.get(importedItem.id);
    if (exact) {
      const merged = mergeItems(exact, importedItem);
      byId.set(merged.id, merged);
      continue;
    }

    const conflictId = byConflict.get(itemConflictKey(importedItem));
    if (conflictId) {
      const merged = mergeItems(byId.get(conflictId)!, importedItem);
      byId.set(conflictId, merged);
      continue;
    }

    const inserted = resolveItemId(existingIds, importedItem);
    byId.set(inserted.id, {
      ...inserted,
      recoveryCodes: dedupeRecoveryCodes(inserted.recoveryCodes ?? []),
      attachments: dedupeAttachments(inserted.attachments ?? []),
    });
    byConflict.set(itemConflictKey(inserted), inserted.id);
  }

  const items = [...byId.values()];
  const tags = [...new Set(items.flatMap((item) => item.tags ?? []))];
  const updatedAt = new Date().toISOString();

  return {
    metadata: {
      ...existingPayload.metadata,
      itemCount: items.length,
      updatedAt,
      tags,
    },
    items,
  };
}

export function getAttachmentBlobIds(payload: VaultPayload): Set<string> {
  const ids = new Set<string>();
  for (const item of payload.items) {
    for (const attachment of item.attachments ?? []) {
      ids.add(attachment.id);
    }
  }
  return ids;
}
