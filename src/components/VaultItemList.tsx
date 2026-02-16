import { useState, useMemo } from 'react';
import type { VaultItem } from '../../shared/types/vault';
import { VaultSearchFilters } from './VaultSearchFilters';
import {
  filterVaultItems,
  extractAllTags,
  DEFAULT_FILTERS,
  type VaultFilters,
} from '../utils/vaultFilters';

const styles: Record<string, React.CSSProperties> = {
  section: { marginBottom: 24 },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' },
  addBtn: {
    padding: '8px 16px',
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  addBtnHover: { background: 'var(--accent-hover)' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 12,
  },
  card: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 16,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  cardHover: {
    borderColor: 'var(--accent)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  cardTitle: { fontSize: 16, fontWeight: 600, marginBottom: 4 },
  cardDomain: { fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 },
  cardMeta: { fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 },
  tagChip: {
    display: 'inline-block',
    padding: '2px 8px',
    marginRight: 6,
    marginBottom: 4,
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontSize: 11,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tagChipHover: {
    background: 'var(--accent)',
    borderColor: 'var(--accent)',
    color: 'white',
  },
  empty: {
    textAlign: 'center',
    padding: 48,
    color: 'var(--text-secondary)',
    border: '1px dashed var(--border)',
    borderRadius: 12,
    background: 'var(--bg-secondary)',
  },
  emptyTitle: { fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' },
  emptyDesc: { fontSize: 14, marginBottom: 16 },
  emptyFiltered: {
    textAlign: 'center',
    padding: 32,
    color: 'var(--text-secondary)',
    border: '1px dashed var(--border)',
    borderRadius: 12,
    background: 'var(--bg-secondary)',
  },
};

interface VaultItemListProps {
  items: VaultItem[];
  onSelect: (item: VaultItem) => void;
  onAdd: () => void;
}

export function VaultItemList({ items, onSelect, onAdd }: VaultItemListProps) {
  const [filters, setFilters] = useState<VaultFilters>(DEFAULT_FILTERS);

  const allTags = useMemo(() => extractAllTags(items), [items]);
  const filteredItems = useMemo(
    () => filterVaultItems(items, filters),
    [items, filters]
  );

  const handleFiltersChange = (updates: Partial<VaultFilters>) => {
    setFilters((f) => ({ ...f, ...updates }));
  };

  const handleTagClick = (tag: string) => {
    setFilters((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));
  };

  const hasActiveFilters =
    filters.searchQuery ||
    filters.category ||
    filters.tags.length > 0 ||
    filters.hasAttachments != null ||
    filters.hasUnusedCodes != null;

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Your credentials</h2>
        <button
          className="btn-primary"
          style={styles.addBtn}
          onClick={onAdd}
        >
          + Add item
        </button>
      </div>

      {items.length > 0 && (
        <VaultSearchFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          allTags={allTags}
        />
      )}

      {items.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyTitle}>No credentials yet</p>
          <p style={styles.emptyDesc}>
            Add your first login, recovery codes, or notes. Everything is
            encrypted locally.
          </p>
          <button
            className="btn-primary"
            style={{ ...styles.addBtn, marginTop: 16 }}
            onClick={onAdd}
          >
            Add your first item
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={styles.emptyFiltered}>
          <p style={styles.emptyTitle}>No matching items</p>
          <p style={styles.emptyDesc}>
            {hasActiveFilters
              ? 'Try adjusting your filters or search query.'
              : 'No items match the current filters.'}
          </p>
          <button
            className="btn-secondary"
            style={{
              padding: '8px 16px',
              marginTop: 12,
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text-secondary)',
              fontSize: 14,
              cursor: 'pointer',
            }}
            onClick={() => setFilters(DEFAULT_FILTERS)}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredItems.map((item) => {
            const attachmentCount = item.attachments?.length ?? 0;
            return (
              <div
                key={item.id}
                className="vault-card"
                style={styles.card}
                onClick={() => onSelect(item)}
              >
                <div style={styles.cardTitle}>{item.title}</div>
                <div style={styles.cardDomain}>{item.domain || '—'}</div>
                <div style={styles.cardMeta}>
                  {item.usernames?.[0] || 'No username'} · {item.recoveryCodes?.length ?? 0} codes
                  {attachmentCount > 0 && ` · ${attachmentCount} file${attachmentCount === 1 ? '' : 's'}`}
                </div>
                {(item.tags ?? []).length > 0 && (
                  <div>
                    {(item.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="tag-chip"
                        style={styles.tagChip}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTagClick(tag);
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
