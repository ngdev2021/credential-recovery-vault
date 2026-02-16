/** Accessible loading spinner */
export function LoadingSpinner({ size = 24, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: '2px solid var(--border)',
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        ...style,
      }}
    />
  );
}
