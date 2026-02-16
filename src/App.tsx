import { useEffect, useState } from 'react';
import { CreateVault } from './pages/CreateVault';
import { UnlockVault } from './pages/UnlockVault';
import { VaultDashboard } from './pages/VaultDashboard';
import type { VaultMetadata } from '../shared/types/vault';

type AppState = 'loading' | 'create' | 'unlock' | 'vault';

function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [metadata, setMetadata] = useState<VaultMetadata | null>(null);

  useEffect(() => {
    async function init() {
      const exists = await window.vault.exists();
      if (exists) {
        const state = await window.vault.getState();
        if (state) {
          setMetadata(state.metadata);
          setAppState('vault');
        } else {
          setAppState('unlock');
        }
      } else {
        setAppState('create');
      }
    }
    init();
  }, []);

  const onVaultCreated = (meta: VaultMetadata) => {
    setMetadata(meta);
    setAppState('vault');
  };

  const onVaultUnlocked = (meta: VaultMetadata) => {
    setMetadata(meta);
    setAppState('vault');
  };

  const onLock = () => {
    setMetadata(null);
    setAppState('unlock');
  };

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

  return <VaultDashboard metadata={metadata!} onLock={onLock} />;
}

export default App;
