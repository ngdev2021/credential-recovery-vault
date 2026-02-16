import type { VaultItem } from '../../shared/types/vault';
import { EmptyStateIllustration } from './EmptyStateIllustration';

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
    minHeight: 44,
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    fontSize: 14,
    fontWeight: 600,
  },
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
    boxShadow: 'var(--shadow-sm)',
  },
  cardTitle: { fontSize: 16, fontWeight: 600, marginBottom: 4 },
  cardDomain: { fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 },
  cardMeta: { fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 },
  cardFooter: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
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
          className="btn-primary"
          style={styles.addBtn}
          onClick={onAdd}
          aria-label="Add new credential"
        >
          + Add item
        </button>
      </div>

      {items.length === 0 ? (
        <div style={styles.empty}>
          <EmptyStateIllustration />
          <p style={styles.emptyTitle}>No credentials yet</p>
          <p style={styles.emptyDesc}>
            Add your first login, recovery codes, or notes. Everything is encrypted locally.
          </p>
          <button
            className="btn-primary"
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
                className="vault-card card-elevated"
                style={styles.card}
                onClick={() => onSelect(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSelect(item)}
                aria-label={`Open ${item.title}`}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={styles.cardTitle}>{item.title}</div>
                  {item.riskLevel && (
                    <span
                      className={`risk-dot ${item.riskLevel}`}
                      title={`Risk: ${item.riskLevel}`}
                      aria-hidden
                    />
                  )}
                </div>
                <div style={styles.cardDomain}>{item.domain || '—'}</div>
                <div style={styles.cardMeta}>
                  {item.usernames?.[0] || 'No username'} · {item.recoveryCodes?.length ?? 0} codes
                  {attachmentCount > 0 && ` · ${attachmentCount} file${attachmentCount === 1 ? '' : 's'}`}
                </div>
                <div style={styles.cardFooter}>
                  <span className={`badge-category ${item.category}`}>{item.category}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
