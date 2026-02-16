import { app } from 'electron';
import { randomUUID, randomBytes } from 'crypto';
import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { encryptVault, decryptVault } from './crypto/vaultCrypto';
import { readAttachmentBlobRaw, writeAttachmentBlobRaw, deleteAllAttachmentBlobs } from './attachmentsStore';
import type { EncryptedVault, VaultPayload, VaultItem, VaultExportBundle, VaultAttachment } from '../shared/types/vault';
import { remapAttachmentInItem } from '../shared/utils/vaultMerge';

const VAULT_FILENAME = 'vault.enc.json';

function getVaultPath(): string {
  const userData = app.getPath('userData');
  return join(userData, VAULT_FILENAME);
}

export async function vaultExists(): Promise<boolean> {
  const path = getVaultPath();
  return existsSync(path);
}

export async function readEncryptedVault(): Promise<EncryptedVault | null> {
  const path = getVaultPath();
  if (!existsSync(path)) return null;

  const data = await readFile(path, 'utf-8');
  return JSON.parse(data) as EncryptedVault;
}

export async function writeEncryptedVault(encrypted: EncryptedVault): Promise<void> {
  const path = getVaultPath();
  const dir = join(path, '..');
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  const tmpPath = `${path}.tmp.${Date.now()}`;
  await writeFile(tmpPath, JSON.stringify(encrypted), 'utf-8');
  await rename(tmpPath, path);
}

export async function createVault(masterPassword: string): Promise<void> {
  const payload: VaultPayload = {
    metadata: {
      id: randomUUID(),
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      itemCount: 0,
      tags: [],
    },
    items: [],
  };

  const encrypted = await encryptVault(payload, masterPassword);
  await writeEncryptedVault(encrypted);
}

export async function unlockVault(masterPassword: string): Promise<VaultPayload> {
  const encrypted = await readEncryptedVault();
  if (!encrypted) {
    throw new Error('No vault found. Create a vault first.');
  }
  return decryptVault(encrypted, masterPassword);
}

export async function saveVault(
  masterPassword: string,
  payload: VaultPayload
): Promise<void> {
  const encrypted = await encryptVault(payload, masterPassword);
  await writeEncryptedVault(encrypted);
}

export async function exportVaultEncrypted(
  masterPassword: string
): Promise<EncryptedVault> {
  const encrypted = await readEncryptedVault();
  if (!encrypted) throw new Error('No vault found.');
  await decryptVault(encrypted, masterPassword);
  return encrypted;
}

export async function importVaultEncrypted(
  encrypted: EncryptedVault,
  masterPassword: string
): Promise<void> {
  await decryptVault(encrypted, masterPassword);
  await writeEncryptedVault(encrypted);
}

export function collectAttachmentIds(payload: VaultPayload): string[] {
  const ids: string[] = [];
  for (const item of payload.items) {
    for (const a of item.attachments ?? []) {
      ids.push(a.id);
    }
  }
  return ids;
}

export async function exportVaultBundle(
  masterPassword: string,
  payload: VaultPayload
): Promise<VaultExportBundle> {
  const encrypted = await readEncryptedVault();
  if (!encrypted) throw new Error('No vault found.');
  await decryptVault(encrypted, masterPassword);

  const attachments: Record<string, string> = {};
  for (const id of collectAttachmentIds(payload)) {
    try {
      const blob = await readAttachmentBlobRaw(id);
      attachments[id] = blob.toString('base64');
    } catch {
      // blob may be missing, skip
    }
  }
  return { version: 1, vault: encrypted, attachments };
}

export async function importVaultBundleReplace(
  bundle: VaultExportBundle,
  masterPassword: string
): Promise<void> {
  await decryptVault(bundle.vault, masterPassword);
  await deleteAllAttachmentBlobs();
  await writeEncryptedVault(bundle.vault);
  for (const [id, b64] of Object.entries(bundle.attachments)) {
    await writeAttachmentBlobRaw(id, Buffer.from(b64, 'base64'));
  }
}

export async function importVaultBundleMerge(
  bundle: VaultExportBundle,
  importPassword: string,
  currentPassword: string
): Promise<VaultPayload> {
  const existingEncrypted = await readEncryptedVault();
  const importedPayload = await decryptVault(bundle.vault, importPassword);

  const refIds = collectAttachmentIds(importedPayload);
  for (const id of refIds) {
    if (!(id in bundle.attachments)) {
      throw new Error(`Backup references attachment ${id} which is missing from the file`);
    }
  }

  if (!existingEncrypted) {
    await importVaultBundleReplace(bundle, importPassword);
    return importedPayload;
  }

  const existingPayload = await decryptVault(existingEncrypted, currentPassword);
  const existingAttachmentById = new Map<string, VaultAttachment>();
  for (const item of existingPayload.items) {
    for (const a of item.attachments ?? []) {
      existingAttachmentById.set(a.id, a);
    }
  }

  const idMap = new Map<string, string>();
  const blobsToWrite: { id: string; b64: string }[] = [];
  const importedAttachmentById = new Map<string, { att: VaultAttachment; b64: string }>();
  for (const item of importedPayload.items) {
    for (const a of item.attachments ?? []) {
      const b64 = bundle.attachments[a.id];
      if (b64) importedAttachmentById.set(a.id, { att: a, b64 });
    }
  }

  for (const [id, { att: importedAtt, b64 }] of importedAttachmentById) {
    const existingAtt = existingAttachmentById.get(id);
    if (existingAtt && existingAtt.sha256 !== importedAtt.sha256) {
      const newId = randomBytes(16).toString('hex');
      idMap.set(id, newId);
      blobsToWrite.push({ id: newId, b64 });
    } else if (!existingAtt) {
      const targetId = idMap.get(id) ?? id;
      blobsToWrite.push({ id: targetId, b64 });
    }
  }

  const mergedItems: VaultItem[] = [];
  const seenIds = new Set<string>(existingPayload.items.map((i) => i.id));

  for (const item of existingPayload.items) {
    mergedItems.push(item);
  }
  for (const item of importedPayload.items) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      mergedItems.push(remapAttachmentInItem(item, idMap));
    }
  }

  for (const { id, b64 } of blobsToWrite) {
    await writeAttachmentBlobRaw(id, Buffer.from(b64, 'base64'));
  }

  const mergedPayload: VaultPayload = {
    metadata: {
      ...existingPayload.metadata,
      itemCount: mergedItems.length,
      updatedAt: new Date().toISOString(),
      tags: [...new Set([...existingPayload.metadata.tags, ...importedPayload.metadata.tags])],
    },
    items: mergedItems,
  };

  const encrypted = await encryptVault(mergedPayload, currentPassword);
  await writeEncryptedVault(encrypted);
  return mergedPayload;
}
