import { app } from 'electron';
import { join } from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import type { SyncConfig } from '../../shared/sync/types';

const SYNC_CONFIG_FILENAME = 'sync-config.json';

function getSyncConfigPath(): string {
  return join(app.getPath('userData'), SYNC_CONFIG_FILENAME);
}

export async function loadSyncConfig(): Promise<SyncConfig | null> {
  const path = getSyncConfigPath();
  if (!existsSync(path)) return null;
  try {
    const data = await readFile(path, 'utf-8');
    const parsed = JSON.parse(data) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as Record<string, unknown>).serverUrl === 'string' &&
      typeof (parsed as Record<string, unknown>).deviceName === 'string'
    ) {
      return parsed as SyncConfig;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function saveSyncConfig(config: SyncConfig): Promise<void> {
  const path = getSyncConfigPath();
  const dir = join(path, '..');
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(path, JSON.stringify(config), 'utf-8');
}
