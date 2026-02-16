import { useState } from 'react';
import type { VaultMetadata } from '../../shared/types/vault';
import { useToast } from '../components/Toast';
import { LoadingSpinner } from '../components/LoadingSpinner';

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: 'linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)',
  },
  card: {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 40,
    maxWidth: 420,
    width: '100%',
    boxShadow: 'var(--shadow-md)',
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    marginBottom: 8,
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: 14,
    marginBottom: 32,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 14,
    marginBottom: 16,
  },
  button: {
    width: '100%',
    padding: 14,
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    fontSize: 16,
    fontWeight: 600,
  },
  buttonHover: { background: 'var(--accent-hover)' },
  error: {
    color: 'var(--danger)',
    fontSize: 13,
    marginTop: 8,
  },
};

interface UnlockVaultProps {
  onUnlocked: (metadata: VaultMetadata) => void;
}

export function UnlockVault({ onUnlocked }: UnlockVaultProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { metadata } = await window.vault.unlock(password);
      onUnlocked(metadata);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid password';
      setError(msg);
      toast.show(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Unlock vault</h1>
        <p style={styles.subtitle}>
          Enter your master password to access your credentials.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Master password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            style={styles.input}
            className={error ? 'input-error' : ''}
            autoFocus
            disabled={loading}
            aria-invalid={!!error}
            aria-describedby={error ? 'unlock-error' : undefined}
          />
          {error && <p id="unlock-error" style={styles.error} role="alert">{error}</p>}
          <button type="submit" className="btn-primary" style={styles.button} disabled={loading} aria-busy={loading}>
            {loading ? (
              <>
                <LoadingSpinner size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                Unlocking...
              </>
            ) : (
              'Unlock vault'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
