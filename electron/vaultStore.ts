import { app } from 'electron';
import { randomUUID } from 'crypto';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { encryptVault, decryptVault } from './crypto/vaultCrypto';
import type { EncryptedVault, VaultPayload, VaultItem } from '../shared/types/vault';

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
  await writeFile(path, JSON.stringify(encrypted), 'utf-8');
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
