import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    window.vault?.lock?.();
    window.dispatchEvent(new Event('vault-locked'));
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: 24,
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
          }}
        >
          <h2 style={{ marginBottom: 12, color: 'var(--danger)' }}>Something went wrong</h2>
          <p style={{ marginBottom: 24, color: 'var(--text-secondary)', fontSize: 14, maxWidth: 400, textAlign: 'center' }}>
            {this.state.error.message}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '10px 20px',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Reset to Unlock
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
