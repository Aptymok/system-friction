'use client';

import { FormEvent, useState } from 'react';

export function AtlasActionBar({
  modeLabel,
  placeholder,
  suggestedProcesses,
  tension,
  density,
  onSubmit,
  onActivityChange,
}: {
  modeLabel: string;
  placeholder: string;
  suggestedProcesses: string[];
  tension: number;
  density: number;
  onSubmit: (command: string) => void | Promise<void>;
  onActivityChange?: (state: { value: string; tension: number; density: number; writing: boolean }) => void;
}) {
  const [value, setValue] = useState('');
  const updateValue = (next: string) => {
    setValue(next);
    const words = next.trim() ? next.trim().split(/\s+/).length : 0;
    const nextTension = Math.min(1, next.length / 180 + words / 50);
    const nextDensity = Math.min(1, words / 24 + nextTension * 0.35);
    onActivityChange?.({ value: next, tension: nextTension, density: nextDensity, writing: Boolean(next.trim()) });
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const command = value.trim();
    if (!command) return;
    await onSubmit(command);
    updateValue('');
  };
  return (
    <form className="atlas-action-bar" onSubmit={submit}>
      <span>AMV · ACTIVO</span>
      <i className="tension" aria-hidden="true"><b style={{ width: `${Math.round(tension * 100)}%` }} /></i>
      <span className="mode">{modeLabel} · ρ={Math.round(density * 100)} · τ={Math.round(tension * 100)}</span>
      <input value={value} onChange={(event) => updateValue(event.target.value)} placeholder={placeholder} />
      {suggestedProcesses[0] ? (
        <button type="button" className="suggestion" onClick={() => updateValue(suggestedProcesses[0])}>
          {suggestedProcesses[0]}
        </button>
      ) : null}
      <button type="submit">Ejecutar</button>
      <style jsx>{`
        .atlas-action-bar {
          position: fixed;
          left: 1rem;
          right: 1rem;
          bottom: env(safe-area-inset-bottom, 0px);
          z-index: 30;
          display: grid;
          grid-template-columns: auto 54px auto 1fr auto auto;
          gap: 0.5rem;
          align-items: center;
          min-height: 4rem;
          padding: 0.55rem 0.65rem;
          border-top: 1px solid rgba(200, 169, 81, 0.14);
          background: rgba(5, 5, 5, 0.88);
          backdrop-filter: blur(18px);
          font-family: "JetBrains Mono", monospace;
        }
        span {
          color: rgba(200, 169, 81, 0.78);
          font-size: 0.52rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .mode {
          color: rgba(80, 76, 64, 0.68);
        }
        .tension {
          display: block;
          width: 54px;
          height: 1px;
          background: rgba(200, 169, 81, 0.1);
          overflow: hidden;
        }
        .tension b {
          display: block;
          height: 1px;
          background: rgba(200, 169, 81, 0.72);
          transition: width 120ms ease;
        }
        input {
          min-width: 0;
          border: 0;
          border-bottom: 1px solid rgba(200, 169, 81, 0.14);
          background: transparent;
          color: rgba(216, 212, 200, 0.86);
          min-height: 2.7rem;
          padding: 0 0.78rem;
          font: inherit;
          font-size: 0.72rem;
          outline: none;
        }
        input:focus {
          border-bottom-color: rgba(200, 169, 81, 0.48);
        }
        button {
          min-height: 2.7rem;
          border: 1px solid rgba(200, 169, 81, 0.18);
          background: rgba(200, 169, 81, 0.06);
          color: rgba(216, 212, 200, 0.78);
          font: inherit;
          font-size: 0.55rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          padding: 0 0.75rem;
          cursor: pointer;
        }
        .suggestion {
          color: rgba(110, 200, 138, 0.72);
          border-color: rgba(110, 200, 138, 0.18);
        }
        @media (max-width: 760px) {
          .atlas-action-bar {
            left: 0;
            right: 0;
            grid-template-columns: 1fr auto;
            padding: 0.58rem 0.75rem calc(0.58rem + env(safe-area-inset-bottom, 0px));
          }
          span,
          .mode,
          .tension,
          .suggestion {
            display: none;
          }
          input,
          button {
            min-height: 44px;
            font-size: 0.66rem;
          }
        }
      `}</style>
    </form>
  );
}
