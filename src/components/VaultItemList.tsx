import type { VaultItem } from '../../shared/types/vault';

const styles: Record<string, React.CSSProperties> = {
  section: { marginBottom: 24 },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
    transition: 'border-color 0.15s',
  },
  cardHover: { borderColor: 'var(--accent)' },
  cardTitle: { fontSize: 16, fontWeight: 600, marginBottom: 4 },
  cardDomain: { fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 },
  cardMeta: { fontSize: 12, color: 'var(--text-secondary)' },
  empty: {
    textAlign: 'center',
    padding: 48,
    color: 'var(--text-secondary)',
    border: '1px dashed var(--border)',
    borderRadius: 12,
  },
  emptyTitle: { fontSize: 18, marginBottom: 8 },
  emptyDesc: { fontSize: 14 },
};

interface VaultItemListProps {
  items: VaultItem[];
  onSelect: (item: VaultItem) => void;
  onAdd: () => void;
}

export function VaultItemList({ items, onSelect, onAdd }: VaultItemListProps) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Your credentials</h2>
        <button
          style={styles.addBtn}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.addBtnHover)}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
          onClick={onAdd}
        >
          + Add item
        </button>
      </div>

      {items.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyTitle}>No credentials yet</p>
          <p style={styles.emptyDesc}>
            Add your first login, recovery codes, or notes. Everything is encrypted locally.
          </p>
          <button
            style={{ ...styles.addBtn, marginTop: 16 }}
            onClick={onAdd}
          >
            Add your first item
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {items.map((item) => {
            const attachmentCount = item.attachments?.length ?? 0;
            return (
              <div
                key={item.id}
                style={styles.card}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.cardHover)}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = ''; }}
                onClick={() => onSelect(item)}
              >
                <div style={styles.cardTitle}>{item.title}</div>
                <div style={styles.cardDomain}>{item.domain || '—'}</div>
                <div style={styles.cardMeta}>
                  {item.usernames?.[0] || 'No username'} · {item.recoveryCodes?.length ?? 0} codes
                  {attachmentCount > 0 && ` · ${attachmentCount} file${attachmentCount === 1 ? '' : 's'}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
