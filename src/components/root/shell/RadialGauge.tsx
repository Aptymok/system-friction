'use client';

import type { CSSProperties } from 'react';

export type GaugeTone = 'ok' | 'watch' | 'bad' | 'muted';

type GaugeStyle = CSSProperties & { '--gauge-color': string };

function clamp01(value: number | null) {
  if (value === null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(1, value));
}

function toneColor(tone: GaugeTone) {
  if (tone === 'ok') return '#33d6a6';
  if (tone === 'watch') return '#ffb066';
  if (tone === 'bad') return '#ff5f7e';
  return '#8890a8';
}

export function RadialGauge({ value01, label, sublabel, tone }: { value01: number | null; label: string; sublabel?: string; tone: GaugeTone }) {
  const value = clamp01(value01);
  const pct = value === null ? 'GATED' : `${Math.round(value * 100)}%`;
  const dash = value === null ? 0 : Math.round(value * 100);
  const color = toneColor(tone);
  const style: GaugeStyle = { '--gauge-color': color };
  return (
    <div className="rg" style={style}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle className="track" cx="32" cy="32" r="24" />
        <circle className="value" cx="32" cy="32" r="24" pathLength="100" strokeDasharray={`${dash} 100`} />
      </svg>
      <b>{pct}</b>
      <span>{label}</span>
      {sublabel ? <em>{sublabel}</em> : null}
      <style jsx>{`.rg{width:100%;display:grid;place-items:center;gap:2px;color:#e6e8f5}.rg svg{width:78px;height:78px;transform:rotate(-90deg);filter:drop-shadow(0 0 16px color-mix(in srgb,var(--gauge-color) 32%,transparent))}.track{fill:none;stroke:rgba(255,255,255,.08);stroke-width:5}.value{fill:none;stroke:var(--gauge-color);stroke-width:5;stroke-linecap:round}.rg b{margin-top:-58px;font-size:13px;font-weight:500;color:var(--gauge-color)}.rg span{margin-top:37px;font-size:7.5px;letter-spacing:.12em;text-transform:uppercase;color:#a9adc4;text-align:center}.rg em{font-style:normal;font-size:7px;color:#5b6178;text-align:center}`}</style>
    </div>
  );
}

export function CountTile({ value, label, source, tone }: { value: number | string; label: string; source: string; tone: GaugeTone }) {
  const color = toneColor(tone);
  const style: GaugeStyle = { '--gauge-color': color };
  return (
    <div className="ct" style={style} title={source}>
      <b>{value}</b>
      <span>{label}</span>
      <em>{source}</em>
      <style jsx>{`.ct{width:100%;min-height:78px;display:grid;align-content:center;gap:3px;padding:8px;color:#e6e8f5}.ct b{font-size:22px;line-height:1;color:var(--gauge-color);font-weight:500}.ct span{font-size:7.5px;letter-spacing:.12em;text-transform:uppercase;color:#a9adc4}.ct em{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-style:normal;font-size:6.5px;color:#5b6178}`}</style>
    </div>
  );
}
