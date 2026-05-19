'use client';

import { useState } from 'react';
import type { FieldCommandMode, FieldOntologyNode } from './fieldOntology';

type FieldCommandInputProps = {
  activeNode: FieldOntologyNode | null;
  disabled?: boolean;
  onExecute: (command: string, evidence?: File | null) => Promise<void> | void;
};

const placeholders: Record<FieldCommandMode, string> = {
  project_manager: 'convertir esta intencion en tarea verificable...',
  intervention: 'ajustar intervencion o definir evidencia...',
  media: 'ajustar draft, copy, campania o validacion...',
  calendar: 'fijar proxima observacion o ventana...',
  social: 'registrar metricas, comentarios o resonancia...',
  logbook: 'regenerar bitacora o fragmento publico...',
  amv: 'pedir lectura operacional puntual...',
  asset_eval: 'activar lectura del asset actual...',
  evidence: 'anclar evidencia verificable...',
  longitudinal: 'registrar cambio, riesgo o impacto observado...',
  ontology: 'inspeccionar relacion del nodo con el asset...',
  twin: 'registrar recurrencia o continuidad observada...',
};

export function FieldCommandInput({ activeNode, disabled, onExecute }: FieldCommandInputProps) {
  const [command, setCommand] = useState('');
  const [evidence, setEvidence] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const mode = activeNode?.commandMode || 'project_manager';

  const submit = async () => {
    const clean = command.trim();
    if (!clean || busy || disabled) return;
    setBusy(true);
    try {
      await onExecute(clean, evidence);
      setCommand('');
      setEvidence(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="field-command" aria-label="Linea de comando contextual del campo">
      <div className="mode-sigil">
        <span>{activeNode?.label || 'Project Manager'}</span>
        <small>{mode}</small>
      </div>
      <input
        value={command}
        onChange={(event) => setCommand(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') void submit();
        }}
        placeholder={placeholders[mode]}
        disabled={disabled || busy}
      />
      <label className="attach">
        ev
        <input type="file" onChange={(event) => setEvidence(event.target.files?.[0] || null)} />
      </label>
      <button type="button" disabled={!command.trim() || disabled || busy} onClick={() => void submit()}>
        {busy ? '...' : 'ejecutar'}
      </button>
      {evidence && <div className="evidence-name">{evidence.name}</div>}
      <style jsx>{`
        .field-command {
          position: absolute;
          left: 1rem;
          right: 1rem;
          bottom: 0.85rem;
          z-index: 6;
          display: grid;
          grid-template-columns: minmax(8rem, 12rem) 1fr auto auto;
          align-items: center;
          gap: 0.45rem;
          border: 1px solid rgba(200,169,81,0.13);
          background: rgba(5, 6, 6, 0.78);
          backdrop-filter: blur(16px);
          padding: 0.55rem;
          font-family: var(--font-mono), "JetBrains Mono", monospace;
        }
        .mode-sigil {
          border-right: 1px solid rgba(200,169,81,0.08);
          padding-right: 0.65rem;
          min-width: 0;
        }
        .mode-sigil span,
        .mode-sigil small {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-transform: uppercase;
        }
        .mode-sigil span {
          color: #C8A951;
          font-size: 0.5rem;
          letter-spacing: 0.16em;
        }
        .mode-sigil small {
          margin-top: 0.12rem;
          color: rgba(200,196,184,0.28);
          font-size: 0.38rem;
          letter-spacing: 0.18em;
        }
        input {
          min-width: 0;
          border: 0;
          outline: none;
          background: transparent;
          color: #c8c4b8;
          font: inherit;
          font-size: 0.72rem;
        }
        input::placeholder {
          color: rgba(200,196,184,0.2);
        }
        .attach,
        button {
          border: 1px solid rgba(200,169,81,0.16);
          background: rgba(200,169,81,0.04);
          color: rgba(200,169,81,0.68);
          padding: 0.46rem 0.58rem;
          font: inherit;
          font-size: 0.48rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .attach input {
          display: none;
        }
        button:disabled,
        input:disabled {
          opacity: 0.38;
          cursor: default;
        }
        .evidence-name {
          grid-column: 2 / -1;
          color: rgba(200,196,184,0.3);
          font-size: 0.46rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        @media (max-width: 760px) {
          .field-command {
            grid-template-columns: 1fr auto auto;
          }
          .mode-sigil {
            grid-column: 1 / -1;
            border-right: 0;
            border-bottom: 1px solid rgba(200,169,81,0.08);
            padding: 0 0 0.45rem;
          }
        }
      `}</style>
    </div>
  );
}
