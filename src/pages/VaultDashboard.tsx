import { useEffect, useState } from 'react';
import type { VaultMetadata, VaultItem } from '../../shared/types/vault';
import { VaultItemList } from '../components/VaultItemList';
import { VaultItemForm } from '../components/VaultItemForm';
import { useToast } from '../components/Toast';

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
  search: {
    padding: '8px 14px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 14,
    width: 280,
  },
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
    maxWidth: 1200,
    margin: '0 auto',
    width: '100%',
  },
};

interface VaultDashboardProps {
  metadata: VaultMetadata;
  onLock: () => void;
  onVaultDataChange?: (metadata: VaultMetadata) => void;
}

export function VaultDashboard({ metadata, onLock, onVaultDataChange }: VaultDashboardProps) {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();
  const [filteredItems, setFilteredItems] = useState<VaultItem[]>([]);
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

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(items);
      return;
    }
    window.vault.search(searchQuery).then(setFilteredItems);
  }, [searchQuery, items]);

  const handleLock = async () => {
    await window.vault.lock();
    onLock();
  };

  const handleLockedError = (err: unknown) => {
    if (err instanceof Error && err.message.includes('locked')) onLock();
    else toast.show(err instanceof Error ? err.message : 'Operation failed', 'error');
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
        toast.show(`Exported to ${result.path}`);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('locked')) onLock();
      else toast.show(err instanceof Error ? err.message : 'Export failed', 'error');
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
      else toast.show(err instanceof Error ? err.message : 'Import failed', 'error');
    }
  };

  const backupDaysAgo = lastBackup
    ? Math.floor((Date.now() - new Date(lastBackup.exportedAt).getTime()) / (24 * 60 * 60 * 1000))
    : null;
  const backupStatus = backupDaysAgo === null ? 'none' : backupDaysAgo <= 30 ? 'ok' : backupDaysAgo <= 60 ? 'warn' : 'critical';

  const displayItems = searchQuery.trim() ? filteredItems : items;

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
          <input
            type="search"
            placeholder="Search by title, domain, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.search}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn-secondary" style={styles.lockBtn} onClick={() => setShowEmergencyKit(true)} aria-label="Open emergency kit">
            Emergency kit
          </button>
          <button className="btn-secondary" style={styles.lockBtn} onClick={handleExport} aria-label="Export vault">
            Export
          </button>
          <button className="btn-secondary" style={styles.lockBtn} onClick={handleImportClick} aria-label="Import vault backup">
            Import
          </button>
          <button
            className="btn-secondary btn-lock"
            style={styles.lockBtn}
            onClick={handleLock}
            aria-label="Lock vault now"
          >
            Lock now
          </button>
        </div>
      </header>

      {showEmergencyKit && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', color: '#333', padding: 32, maxWidth: 480, width: '90%', borderRadius: 12 }}>
            <h2 style={{ marginBottom: 16 }}>Emergency Recovery Kit</h2>
            <p style={{ fontSize: 14, marginBottom: 12 }}>Print this page and store it securely.</p>
            <div style={{ fontSize: 13, fontFamily: 'monospace', background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 16 }}>
              <p><strong>Vault ID:</strong> {metadata.id}</p>
              <p><strong>Items:</strong> {metadata.itemCount}</p>
              <p><strong>Last backup:</strong> {lastBackup ? new Date(lastBackup.exportedAt).toLocaleString() : 'Never'}</p>
            </div>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>
              Your master password is the only way to unlock this vault. Store it separately. To restore: use Import in the app with your backup file.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => window.print()} style={{ padding: '8px 16px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8 }}>Print</button>
              <button onClick={() => setShowEmergencyKit(false)} style={styles.lockBtn}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && importFilePath && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
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
        <div role="alert" style={{ padding: '12px 24px', background: 'rgba(210, 153, 34, 0.15)', borderBottom: '1px solid var(--border)', color: 'var(--warning)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span aria-hidden style={{ fontSize: 18 }}>⚠️</span>
          No backup yet. Export your vault to a file for safekeeping.
        </div>
      )}
      {backupStatus === 'warn' && (
        <div role="alert" style={{ padding: '12px 24px', background: 'rgba(210, 153, 34, 0.15)', borderBottom: '1px solid var(--border)', color: 'var(--warning)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span aria-hidden style={{ fontSize: 18 }}>⚠️</span>
          Backup is {backupDaysAgo} days old. Export your vault to stay safe.
        </div>
      )}
      {backupStatus === 'critical' && (
        <div role="alert" style={{ padding: '12px 24px', background: 'rgba(248, 81, 73, 0.15)', borderBottom: '1px solid var(--border)', color: 'var(--danger)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span aria-hidden style={{ fontSize: 18 }}>🚨</span>
          No recent backup ({backupDaysAgo} days). Export now to avoid losing access.
        </div>
      )}

      <main style={styles.content}>
        <VaultItemList
          items={displayItems}
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
