'use client';

import type { WorldSpectReading } from '@/observatory/worldspect/worldSpectTypes';

type WorldSpectPanelProps = {
  reading: WorldSpectReading | null;
  open: boolean;
  latestSnapshot?: Record<string, unknown> | null;
  onToggle: () => void;
};

export function WorldSpectPanel({ reading, open, latestSnapshot, onToggle }: WorldSpectPanelProps) {
  if (!reading) return null;

  return (
    <aside className={`worldspect ${open ? 'open' : ''}`} aria-label="WorldSpect">
      <button type="button" className="worldspect-trigger" onClick={onToggle}>
        <span>WorldSpect</span>
        <strong>{reading.symbols.join(' ')}</strong>
      </button>

      {open && (
        <div className="worldspect-body">
          <div className="worldspect-top">
            <span className="trigger-symbol">{reading.triggerSymbol}</span>
            <div>
              <p>{reading.triggerSummary}</p>
              <small>{reading.sourceDescriptor.label} - confianza {reading.sourceDescriptor.confidence}</small>
            </div>
          </div>

          <div className="worldspect-reading">
            <span>lectura</span>
            <p>{reading.meaning}</p>
          </div>

          <div className="worldspect-reading">
            <span>accion</span>
            <p>{reading.suggestedAction}</p>
          </div>

          {latestSnapshot && (
            <div className="worldspect-reading">
              <span>ultima lectura medida</span>
              <p>{String(latestSnapshot.observed_at || latestSnapshot.created_at || 'sin timestamp')}</p>
            </div>
          )}

          <div className="worldspect-vectors">
            {reading.vectors.map((vector) => (
              <div key={vector.variable} className={`worldspect-vector ${vector.state}`}>
                <strong>{vector.symbol}</strong>
                <span>{vector.variable}</span>
                <p>{vector.reading}</p>
              </div>
            ))}
          </div>

          {reading.observationWindow && (
            <div className="worldspect-window">
              <span>{reading.observationWindow.visibleSummary}</span>
              <div>
                {reading.observationWindow.options.map((option) => <em key={option}>{option}</em>)}
              </div>
            </div>
          )}

          <details className="worldspect-trace">
            <summary>trazabilidad</summary>
            <p>
              Estado: {reading.sourceDescriptor.sourceState}
              <br />
              Confianza: {reading.sourceDescriptor.confidence}
              <br />
              Externo: {reading.sourceDescriptor.isExternal ? 'si' : 'no'}
              <br />
              Simulado: {reading.sourceDescriptor.isSimulated ? 'si' : 'no'}
              <br />
              Timestamp: {reading.sourceDescriptor.timestamp}
              {reading.sourceDescriptor.sourceUrl ? (
                <>
                  <br />
                  URL: {reading.sourceDescriptor.sourceUrl}
                </>
              ) : null}
            </p>
          </details>
        </div>
      )}

      <style jsx>{`
        .worldspect {
          position: absolute;
          right: 1rem;
          top: 3.2rem;
          z-index: 9;
          width: min(22rem, calc(100vw - 2rem));
          color: rgba(214, 211, 199, 0.78);
          font-family: var(--font-mono), "JetBrains Mono", monospace;
          pointer-events: auto;
        }
        .worldspect-trigger {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 1px solid rgba(80, 128, 116, 0.25);
          background: rgba(7, 14, 13, 0.58);
          color: rgba(214, 211, 199, 0.62);
          backdrop-filter: blur(14px);
          padding: 0.48rem 0.62rem;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font: inherit;
          font-size: 0.5rem;
        }
        .worldspect-trigger strong {
          color: rgba(141, 187, 165, 0.9);
          font-size: 0.62rem;
          letter-spacing: 0.08em;
        }
        .worldspect-body {
          margin-top: 0.35rem;
          border: 1px solid rgba(80, 128, 116, 0.2);
          background:
            linear-gradient(180deg, rgba(8, 18, 16, 0.82), rgba(6, 6, 5, 0.74)),
            rgba(6, 6, 5, 0.76);
          backdrop-filter: blur(18px);
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.34);
          padding: 0.72rem;
        }
        .worldspect-top {
          display: grid;
          grid-template-columns: 2rem 1fr;
          gap: 0.6rem;
          align-items: center;
          margin-bottom: 0.65rem;
        }
        .trigger-symbol {
          color: #8dbba5;
          font-size: 1.2rem;
          line-height: 1;
        }
        p {
          margin: 0;
          line-height: 1.45;
        }
        small {
          display: block;
          margin-top: 0.25rem;
          color: rgba(214, 211, 199, 0.34);
          font-size: 0.46rem;
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }
        .worldspect-reading {
          border-top: 1px solid rgba(80, 128, 116, 0.13);
          padding-top: 0.55rem;
          margin-top: 0.55rem;
        }
        .worldspect-reading span,
        .worldspect-window span {
          display: block;
          color: rgba(141, 187, 165, 0.68);
          font-size: 0.46rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          margin-bottom: 0.28rem;
        }
        .worldspect-reading p {
          color: rgba(214, 211, 199, 0.68);
          font-size: 0.62rem;
        }
        .worldspect-vectors {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.35rem;
          margin-top: 0.65rem;
        }
        .worldspect-vector {
          border: 1px solid rgba(80, 128, 116, 0.12);
          background: rgba(8, 18, 16, 0.28);
          padding: 0.45rem;
          min-height: 4.5rem;
        }
        .worldspect-vector.watch {
          border-color: rgba(184, 80, 80, 0.24);
          background: rgba(44, 18, 15, 0.24);
        }
        .worldspect-vector strong {
          color: #8dbba5;
          font-size: 0.75rem;
        }
        .worldspect-vector span {
          display: block;
          color: rgba(214, 211, 199, 0.42);
          font-size: 0.44rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin: 0.18rem 0;
        }
        .worldspect-vector p {
          color: rgba(214, 211, 199, 0.56);
          font-size: 0.52rem;
          line-height: 1.4;
        }
        .worldspect-window {
          margin-top: 0.65rem;
          border-top: 1px solid rgba(200, 169, 81, 0.12);
          padding-top: 0.55rem;
        }
        .worldspect-trace {
          margin-top: 0.65rem;
          border-top: 1px solid rgba(80, 128, 116, 0.14);
          padding-top: 0.55rem;
        }
        .worldspect-trace summary {
          color: rgba(141, 187, 165, 0.58);
          cursor: pointer;
          font-size: 0.46rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .worldspect-trace p {
          margin-top: 0.42rem;
          color: rgba(214, 211, 199, 0.5);
          font-size: 0.52rem;
          line-height: 1.55;
        }
        .worldspect-window div {
          display: flex;
          flex-wrap: wrap;
          gap: 0.28rem;
        }
        .worldspect-window em {
          border: 1px solid rgba(200, 169, 81, 0.13);
          color: rgba(200, 169, 81, 0.62);
          background: rgba(200, 169, 81, 0.04);
          padding: 0.22rem 0.34rem;
          font-style: normal;
          font-size: 0.48rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        @media (max-width: 760px) {
          .worldspect {
            top: auto;
            right: 0.8rem;
            left: 0.8rem;
            bottom: 8.4rem;
            width: auto;
          }
          .worldspect-vectors {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </aside>
  );
}
