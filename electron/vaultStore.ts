import { app } from 'electron';
import { randomUUID } from 'crypto';
import { readFile, writeFile, mkdir, rename, unlink } from 'fs/promises';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { encryptVault, decryptVault } from './crypto/vaultCrypto';
import { deleteAllAttachmentBlobs, readAttachmentBlobRaw, writeAttachmentBlobRaw } from './attachmentsStore';
import { getAttachmentBlobIds, mergeVaultPayloads } from './importMerge';
import type { EncryptedVault, VaultExportBundle, VaultPayload } from '../shared/types/vault';

const VAULT_FILENAME = 'vault.enc.json';

function getVaultPath(): string {
  return join(app.getPath('userData'), VAULT_FILENAME);
}

async function atomicWriteTextFile(filePath: string, content: string): Promise<void> {
  const dir = dirname(filePath);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  try {
    await writeFile(tmpPath, content, 'utf-8');
    await rename(tmpPath, filePath);
  } catch (error) {
    await unlink(tmpPath).catch(() => undefined);
    throw error;
  }
}

export async function vaultExists(): Promise<boolean> {
  return existsSync(getVaultPath());
}

export async function readEncryptedVault(): Promise<EncryptedVault | null> {
  const path = getVaultPath();
  if (!existsSync(path)) return null;
  return JSON.parse(await readFile(path, 'utf-8')) as EncryptedVault;
}

export async function writeEncryptedVault(encrypted: EncryptedVault): Promise<void> {
  await atomicWriteTextFile(getVaultPath(), JSON.stringify(encrypted));
}

export async function createVault(masterPassword: string): Promise<void> {
  const now = new Date().toISOString();
  const payload: VaultPayload = {
    metadata: { id: randomUUID(), version: 1, createdAt: now, updatedAt: now, itemCount: 0, tags: [] },
    items: [],
  };
  await writeEncryptedVault(await encryptVault(payload, masterPassword));
}

export async function unlockVault(masterPassword: string): Promise<VaultPayload> {
  const encrypted = await readEncryptedVault();
  if (!encrypted) throw new Error('No vault found. Create a vault first.');
  return decryptVault(encrypted, masterPassword);
}

export async function saveVault(masterPassword: string, payload: VaultPayload): Promise<void> {
  await writeEncryptedVault(await encryptVault(payload, masterPassword));
}

export async function exportVaultEncrypted(masterPassword: string): Promise<EncryptedVault> {
  const encrypted = await readEncryptedVault();
  if (!encrypted) throw new Error('No vault found.');
  await decryptVault(encrypted, masterPassword);
  return encrypted;
}

export async function importVaultEncrypted(encrypted: EncryptedVault, masterPassword: string): Promise<void> {
  await decryptVault(encrypted, masterPassword);
  await writeEncryptedVault(encrypted);
}

export async function exportVaultBundle(masterPassword: string, payload: VaultPayload): Promise<VaultExportBundle> {
  const encrypted = await readEncryptedVault();
  if (!encrypted) throw new Error('No vault found.');
  await decryptVault(encrypted, masterPassword);

  const attachments: Record<string, string> = {};
  for (const id of getAttachmentBlobIds(payload)) {
    try {
      attachments[id] = (await readAttachmentBlobRaw(id)).toString('base64');
    } catch {
      // best-effort backup for missing blobs
    }
  }

  return { version: 1, vault: encrypted, attachments };
}

export async function importVaultBundleReplace(bundle: VaultExportBundle, masterPassword: string): Promise<void> {
  await decryptVault(bundle.vault, masterPassword);

  const writtenAttachmentIds: string[] = [];
  try {
    await deleteAllAttachmentBlobs();
    for (const [id, b64] of Object.entries(bundle.attachments)) {
      await writeAttachmentBlobRaw(id, Buffer.from(b64, 'base64'));
      writtenAttachmentIds.push(id);
    }
    await writeEncryptedVault(bundle.vault);
  } catch (error) {
    for (const id of writtenAttachmentIds) {
      await unlink(join(app.getPath('userData'), 'attachments', `${id}.bin`)).catch(() => undefined);
    }
    throw error;
  }
}

export async function importVaultBundleMerge(bundle: VaultExportBundle, importPassword: string, currentPassword: string): Promise<VaultPayload> {
  const existingEncrypted = await readEncryptedVault();
  const importedPayload = await decryptVault(bundle.vault, importPassword);

  if (!existingEncrypted) {
    await importVaultBundleReplace(bundle, importPassword);
    return importedPayload;
  }

  const existingPayload = await decryptVault(existingEncrypted, currentPassword);
  const mergedPayload = mergeVaultPayloads(existingPayload, importedPayload);

  await writeEncryptedVault(await encryptVault(mergedPayload, currentPassword));

  const currentBlobIds = getAttachmentBlobIds(existingPayload);
  for (const [id, b64] of Object.entries(bundle.attachments)) {
    if (currentBlobIds.has(id)) continue;
    await writeAttachmentBlobRaw(id, Buffer.from(b64, 'base64'));
  }

  return mergedPayload;
}
