import type { VaultItemCategory } from '../../shared/types/vault';
import type { VaultFilters, VaultSortField } from '../utils/vaultFilters';

const CATEGORIES: VaultItemCategory[] = ['social', 'banking', 'work', 'dev', 'email', 'other'];
const SORT_OPTIONS: { value: VaultSortField; label: string }[] = [
  { value: 'title', label: 'Title' },
  { value: 'updatedAt', label: 'Last updated' },
  { value: 'riskLevel', label: 'Risk level' },
];

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  searchInput: {
    flex: '1 1 200px',
    minWidth: 200,
    padding: '8px 14px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 14,
  },
  select: {
    padding: '8px 12px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 13,
  },
  filterGroup: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  label: { fontSize: 12, color: 'var(--text-secondary)', marginRight: 4 },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontSize: 12,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  chipActive: {
    background: 'var(--accent)',
    borderColor: 'var(--accent)',
    color: 'white',
  },
  clearBtn: {
    padding: '4px 10px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontSize: 12,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
};

interface VaultSearchFiltersProps {
  filters: VaultFilters;
  onFiltersChange: (f: Partial<VaultFilters>) => void;
  allTags: string[];
}

export function VaultSearchFilters({
  filters,
  onFiltersChange,
  allTags,
}: VaultSearchFiltersProps) {
  const hasActiveFilters =
    filters.searchQuery ||
    filters.category ||
    filters.tags.length > 0 ||
    filters.hasAttachments != null ||
    filters.hasUnusedCodes != null;

  return (
    <div style={styles.bar}>
      <input
        type="search"
        placeholder="Search by title, domain, tags..."
        value={filters.searchQuery}
        onChange={(e) => onFiltersChange({ searchQuery: e.target.value })}
        style={styles.searchInput}
      />
      <div style={styles.filterGroup}>
        <span style={styles.label}>Category</span>
        <select
          style={styles.select}
          value={filters.category ?? ''}
          onChange={(e) =>
            onFiltersChange({ category: e.target.value || null })
          }
        >
          <option value="">All</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      {allTags.length > 0 && (
        <div style={styles.filterGroup}>
          <span style={styles.label}>Tags</span>
          {allTags.map((tag) => {
            const active = filters.tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                style={{ ...styles.chip, ...(active ? styles.chipActive : {}) }}
                onClick={() =>
                  onFiltersChange({
                    tags: active
                      ? filters.tags.filter((t) => t !== tag)
                      : [...filters.tags, tag],
                  })
                }
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}
      <div style={styles.filterGroup}>
        <button
          type="button"
          style={{
            ...styles.chip,
            ...(filters.hasAttachments === true ? styles.chipActive : {}),
          }}
          onClick={() =>
            onFiltersChange({
              hasAttachments:
                filters.hasAttachments === true ? null : true,
            })
          }
        >
          Has attachments
        </button>
        <button
          type="button"
          style={{
            ...styles.chip,
            ...(filters.hasUnusedCodes === true ? styles.chipActive : {}),
          }}
          onClick={() =>
            onFiltersChange({
              hasUnusedCodes:
                filters.hasUnusedCodes === true ? null : true,
            })
          }
        >
          Has unused codes
        </button>
      </div>
      <div style={styles.filterGroup}>
        <span style={styles.label}>Sort</span>
        <select
          style={styles.select}
          value={filters.sortBy}
          onChange={(e) =>
            onFiltersChange({
              sortBy: e.target.value as VaultSortField,
            })
          }
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          style={styles.chip}
          onClick={() =>
            onFiltersChange({
              sortDir: filters.sortDir === 'asc' ? 'desc' : 'asc',
            })
          }
        >
          {filters.sortDir === 'asc' ? '↑' : '↓'}
        </button>
      </div>
      {hasActiveFilters && (
        <button
          type="button"
          style={styles.clearBtn}
          onClick={() =>
            onFiltersChange({
              searchQuery: '',
              category: null,
              tags: [],
              hasAttachments: null,
              hasUnusedCodes: null,
            })
          }
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
