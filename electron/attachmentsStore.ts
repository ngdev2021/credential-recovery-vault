import { app } from 'electron';
import { join, basename, extname } from 'path';
import { readFile, writeFile, mkdir, unlink, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { randomBytes, createHash } from 'crypto';
import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import type { VaultAttachment } from '../shared/types/vault';

const NONCE_LENGTH = 24;

function getAttachmentsDir(): string {
  return join(app.getPath('userData'), 'attachments');
}

function getBlobPath(attachmentId: string): string {
  return join(getAttachmentsDir(), `${attachmentId}.bin`);
}

function bufferToBase64(buf: Buffer): string {
  return buf.toString('base64');
}

function base64ToBuffer(str: string): Buffer {
  return Buffer.from(str, 'base64');
}

export function sha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

export async function computeFileSha256(filePath: string): Promise<string> {
  const fileBuffer = await readFile(filePath);
  return sha256(fileBuffer);
}

export interface SaveAttachmentResult {
  attachment: VaultAttachment;
}

export async function saveEncryptedAttachment(
  filePath: string,
  vaultKey: Buffer
): Promise<SaveAttachmentResult> {
  const fileBuffer = await readFile(filePath);
  const filename = basename(filePath);
  const ext = extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  };
  const mimeType = mimeTypes[ext] ?? 'application/octet-stream';

  const fileKey = randomBytes(32);
  const fileNonce = randomBytes(NONCE_LENGTH);

  const cipher = xchacha20poly1305(fileKey, fileNonce);
  const encryptedFile = cipher.encrypt(fileBuffer);

  const keyNonce = randomBytes(NONCE_LENGTH);
  const keyCipher = xchacha20poly1305(vaultKey, keyNonce);
  const wrappedKey = keyCipher.encrypt(fileKey);

  const attachmentId = randomBytes(16).toString('hex');
  const blobPath = getBlobPath(attachmentId);

  const dir = getAttachmentsDir();
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });

  const blob = Buffer.concat([fileNonce, Buffer.from(encryptedFile)]);
  await writeFile(blobPath, blob);

  const attachment: VaultAttachment = {
    id: attachmentId,
    filename,
    mimeType,
    size: fileBuffer.length,
    sha256: sha256(fileBuffer),
    createdAt: new Date().toISOString(),
    wrappedKey: bufferToBase64(Buffer.from(wrappedKey)),
    keyNonce: bufferToBase64(keyNonce),
  };

  return { attachment };
}

export async function decryptAttachment(
  attachment: VaultAttachment,
  vaultKey: Buffer
): Promise<Buffer> {
  const blobPath = getBlobPath(attachment.id);
  if (!existsSync(blobPath)) {
    throw new Error('Attachment file not found');
  }

  const blob = await readFile(blobPath);
  const fileNonce = blob.subarray(0, NONCE_LENGTH);
  const encryptedFile = blob.subarray(NONCE_LENGTH);

  const keyCipher = xchacha20poly1305(vaultKey, base64ToBuffer(attachment.keyNonce));
  const fileKey = keyCipher.decrypt(base64ToBuffer(attachment.wrappedKey));

  const cipher = xchacha20poly1305(fileKey, fileNonce);
  return Buffer.from(cipher.decrypt(encryptedFile));
}

export async function deleteAttachmentBlob(attachmentId: string): Promise<void> {
  const blobPath = getBlobPath(attachmentId);
  if (existsSync(blobPath)) {
    await unlink(blobPath);
  }
}

export async function readAttachmentBlobRaw(attachmentId: string): Promise<Buffer> {
  const blobPath = getBlobPath(attachmentId);
  if (!existsSync(blobPath)) throw new Error(`Attachment blob not found: ${attachmentId}`);
  return readFile(blobPath);
}

export async function writeAttachmentBlobRaw(attachmentId: string, blob: Buffer): Promise<void> {
  const dir = getAttachmentsDir();
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(getBlobPath(attachmentId), blob);
}

export async function deleteAllAttachmentBlobs(): Promise<void> {
  const dir = getAttachmentsDir();
  if (!existsSync(dir)) return;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith('.bin')) {
      await unlink(join(dir, e.name));
    }
  }
}
