'use client';

export type GaugeTone = 'ok' | 'watch' | 'bad' | 'muted';

const TONE_HEX: Record<GaugeTone, string> = {
  ok: '#33d6a6',
  watch: '#ffb066',
  bad: '#ff5f7e',
  muted: '#5b6178',
};

function clamp01(value: number | null) {
  if (value === null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(1, value));
}

export function RadialGauge({ value01, label, sublabel, tone = 'muted', size = 74 }: { value01: number | null; label: string; sublabel?: string; tone?: GaugeTone; size?: number }) {
  const radius = size / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const clamped = clamp01(value01);
  const dash = clamped === null ? 0 : circumference * clamped;
  const color = TONE_HEX[tone];
  return (
    <div className="rg-wrap" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="4.5" />
        {clamped !== null ? <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round" strokeDasharray={`${dash} ${circumference - dash}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ filter: `drop-shadow(0 0 5px ${color})`, transition: 'stroke-dasharray .4s ease' }} /> : <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="2.5" strokeDasharray="2 4" />}
      </svg>
      <div className="rg-center"><b style={{ color: clamped === null ? '#5b6178' : color }}>{clamped === null ? 'GATED' : `${Math.round(clamped * 100)}%`}</b></div>
      <span className="rg-label">{label}</span>
      {sublabel ? <em className="rg-sublabel">{sublabel}</em> : null}
      <style jsx>{`.rg-wrap{position:relative;display:grid;place-items:center;justify-items:center;gap:2px}.rg-center{position:absolute;top:0;left:0;width:100%;height:100%;display:grid;place-items:center;pointer-events:none}.rg-center b{font-family:var(--sfi-font-mono),monospace;font-size:11px;font-weight:600;letter-spacing:.02em}.rg-label{margin-top:4px;font-family:var(--sfi-font-mono),monospace;font-size:7.5px;letter-spacing:.14em;text-transform:uppercase;color:#8890a8;text-align:center}.rg-sublabel{font-style:normal;font-family:var(--sfi-font-mono),monospace;font-size:6.5px;letter-spacing:.04em;color:#5b6178;text-align:center}`}</style>
    </div>
  );
}

export function CountTile({ value, label, source, tone = 'muted' }: { value: number | string; label: string; source: string; tone?: GaugeTone }) {
  const color = TONE_HEX[tone];
  return (
    <div className="ct-wrap" title={source}>
      <span className="ct-dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      <b style={{ color }}>{value}</b>
      <em>{label}</em>
      <style jsx>{`.ct-wrap{display:grid;justify-items:center;gap:3px;padding:6px 4px}.ct-dot{width:6px;height:6px;border-radius:50%}.ct-wrap b{font-family:var(--sfi-font-mono),monospace;font-size:15px;font-weight:600}.ct-wrap em{font-style:normal;font-family:var(--sfi-font-mono),monospace;font-size:6.5px;letter-spacing:.1em;text-transform:uppercase;color:#8890a8;text-align:center}`}</style>
    </div>
  );
}
