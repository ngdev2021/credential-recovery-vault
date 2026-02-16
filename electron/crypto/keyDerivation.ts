import argon2 from 'argon2';
import { randomBytes } from 'crypto';

export const KDF_PARAMS = {
  type: 'argon2id' as const,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
};

export interface KDFResult {
  key: Buffer;
  salt: Buffer;
}

export async function deriveKey(
  masterPassword: string,
  salt?: Buffer
): Promise<KDFResult> {
  const saltBuffer = salt ?? randomBytes(32);

  const key = await argon2.hash(masterPassword, {
    type: argon2.argon2id,
    salt: saltBuffer,
    memoryCost: KDF_PARAMS.memoryCost,
    timeCost: KDF_PARAMS.timeCost,
    hashLength: 32,
    raw: true,
  });

  return {
    key: Buffer.from(key),
    salt: saltBuffer,
  };
}

export async function verifyPassword(
  masterPassword: string,
  salt: Buffer,
  expectedHash: Buffer
): Promise<boolean> {
  const derived = await deriveKey(masterPassword, salt);
  return derived.key.equals(expectedHash);
}
