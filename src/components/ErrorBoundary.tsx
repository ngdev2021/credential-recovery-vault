import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message = error instanceof Error ? error.message : 'Unknown render error';
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    console.error('Renderer ErrorBoundary captured an error:', error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg-primary)' }}>
          <div style={{ maxWidth: 520, width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
            <h1 style={{ marginBottom: 8, fontSize: 22 }}>Something went wrong</h1>
            <p style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>
              The app hit an unexpected render error. Your encrypted vault remains on disk.
            </p>
            <pre style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: 'var(--bg-tertiary)', whiteSpace: 'pre-wrap' }}>
              {this.state.message}
            </pre>
            <button
              type="button"
              onClick={this.handleReload}
              style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
