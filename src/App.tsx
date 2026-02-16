import { useCallback, useEffect, useState } from 'react';
import { CreateVault } from './pages/CreateVault';
import { UnlockVault } from './pages/UnlockVault';
import { VaultDashboard } from './pages/VaultDashboard';
import type { VaultMetadata } from '../shared/types/vault';

type AppState = 'loading' | 'create' | 'unlock' | 'vault';

function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [metadata, setMetadata] = useState<VaultMetadata | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const exists = await window.vault.exists();
        if (cancelled) return;

        if (exists) {
          const state = await window.vault.getState();
          if (cancelled) return;

          if (state) {
            setMetadata(state.metadata);
            setAppState('vault');
          } else {
            setAppState('unlock');
          }
        } else {
          setAppState('create');
        }
      } catch (e) {
        console.error('Vault init failed:', e);
        if (!cancelled) setAppState('unlock');
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const onVaultCreated = (meta: VaultMetadata) => {
    setMetadata(meta);
    setAppState('vault');
  };

  const onVaultUnlocked = (meta: VaultMetadata) => {
    setMetadata(meta);
    setAppState('vault');
  };

  const onLock = useCallback(() => {
    setMetadata(null);
    setAppState('unlock');
  }, []);

  useEffect(() => {
    const unsubscribe = window.vault.onLocked(onLock);
    return unsubscribe;
  }, [onLock]);

  const handleVaultDataChange = useCallback((meta: VaultMetadata) => {
    setMetadata(meta);
  }, []);

  if (appState === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Loading...</span>
      </div>
    );
  }

  if (appState === 'create') {
    return <CreateVault onCreated={onVaultCreated} />;
  }

  if (appState === 'unlock') {
    return <UnlockVault onUnlocked={onVaultUnlocked} />;
  }

  if (appState === 'vault' && metadata) {
    return (
      <VaultDashboard
        metadata={metadata}
        onLock={onLock}
        onVaultDataChange={handleVaultDataChange}
      />
    );
  }

  return <UnlockVault onUnlocked={onVaultUnlocked} />;
}

export default App;
