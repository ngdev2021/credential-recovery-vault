import { useState } from 'react';
import type { VaultMetadata } from '../../shared/types/vault';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { metadata } = await window.vault.unlock(password);
      onUnlocked(metadata);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid password');
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
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            autoFocus
            disabled={loading}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Unlocking...' : 'Unlock vault'}
          </button>
        </form>
      </div>
    </div>
  );
}
