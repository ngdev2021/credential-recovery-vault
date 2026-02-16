import { useEffect, useState } from 'react';
import type { VaultMetadata, VaultItem } from '../../shared/types/vault';
import { VaultItemList } from '../components/VaultItemList';
import { VaultItemForm } from '../components/VaultItemForm';

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
  },
};

interface VaultDashboardProps {
  metadata: VaultMetadata;
  onLock: () => void;
}

export function VaultDashboard({ metadata, onLock }: VaultDashboardProps) {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<VaultItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  async function refreshItems() {
    const state = await window.vault.getState();
    if (state) setItems(state.items);
  }

  useEffect(() => {
    refreshItems();
  }, []);

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

  const handleAddItem = (item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    window.vault.addItem(item).then(() => {
      refreshItems();
      setShowAddForm(false);
    });
  };

  const handleUpdateItem = (id: string, updates: Partial<VaultItem>) => {
    window.vault.updateItem(id, updates).then(() => {
      refreshItems();
      setSelectedItem(null);
    });
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Delete this item? This cannot be undone.')) {
      window.vault.deleteItem(id).then(() => {
        refreshItems();
        setSelectedItem(null);
      });
    }
  };

  const displayItems = searchQuery.trim() ? filteredItems : items;

  return (
    <div style={styles.layout}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div>
            <h1 style={styles.title}>Credential Vault</h1>
            <span style={styles.meta}>
              {metadata.itemCount} items · Updated {new Date(metadata.updatedAt).toLocaleDateString()}
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
        <button
          style={styles.lockBtn}
          onClick={handleLock}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.lockBtnHover)}
          onMouseLeave={(e) => { e.currentTarget.style.color = ''; e.currentTarget.style.borderColor = ''; }}
        >
          Lock vault
        </button>
      </header>

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
          />
        )}

        {selectedItem && (
          <VaultItemForm
            mode="edit"
            item={selectedItem}
            onSave={(updates) => handleUpdateItem(selectedItem.id, updates)}
            onDelete={() => handleDeleteItem(selectedItem.id)}
            onCancel={() => setSelectedItem(null)}
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
