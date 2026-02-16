import type { VaultItem, RecoveryCode } from '../types/vault';

/** Remap attachment IDs in an item according to the given idMap (oldId -> newId). */
export function remapAttachmentInItem(item: VaultItem, idMap: Map<string, string>): VaultItem {
  if (!item.attachments?.length) return item;
  const remapped = item.attachments.map((a) => {
    const newId = idMap.get(a.id);
    return newId ? { ...a, id: newId } : a;
  });
  return { ...item, attachments: remapped };
}

/** Apply rotate to recovery codes: unused/used -> replaced. Pass rotatedAt for deterministic tests. */
export function applyRotateToRecoveryCodes(codes: RecoveryCode[], rotatedAt: string): RecoveryCode[] {
  return codes.map((c) =>
    c.status === 'unused' || c.status === 'used'
      ? { ...c, status: 'replaced' as const, rotatedAt }
      : c
  );
}
