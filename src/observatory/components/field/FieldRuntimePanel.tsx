'use client';

export type FieldRuntimeStatus = {
  persistence: 'supabase' | 'local_only' | 'unknown';
  lastEvent?: string | null;
  lastError?: string | null;
  worldSpect: 'local' | 'medido' | 'sin_lectura';
  social: 'manual_return' | 'read_only_missing_token' | 'read_only_ready' | 'captured' | 'unknown';
  realtime: 'no_habilitado';
  duplicatesBlocked: number;
  latestPersistedEventAt?: string | null;
};

type FieldRuntimePanelProps = {
  status: FieldRuntimeStatus;
};

export function FieldRuntimePanel({ status }: FieldRuntimePanelProps) {
  return (
    <details className="runtime-panel">
      <summary>
        Estado: {status.persistence} - realtime no habilitado
      </summary>
      <div className="runtime-grid">
        <span>Persistencia</span>
        <b>{status.persistence}</b>
        <span>Ultimo evento</span>
        <b>{status.lastEvent || 'sin evento'}</b>
        <span>Ultimo error</span>
        <b>{status.lastError || 'sin error'}</b>
        <span>WorldSpect</span>
        <b>{status.worldSpect}</b>
        <span>Social</span>
        <b>{status.social}</b>
        <span>Realtime</span>
        <b>{status.realtime.replace('_', ' ')}</b>
        <span>Duplicados bloqueados</span>
        <b>{status.duplicatesBlocked}</b>
      </div>
      <style jsx>{`
        .runtime-panel {
          position: absolute;
          right: 1rem;
          top: 3.2rem;
          z-index: 7;
          width: min(22rem, calc(100vw - 2rem));
          border: 1px solid rgba(200,169,81,0.1);
          background: rgba(6,6,5,0.48);
          backdrop-filter: blur(14px);
          color: rgba(200,196,184,0.48);
          font-family: var(--font-mono), "JetBrains Mono", monospace;
          font-size: 0.5rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        summary {
          cursor: pointer;
          padding: 0.5rem 0.65rem;
          color: rgba(200,169,81,0.72);
          list-style: none;
        }
        summary::-webkit-details-marker {
          display: none;
        }
        .runtime-grid {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 0.45rem 0.7rem;
          border-top: 1px solid rgba(200,169,81,0.08);
          padding: 0.65rem;
        }
        b {
          color: rgba(200,196,184,0.72);
          font-weight: 500;
          text-align: right;
          text-transform: none;
        }
        @media (max-width: 760px) {
          .runtime-panel {
            top: auto;
            right: 0.9rem;
            bottom: 8.4rem;
          }
        }
      `}</style>
    </details>
  );
}
