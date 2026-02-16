import { generateEmergencyKitPdf } from '../utils/emergencyKitPdf';
import type { VaultMetadata } from '../../shared/types/vault';

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    background: 'white',
    color: '#333',
    padding: 32,
    maxWidth: 480,
    width: '90%',
    borderRadius: 12,
  },
  title: { marginBottom: 16 },
  subtitle: { fontSize: 14, marginBottom: 12 },
  infoBox: {
    fontSize: 13,
    fontFamily: 'monospace',
    background: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  instructions: { fontSize: 12, color: '#666', marginBottom: 16 },
  actions: { display: 'flex', gap: 8 },
  btnPrimary: {
    padding: '8px 16px',
    background: 'var(--accent)',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid #ccc',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
  },
};

interface EmergencyKitModalProps {
  metadata: VaultMetadata;
  lastBackup: { path: string; exportedAt: string } | null;
  onClose: () => void;
}

export function EmergencyKitModal({
  metadata,
  lastBackup,
  onClose,
}: EmergencyKitModalProps) {
  const handleDownloadPdf = () => {
    generateEmergencyKitPdf({
      vaultId: metadata.id,
      itemCount: metadata.itemCount,
      lastBackupTime: lastBackup
        ? new Date(lastBackup.exportedAt).toLocaleString()
        : null,
    });
  };

  return (
    <div
      style={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.title}>Emergency Recovery Kit</h2>
        <p style={styles.subtitle}>Print or download this info and store it securely.</p>
        <div style={styles.infoBox}>
          <p><strong>Vault ID:</strong> {metadata.id}</p>
          <p><strong>Items:</strong> {metadata.itemCount}</p>
          <p><strong>Last backup:</strong>{' '}
            {lastBackup ? new Date(lastBackup.exportedAt).toLocaleString() : 'Never'}
          </p>
        </div>
        <p style={styles.instructions}>
          Your master password is the only way to unlock this vault. Store it
          separately. To restore: use Import in the app with your backup file.
        </p>
        <div style={styles.actions}>
          <button style={styles.btnPrimary} onClick={handleDownloadPdf}>
            Download PDF
          </button>
          <button style={styles.btnPrimary} onClick={() => window.print()}>
            Print
          </button>
          <button style={styles.btnSecondary} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
