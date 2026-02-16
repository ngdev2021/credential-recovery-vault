import { app } from 'electron';
import { randomUUID } from 'crypto';
import { readFile, writeFile, mkdir, rename, unlink, rm } from 'fs/promises';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { encryptVault, decryptVault } from './crypto/vaultCrypto';
import { readAttachmentBlobRaw, writeAttachmentBlobRaw } from './attachmentsStore';
import { getAttachmentBlobIds, mergeVaultPayloads } from './importMerge';
import type { EncryptedVault, VaultExportBundle, VaultPayload } from '../shared/types/vault';

const VAULT_FILENAME = 'vault.enc.json';
const ATTACHMENTS_DIRNAME = 'attachments';

function getVaultPath(): string {
  return join(app.getPath('userData'), VAULT_FILENAME);
}

function getAttachmentsPath(): string {
  return join(app.getPath('userData'), ATTACHMENTS_DIRNAME);
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

async function stageAttachments(bundle: VaultExportBundle): Promise<string> {
  const userData = app.getPath('userData');
  const stageDir = join(userData, `${ATTACHMENTS_DIRNAME}.stage.${Date.now()}`);
  await mkdir(stageDir, { recursive: true });

  try {
    for (const [id, b64] of Object.entries(bundle.attachments)) {
      const finalPath = join(stageDir, `${id}.bin`);
      const tmpPath = `${finalPath}.tmp`;
      await writeFile(tmpPath, Buffer.from(b64, 'base64'));
      await rename(tmpPath, finalPath);
    }
    return stageDir;
  } catch (error) {
    await rm(stageDir, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
}

async function swapAttachmentsDirectory(stagedDir: string): Promise<void> {
  const attachmentsPath = getAttachmentsPath();
  const backupDir = `${attachmentsPath}.backup.${Date.now()}`;

  let hasBackup = false;
  try {
    if (existsSync(attachmentsPath)) {
      await rename(attachmentsPath, backupDir);
      hasBackup = true;
    }

    await rename(stagedDir, attachmentsPath);

    if (hasBackup) {
      await rm(backupDir, { recursive: true, force: true });
    }
  } catch (error) {
    if (!existsSync(attachmentsPath) && existsSync(stagedDir)) {
      await rename(stagedDir, attachmentsPath).catch(() => undefined);
    }
    if (hasBackup && existsSync(backupDir) && !existsSync(attachmentsPath)) {
      await rename(backupDir, attachmentsPath).catch(() => undefined);
    }
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

  const currentVault = await readEncryptedVault();
  const stagedAttachmentsDir = await stageAttachments(bundle);

  try {
    await writeEncryptedVault(bundle.vault);
    await swapAttachmentsDirectory(stagedAttachmentsDir);
  } catch (error) {
    if (currentVault) {
      await writeEncryptedVault(currentVault).catch(() => undefined);
    }
    await rm(stagedAttachmentsDir, { recursive: true, force: true }).catch(() => undefined);
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
