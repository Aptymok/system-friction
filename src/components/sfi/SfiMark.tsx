export function SfiMark({ className = '', title = 'SYSTEM FRICTION INSTITUTE' }: { className?: string; title?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" role="img" aria-label={title}>
      <title>{title}</title>
      <rect x="8" y="8" width="104" height="104" fill="none" stroke="rgba(200,169,81,.28)" strokeWidth="1" />
      <circle cx="60" cy="60" r="38" fill="none" stroke="rgba(200,169,81,.35)" strokeWidth="1" />
      <circle cx="60" cy="60" r="23" fill="none" stroke="rgba(200,169,81,.18)" strokeWidth="1" />
      <line x1="60" y1="14" x2="60" y2="106" stroke="rgba(200,169,81,.30)" strokeWidth="1" />
      <line x1="14" y1="60" x2="106" y2="60" stroke="rgba(200,169,81,.30)" strokeWidth="1" />
      <circle cx="60" cy="60" r="5" fill="#c8a951" />
      <text x="60" y="93" textAnchor="middle" fill="rgba(200,169,81,.55)" fontSize="8" fontFamily="JetBrains Mono" letterSpacing="2">
        SFI
      </text>
    </svg>
  );
}
