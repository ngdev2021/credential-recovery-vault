/** Simple lock/vault SVG for empty state - no external assets */
export function EmptyStateIllustration() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ marginBottom: 16, opacity: 0.6 }}
    >
      <rect
        x="30"
        y="55"
        width="60"
        height="45"
        rx="4"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M45 55V40c0-8.284 6.716-15 15-15s15 6.716 15 15v15"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="60" cy="77" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}
