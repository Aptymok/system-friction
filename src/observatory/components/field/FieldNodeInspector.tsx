'use client';

import type { FieldOntologyNode } from './fieldOntology';

type FieldNodeInspectorProps = {
  node: FieldOntologyNode | null;
  activationReason?: string;
  lastEvent?: string;
  proposal?: string;
  onClose: () => void;
};

export function FieldNodeInspector({
  node,
  activationReason,
  lastEvent,
  proposal,
  onClose,
}: FieldNodeInspectorProps) {
  if (!node) return null;

  const title =
    node.type === 'module'
      ? 'capacidad'
      : node.type === 'twin'
        ? 'patron observado'
        : 'nodo ontologico';

  return (
    <aside className="field-inspector" aria-label="Inspector contextual de nodo">
      <div className="inspector-top">
        <span>{title}</span>
        <button type="button" onClick={onClose} aria-label="Cerrar inspector">cerrar</button>
      </div>
      <h3>{node.label}</h3>
      <p>{node.description}</p>

      <div className="inspector-grid">
        <div>
          <small>modo</small>
          <strong>{node.commandMode}</strong>
        </div>
        <div>
          <small>activacion</small>
          <strong>{activationReason || node.activationConditions[0] || 'campo basal'}</strong>
        </div>
      </div>

      {proposal && (
        <div className="inspector-block active">
          <small>propuesta</small>
          <p>{proposal}</p>
        </div>
      )}

      <div className="inspector-block">
        <small>{node.type === 'module' ? 'componentes / endpoints' : 'variables / patrones'}</small>
        <p>
          {node.type === 'module'
            ? [...node.linkedComponents, ...node.linkedEndpoints].join(' // ') || 'sin endpoint directo'
            : [...(node.variables || []), ...(node.patterns || [])].join(' // ') || 'sin variables declaradas'}
        </p>
      </div>

      <div className="inspector-block">
        <small>ADN SFI conectado</small>
        <p>{node.linkedSfNodes.join(' // ') || 'derivado operativo'}</p>
      </div>

      {lastEvent && (
        <div className="inspector-block">
          <small>ultimo evento</small>
          <p>{lastEvent}</p>
        </div>
      )}

      <style jsx>{`
        .field-inspector {
          position: absolute;
          right: 1rem;
          top: 3.2rem;
          z-index: 5;
          width: min(23rem, calc(100% - 2rem));
          border: 1px solid rgba(200,169,81,0.16);
          background: rgba(6, 8, 8, 0.72);
          backdrop-filter: blur(14px);
          box-shadow: 0 18px 60px rgba(0,0,0,0.34);
          padding: 1rem;
          color: #c8c4b8;
          font-family: var(--font-mono), "JetBrains Mono", monospace;
        }
        .inspector-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .inspector-top span,
        small {
          color: rgba(200,169,81,0.48);
          font-size: 0.46rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        button {
          border: 1px solid rgba(200,169,81,0.14);
          background: transparent;
          color: rgba(200,169,81,0.62);
          padding: 0.25rem 0.45rem;
          font: inherit;
          font-size: 0.48rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          cursor: pointer;
        }
        h3 {
          margin: 0.7rem 0 0;
          color: #C8A951;
          font-size: 0.74rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        p {
          margin: 0.55rem 0 0;
          color: rgba(200,196,184,0.66);
          font-size: 0.62rem;
          line-height: 1.65;
        }
        .inspector-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.55rem;
          margin-top: 0.9rem;
        }
        .inspector-grid div,
        .inspector-block {
          border: 1px solid rgba(200,169,81,0.08);
          background: rgba(0,0,0,0.18);
          padding: 0.62rem;
        }
        strong {
          display: block;
          margin-top: 0.3rem;
          color: rgba(200,196,184,0.74);
          font-size: 0.55rem;
          font-weight: 400;
          line-height: 1.45;
          text-transform: uppercase;
        }
        .inspector-block {
          margin-top: 0.55rem;
        }
        .inspector-block.active {
          border-color: rgba(200,169,81,0.24);
          background: rgba(200,169,81,0.05);
        }
        @media (max-width: 700px) {
          .field-inspector {
            left: 1rem;
            right: 1rem;
            top: 3rem;
          }
        }
      `}</style>
    </aside>
  );
}
