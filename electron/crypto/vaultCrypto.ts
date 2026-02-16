import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { randomBytes } from 'crypto';
import { deriveKey, KDF_PARAMS } from './keyDerivation';
import type { EncryptedVault, VaultPayload } from '../../shared/types/vault';

const NONCE_LENGTH = 24;
const TAG_LENGTH = 16;

function bufferToBase64(buf: Buffer): string {
  return buf.toString('base64');
}

function base64ToBuffer(str: string): Buffer {
  return Buffer.from(str, 'base64');
}

export async function encryptVault(
  payload: VaultPayload,
  masterPassword: string
): Promise<EncryptedVault> {
  const { key, salt } = await deriveKey(masterPassword);
  const nonce = randomBytes(NONCE_LENGTH);

  const plaintext = JSON.stringify(payload);
  const cipher = xchacha20poly1305(key, nonce);
  const ciphertext = cipher.encrypt(Buffer.from(plaintext, 'utf-8'));

  return {
    salt: bufferToBase64(salt),
    kdfParams: KDF_PARAMS,
    nonce: bufferToBase64(nonce),
    ciphertext: bufferToBase64(Buffer.from(ciphertext)),
    version: 1,
  };
}

export async function decryptVault(
  encrypted: EncryptedVault,
  masterPassword: string
): Promise<VaultPayload> {
  const { key } = await deriveKey(masterPassword, base64ToBuffer(encrypted.salt));
  const nonce = base64ToBuffer(encrypted.nonce);
  const ciphertext = base64ToBuffer(encrypted.ciphertext);

  const cipher = xchacha20poly1305(key, nonce);
  const plaintext = cipher.decrypt(ciphertext);

  return JSON.parse(Buffer.from(plaintext).toString('utf-8')) as VaultPayload;
}

/** Get vault encryption key for wrapping attachment keys. Salt from encrypted vault. */
export async function getVaultKey(
  masterPassword: string,
  saltBase64: string
): Promise<Buffer> {
  const { key } = await deriveKey(masterPassword, base64ToBuffer(saltBase64));
  return key;
}
