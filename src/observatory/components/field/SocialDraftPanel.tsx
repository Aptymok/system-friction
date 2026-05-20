'use client';

import type { SocialDraft } from '@/observatory/social/socialDraftTypes';

type SocialDraftPanelProps = {
  draft: SocialDraft | null;
  open: boolean;
  onReview: () => void | Promise<void>;
  onApprove: () => void | Promise<void>;
  onRequestConfirmation: () => void | Promise<void>;
  onArchive: () => void | Promise<void>;
  onTextChange: (text: string) => void | Promise<void>;
};

export function SocialDraftPanel({
  draft,
  open,
  onReview,
  onApprove,
  onRequestConfirmation,
  onArchive,
  onTextChange,
}: SocialDraftPanelProps) {
  if (!draft || !open) return null;

  return (
    <aside className="social-draft" aria-label="Borrador social">
      <div className="social-draft-top">
        <span>{draft.network}</span>
        <strong>{draft.status}</strong>
      </div>

      <label>
        texto
        <textarea value={draft.text} onChange={(event) => void onTextChange(event.target.value)} />
      </label>

      <div className="draft-objective">
        <small>objetivo</small>
        <p>{draft.objective}</p>
      </div>

      <div className="review-grid">
        <div>
          <small>MIHM</small>
          <p>{draft.mihmReview?.visibleReading || 'pendiente de revision'}</p>
          {draft.mihmReview && (
            <em>{draft.mihmReview.sourceDescriptor.sourceState} · {draft.mihmReview.sourceDescriptor.confidence}</em>
          )}
        </div>
        <div>
          <small>WorldSpect</small>
          <p>{draft.worldSpectReview?.visibleReading || 'pendiente de lectura'}</p>
          {draft.worldSpectReview && (
            <em>{draft.worldSpectReview.sourceDescriptor.sourceState} · {draft.worldSpectReview.sourceDescriptor.confidence}</em>
          )}
        </div>
      </div>

      <div className="source-state">
        <span>Source State</span>
        <p>
          {draft.sourceDescriptor.sourceState} · confianza {draft.sourceDescriptor.confidence}
          <br />
          externo: {draft.sourceDescriptor.isExternal ? 'si' : 'no'} · simulado: {draft.sourceDescriptor.isSimulated ? 'si' : 'no'}
        </p>
      </div>

      <div className="actions">
        <button type="button" onClick={() => void onReview()}>Revisar</button>
        <button type="button" onClick={() => void onApprove()} disabled={!draft.mihmReview || !draft.worldSpectReview}>Aprobar contenido</button>
        <button type="button" onClick={() => void onRequestConfirmation()} disabled={!draft.contentApproved}>Pedir confirmacion</button>
        <button type="button" onClick={() => void onArchive()}>Archivar</button>
      </div>

      <style jsx>{`
        .social-draft {
          position: absolute;
          left: 1rem;
          top: 3.2rem;
          z-index: 9;
          width: min(24rem, calc(100vw - 2rem));
          border: 1px solid rgba(200, 169, 81, 0.15);
          background: rgba(6, 8, 8, 0.76);
          color: rgba(214, 211, 199, 0.72);
          backdrop-filter: blur(16px);
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.34);
          padding: 0.75rem;
          font-family: var(--font-mono), "JetBrains Mono", monospace;
          pointer-events: auto;
        }
        .social-draft-top {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          color: #C8A951;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-size: 0.52rem;
        }
        label {
          display: block;
          margin-top: 0.65rem;
          color: rgba(200, 169, 81, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-size: 0.46rem;
        }
        textarea {
          display: block;
          width: 100%;
          min-height: 6.5rem;
          margin-top: 0.35rem;
          border: 1px solid rgba(200, 169, 81, 0.1);
          background: rgba(0, 0, 0, 0.18);
          color: rgba(214, 211, 199, 0.78);
          padding: 0.55rem;
          font: inherit;
          font-size: 0.62rem;
          line-height: 1.55;
          resize: vertical;
        }
        .draft-objective,
        .source-state,
        .review-grid div {
          border: 1px solid rgba(200, 169, 81, 0.08);
          background: rgba(0, 0, 0, 0.16);
          padding: 0.55rem;
          margin-top: 0.5rem;
        }
        small,
        .source-state span {
          display: block;
          color: rgba(200, 169, 81, 0.48);
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-size: 0.44rem;
          margin-bottom: 0.28rem;
        }
        p {
          margin: 0;
          color: rgba(214, 211, 199, 0.62);
          font-size: 0.55rem;
          line-height: 1.5;
          white-space: pre-line;
        }
        em {
          display: block;
          margin-top: 0.35rem;
          color: rgba(141, 187, 165, 0.58);
          font-size: 0.44rem;
          font-style: normal;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .review-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.45rem;
        }
        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
          margin-top: 0.65rem;
        }
        button {
          border: 1px solid rgba(200, 169, 81, 0.14);
          background: rgba(200, 169, 81, 0.04);
          color: rgba(200, 169, 81, 0.68);
          padding: 0.38rem 0.48rem;
          font: inherit;
          font-size: 0.46rem;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          cursor: pointer;
        }
        button:disabled {
          opacity: 0.35;
          cursor: default;
        }
        @media (max-width: 760px) {
          .social-draft {
            top: 6.5rem;
            right: 0.8rem;
            left: 0.8rem;
            width: auto;
          }
          .review-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </aside>
  );
}
