export type RecoveryCodeStatus = 'unused' | 'used' | 'replaced' | 'invalid';
export type RecoveryCodeSource = 'generated_by_site' | 'provided' | 'imported';
export type VaultItemCategory = 'social' | 'banking' | 'work' | 'dev' | 'email' | 'other';

export interface RecoveryCode {
  id: string;
  code: string; // decrypted plaintext when in memory
  status: RecoveryCodeStatus;
  createdAt: string;
  rotatedAt?: string;
  source: RecoveryCodeSource;
}

export interface VaultAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  sha256: string;
  createdAt: string;
  wrappedKey: string;   // fileKey encrypted with vault key (base64)
  keyNonce: string;     // nonce for key wrapping (base64)
}

export interface VaultItem {
  id: string;
  title: string;
  domain: string;
  category: VaultItemCategory;
  usernames: string[];
  password: string;
  recoveryCodes: RecoveryCode[];
  totpSecret?: string;
  notes: string;
  tags: string[];
  attachments?: VaultAttachment[];
  createdAt: string;
  updatedAt: string;
  lastVerified?: string;
  riskLevel?: 'low' | 'medium' | 'high';
}

export interface VaultMetadata {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  tags: string[];
}

export interface VaultPayload {
  metadata: VaultMetadata;
  items: VaultItem[];
}

export interface EncryptedVault {
  salt: string; // base64
  kdfParams: {
    type: 'argon2id';
    memoryCost: number;
    timeCost: number;
  };
  nonce: string; // base64
  ciphertext: string; // base64
  version: number;
}
