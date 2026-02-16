import { useEffect, useState } from 'react';
import type { VaultMetadata, VaultItem } from '../../shared/types/vault';
import { VaultItemList } from '../components/VaultItemList';
import { VaultItemForm } from '../components/VaultItemForm';
import { EmergencyKitModal } from '../components/EmergencyKitModal';

const AUTO_LOCK_MS = 5 * 60 * 1000; // 5 minutes (config later)

const styles: Record<string, React.CSSProperties> = {
  layout: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-primary)',
  },
  header: {
    padding: '16px 24px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--bg-secondary)',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  title: { fontSize: 18, fontWeight: 600 },
  meta: { color: 'var(--text-secondary)', fontSize: 13 },
  lockBtn: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-secondary)',
    fontSize: 14,
  },
  lockBtnHover: { color: 'var(--danger)', borderColor: 'var(--danger)' },
  content: {
    flex: 1,
    padding: 24,
    overflow: 'auto',
  },
};

interface VaultDashboardProps {
  metadata: VaultMetadata;
  onLock: () => void;
  onVaultDataChange?: (metadata: VaultMetadata) => void;
}

export function VaultDashboard({ metadata, onLock, onVaultDataChange }: VaultDashboardProps) {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFilePath, setImportFilePath] = useState<string | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [lastBackup, setLastBackup] = useState<{ path: string; exportedAt: string } | null>(null);
  const [showEmergencyKit, setShowEmergencyKit] = useState(false);

  async function refreshItems() {
    const state = await window.vault.getState();
    if (state) setItems(state.items);
  }

  useEffect(() => {
    refreshItems();
  }, []);

  useEffect(() => {
    window.vault.getLastBackup().then(setLastBackup);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        await window.vault.lock();
        onLock();
      }, AUTO_LOCK_MS);
    };

    window.addEventListener('mousemove', reset);
    window.addEventListener('keydown', reset);
    window.addEventListener('mousedown', reset);
    reset();

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('keydown', reset);
      window.removeEventListener('mousedown', reset);
    };
  }, [onLock]);

  const handleLock = async () => {
    await window.vault.lock();
    onLock();
  };

  const handleLockedError = (err: unknown) => {
    if (err instanceof Error && err.message.includes('locked')) onLock();
    else alert(err instanceof Error ? err.message : 'Operation failed');
  };

  const handleAddItem = (item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    window.vault.addItem(item).then(() => {
      refreshItems();
      setShowAddForm(false);
    }).catch(handleLockedError);
  };

  const handleUpdateItem = (id: string, updates: Partial<VaultItem>) => {
    window.vault.updateItem(id, updates).then(() => {
      refreshItems();
      setSelectedItem(null);
    }).catch(handleLockedError);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Delete this item? This cannot be undone.')) {
      window.vault.deleteItem(id).then(() => {
        refreshItems();
        setSelectedItem(null);
      }).catch(handleLockedError);
    }
  };

  const handleExport = async () => {
    try {
      const result = await window.vault.exportBundle();
      if (result) {
        const info = await window.vault.getLastBackup();
        if (info) setLastBackup(info);
        alert(`Exported to ${result.path}`);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('locked')) onLock();
      else alert(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const handleImportClick = async () => {
    const path = await window.vault.pickFile({ forBundle: true });
    if (path) {
      setImportFilePath(path);
      setImportPassword('');
      setShowImportModal(true);
    }
  };

  const handleImportConfirm = async (mode: 'replace' | 'merge') => {
    if (!importFilePath || !importPassword) return;
    try {
      const result = await window.vault.importBundle(importFilePath, importPassword, mode);
      onVaultDataChange?.(result.metadata as VaultMetadata);
      await refreshItems();
      setShowImportModal(false);
      setImportFilePath(null);
      setImportPassword('');
    } catch (err) {
      if (err instanceof Error && err.message.includes('locked')) onLock();
      else alert(err instanceof Error ? err.message : 'Import failed');
    }
  };

  const backupDaysAgo = lastBackup
    ? Math.floor((Date.now() - new Date(lastBackup.exportedAt).getTime()) / (24 * 60 * 60 * 1000))
    : null;
  const backupStatus = backupDaysAgo === null ? 'none' : backupDaysAgo <= 30 ? 'ok' : backupDaysAgo <= 60 ? 'warn' : 'critical';

  return (
    <div style={styles.layout}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div>
            <h1 style={styles.title}>Credential Vault</h1>
            <span style={styles.meta}>
              {metadata.itemCount} items · Updated {new Date(metadata.updatedAt).toLocaleDateString()}
              {backupDaysAgo !== null && (
                <span
                  style={{
                    marginLeft: 8,
                    color: backupStatus === 'ok' ? 'var(--success)' : backupStatus === 'warn' ? 'var(--warning)' : 'var(--danger)',
                  }}
                  title={lastBackup?.path}
                >
                  · Backup: {backupDaysAgo === 0 ? 'Today' : backupDaysAgo === 1 ? '1 day ago' : `${backupDaysAgo} days ago`}
                </span>
              )}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={styles.lockBtn} onClick={() => setShowEmergencyKit(true)} title="Generate printable emergency kit">
            Emergency kit
          </button>
          <button style={styles.lockBtn} onClick={handleExport} title="Export vault + attachments">
            Export
          </button>
          <button style={styles.lockBtn} onClick={handleImportClick} title="Import vault backup">
            Import
          </button>
          <button
            style={styles.lockBtn}
            onClick={handleLock}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.lockBtnHover)}
            onMouseLeave={(e) => { e.currentTarget.style.color = ''; e.currentTarget.style.borderColor = ''; }}
          >
            Lock now
          </button>
        </div>
      </header>

      {showEmergencyKit && (
        <EmergencyKitModal
          metadata={metadata}
          lastBackup={lastBackup}
          onClose={() => setShowEmergencyKit(false)}
        />
      )}

      {showImportModal && importFilePath && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, maxWidth: 400, width: '90%' }}>
            <h3 style={{ marginBottom: 16 }}>Import vault backup</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{importFilePath.split('/').pop()}</p>
            <input
              type="password"
              placeholder="Password for backup file"
              value={importPassword}
              onChange={(e) => setImportPassword(e.target.value)}
              style={{ width: '100%', padding: 10, marginBottom: 16, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={styles.lockBtn} onClick={() => { setShowImportModal(false); setImportFilePath(null); }}>Cancel</button>
              <button style={{ ...styles.lockBtn, color: 'var(--warning)' }} onClick={() => handleImportConfirm('merge')} disabled={!importPassword}>Merge</button>
              <button style={{ ...styles.lockBtn, color: 'var(--danger)' }} onClick={() => handleImportConfirm('replace')} disabled={!importPassword} title="Replace current vault entirely">Replace</button>
            </div>
          </div>
        </div>
      )}

      {backupStatus === 'none' && (
        <div style={{ padding: '8px 24px', background: 'rgba(210, 153, 34, 0.2)', color: 'var(--warning)', fontSize: 13 }}>
          No backup yet. Export your vault to a file for safekeeping.
        </div>
      )}
      {backupStatus === 'warn' && (
        <div style={{ padding: '8px 24px', background: 'rgba(210, 153, 34, 0.2)', color: 'var(--warning)', fontSize: 13 }}>
          Backup is {backupDaysAgo} days old. Export your vault to stay safe.
        </div>
      )}
      {backupStatus === 'critical' && (
        <div style={{ padding: '8px 24px', background: 'rgba(248, 81, 73, 0.2)', color: 'var(--danger)', fontSize: 13 }}>
          No recent backup ({backupDaysAgo} days). Export now to avoid losing access.
        </div>
      )}

      <main style={styles.content}>
        <VaultItemList
          items={items}
          onSelect={setSelectedItem}
          onAdd={() => setShowAddForm(true)}
        />

        {showAddForm && (
          <VaultItemForm
            mode="add"
            onSave={handleAddItem}
            onCancel={() => setShowAddForm(false)}
            onLocked={onLock}
          />
        )}

        {selectedItem && (
          <VaultItemForm
            mode="edit"
            item={selectedItem}
            onSave={(updates) => handleUpdateItem(selectedItem.id, updates)}
            onDelete={() => handleDeleteItem(selectedItem.id)}
            onCancel={() => setSelectedItem(null)}
            onLocked={onLock}
            onAttachmentsChange={async () => {
              const state = await window.vault.getState();
              if (state) {
                setItems(state.items);
                const updated = state.items.find((i) => i.id === selectedItem.id);
                if (updated) setSelectedItem(updated);
              }
            }}
          />
        )}
      </main>
    </div>
  );
}
