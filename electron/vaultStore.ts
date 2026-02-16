import { app } from 'electron';
import { randomUUID } from 'crypto';
import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { encryptVault, decryptVault } from './crypto/vaultCrypto';
import { readAttachmentBlobRaw, writeAttachmentBlobRaw, deleteAllAttachmentBlobs } from './attachmentsStore';
import type { EncryptedVault, VaultPayload, VaultItem, VaultExportBundle } from '../shared/types/vault';

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

function collectAttachmentIds(payload: VaultPayload): Set<string> {
  const ids = new Set<string>();
  for (const item of payload.items) {
    for (const a of item.attachments ?? []) {
      ids.add(a.id);
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

  if (!existingEncrypted) {
    await importVaultBundleReplace(bundle, importPassword);
    return importedPayload;
  }

  const existingPayload = await decryptVault(existingEncrypted, currentPassword);
  const mergedItems: VaultItem[] = [];
  const seenIds = new Set<string>(existingPayload.items.map((i) => i.id));

  for (const item of existingPayload.items) {
    mergedItems.push(item);
  }
  for (const item of importedPayload.items) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      mergedItems.push(item);
    }
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

  for (const [id, b64] of Object.entries(bundle.attachments)) {
    try {
      const existingIds = collectAttachmentIds(existingPayload);
      if (!existingIds.has(id)) {
        await writeAttachmentBlobRaw(id, Buffer.from(b64, 'base64'));
      }
    } catch {
      // skip on error
    }
  }
  return mergedPayload;
}
