import { app } from 'electron';
import { join } from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import type { DeviceId } from '../../shared/sync/types';

const SYNC_META_FILENAME = 'sync-meta.json';

interface SyncMeta {
  revision: number;
  deviceId: DeviceId;
}

function getSyncMetaPath(): string {
  return join(app.getPath('userData'), SYNC_META_FILENAME);
}

export async function getSyncMeta(): Promise<SyncMeta> {
  const path = getSyncMetaPath();
  if (!existsSync(path)) {
    return {
      revision: 0,
      deviceId: randomUUID(),
    };
  }
  try {
    const data = await readFile(path, 'utf-8');
    const parsed = JSON.parse(data) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as SyncMeta).revision === 'number' &&
      typeof (parsed as SyncMeta).deviceId === 'string'
    ) {
      return parsed as SyncMeta;
    }
  } catch {
    // ignore
  }
  return {
    revision: 0,
    deviceId: randomUUID(),
  };
}

export async function getRevision(): Promise<number> {
  const meta = await getSyncMeta();
  return meta.revision;
}

export async function getDeviceId(): Promise<DeviceId> {
  const meta = await getSyncMeta();
  return meta.deviceId;
}

export async function setRevision(revision: number): Promise<void> {
  const meta = await getSyncMeta();
  meta.revision = revision;
  await writeSyncMeta(meta);
}

export async function bumpRevision(): Promise<number> {
  const meta = await getSyncMeta();
  meta.revision += 1;
  await writeSyncMeta(meta);
  return meta.revision;
}

async function writeSyncMeta(meta: SyncMeta): Promise<void> {
  const path = getSyncMetaPath();
  const dir = join(path, '..');
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(path, JSON.stringify(meta), 'utf-8');
}
