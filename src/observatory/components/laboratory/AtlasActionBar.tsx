'use client';

import { FormEvent, useState } from 'react';

export function AtlasActionBar({
  modeLabel,
  placeholder,
  suggestedProcesses,
  onSubmit,
}: {
  modeLabel: string;
  placeholder: string;
  suggestedProcesses: string[];
  onSubmit: (command: string) => void | Promise<void>;
}) {
  const [value, setValue] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const command = value.trim();
    if (!command) return;
    await onSubmit(command);
    setValue('');
  };
  return (
    <form className="atlas-action-bar" onSubmit={submit}>
      <span>{modeLabel}</span>
      <input value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} />
      {suggestedProcesses[0] ? (
        <button type="button" className="suggestion" onClick={() => setValue(suggestedProcesses[0])}>
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
          grid-template-columns: auto 1fr auto auto;
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
        input {
          min-width: 0;
          border: 1px solid rgba(200, 169, 81, 0.14);
          background: rgba(12, 12, 10, 0.76);
          color: rgba(216, 212, 200, 0.86);
          min-height: 2.7rem;
          padding: 0 0.78rem;
          font: inherit;
          font-size: 0.72rem;
          outline: none;
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
