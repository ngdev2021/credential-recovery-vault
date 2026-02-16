import { app } from 'electron';
import { join } from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const BACKUP_META_FILENAME = 'last-backup.json';

function getBackupMetaPath(): string {
  return join(app.getPath('userData'), BACKUP_META_FILENAME);
}

export interface LastBackupInfo {
  path: string;
  exportedAt: string;
}

export async function saveLastBackupInfo(info: LastBackupInfo): Promise<void> {
  const path = getBackupMetaPath();
  const dir = join(path, '..');
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(path, JSON.stringify(info), 'utf-8');
}

export async function getLastBackupInfo(): Promise<LastBackupInfo | null> {
  const path = getBackupMetaPath();
  if (!existsSync(path)) return null;
  try {
    const data = await readFile(path, 'utf-8');
    return JSON.parse(data) as LastBackupInfo;
  } catch {
    return null;
  }
}
