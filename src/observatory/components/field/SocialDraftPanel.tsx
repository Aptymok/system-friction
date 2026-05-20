'use client';

import { useState } from 'react';
import type { ManualSocialPostInput, ManualSocialReturn } from '@/observatory/social/socialManualReturnTypes';
import type { SocialProvider } from '@/observatory/social/socialOAuthTypes';
import type { SocialDraft } from '@/observatory/social/socialDraftTypes';

type SocialDraftPanelProps = {
  draft: SocialDraft | null;
  open: boolean;
  onReview: () => void | Promise<void>;
  onApprove: () => void | Promise<void>;
  onRequestConfirmation: () => void | Promise<void>;
  onArchive: () => void | Promise<void>;
  onTextChange: (text: string) => void | Promise<void>;
  onRecordManualPost: (input: ManualSocialPostInput) => void | Promise<void>;
  onRecordManualReturn: (input: ManualSocialReturn) => void | Promise<void>;
  autoReturn?: {
    status: 'sin_conexion' | 'conectado_read_only' | 'ultima_lectura' | 'metricas_capturadas';
    provider?: SocialProvider;
    lastSyncAt?: string;
    capturedCount?: number;
  };
  onIngestReadOnly: (provider: SocialProvider) => void | Promise<void>;
};

export function SocialDraftPanel({
  draft,
  open,
  onReview,
  onApprove,
  onRequestConfirmation,
  onArchive,
  onTextChange,
  onRecordManualPost,
  onRecordManualReturn,
  autoReturn,
  onIngestReadOnly,
}: SocialDraftPanelProps) {
  const [postOpen, setPostOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [postInput, setPostInput] = useState<ManualSocialPostInput>({
    network: draft?.network || 'linkedin',
    postText: draft?.text || '',
    postedAt: new Date().toISOString().slice(0, 16),
  });
  const [returnInput, setReturnInput] = useState<ManualSocialReturn>({
    platform: draft?.network || 'linkedin',
    engagement: {},
    capturedAt: new Date().toISOString().slice(0, 16),
  });

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

      <div className="source-state">
        <span>Retorno automatico</span>
        <p>
          {autoReturn?.status || 'sin_conexion'}
          {autoReturn?.provider ? ` · ${autoReturn.provider}` : ''}
          {autoReturn?.lastSyncAt ? ` · ${autoReturn.lastSyncAt}` : ''}
          {autoReturn?.capturedCount !== undefined ? ` · metricas ${autoReturn.capturedCount}` : ''}
        </p>
        <button type="button" onClick={() => void onIngestReadOnly((autoReturn?.provider || draft.network || 'linkedin') as SocialProvider)}>
          Leer read-only
        </button>
      </div>

      <div className="actions">
        <button type="button" onClick={() => void onReview()}>Revisar</button>
        <button type="button" onClick={() => void onApprove()} disabled={!draft.mihmReview || !draft.worldSpectReview}>Aprobar contenido</button>
        <button type="button" onClick={() => void onRequestConfirmation()} disabled={!draft.contentApproved}>Pedir confirmacion</button>
        <button type="button" onClick={() => void onArchive()}>Archivar</button>
        <button type="button" onClick={() => setPostOpen((value) => !value)}>Registrar post manual</button>
        <button type="button" onClick={() => setReturnOpen((value) => !value)}>Registrar retorno</button>
      </div>

      {postOpen && (
        <div className="manual-block">
          <small>post manual</small>
          <input value={postInput.network} onChange={(event) => setPostInput((current) => ({ ...current, network: event.target.value }))} placeholder="network" />
          <input value={postInput.postUrl || ''} onChange={(event) => setPostInput((current) => ({ ...current, postUrl: event.target.value }))} placeholder="postUrl opcional" />
          <input value={postInput.externalPostId || ''} onChange={(event) => setPostInput((current) => ({ ...current, externalPostId: event.target.value }))} placeholder="externalPostId opcional" />
          <input type="datetime-local" value={postInput.postedAt} onChange={(event) => setPostInput((current) => ({ ...current, postedAt: event.target.value }))} />
          <textarea value={postInput.postText} onChange={(event) => setPostInput((current) => ({ ...current, postText: event.target.value }))} />
          <button type="button" onClick={() => void onRecordManualPost(postInput)}>Guardar post manual</button>
        </div>
      )}

      {returnOpen && (
        <div className="manual-block">
          <small>retorno social</small>
          <p>{Object.values(returnInput.engagement).some((value) => value !== undefined) ? 'registrado manualmente' : 'sin metricas'}</p>
          <input value={returnInput.platform} onChange={(event) => setReturnInput((current) => ({ ...current, platform: event.target.value }))} placeholder="platform" />
          <input value={returnInput.postId || ''} onChange={(event) => setReturnInput((current) => ({ ...current, postId: event.target.value }))} placeholder="postId opcional" />
          <input type="number" value={returnInput.resonanceScore ?? ''} onChange={(event) => setReturnInput((current) => ({ ...current, resonanceScore: event.target.value === '' ? undefined : Number(event.target.value) }))} placeholder="resonanceScore opcional" />
          <div className="metric-grid">
            {(['impressions', 'views', 'likes', 'comments', 'reposts', 'clicks'] as const).map((key) => (
              <input
                key={key}
                type="number"
                value={returnInput.engagement[key] ?? ''}
                onChange={(event) => setReturnInput((current) => ({
                  ...current,
                  engagement: {
                    ...current.engagement,
                    [key]: event.target.value === '' ? undefined : Number(event.target.value),
                  },
                }))}
                placeholder={key}
              />
            ))}
          </div>
          <input type="datetime-local" value={returnInput.capturedAt} onChange={(event) => setReturnInput((current) => ({ ...current, capturedAt: event.target.value }))} />
          <textarea value={returnInput.commentsSummary || ''} onChange={(event) => setReturnInput((current) => ({ ...current, commentsSummary: event.target.value }))} placeholder="comentarios / lectura cualitativa" />
          <button type="button" onClick={() => void onRecordManualReturn(returnInput)}>Guardar retorno</button>
        </div>
      )}

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
        textarea,
        input {
          display: block;
          width: 100%;
          margin-top: 0.35rem;
          border: 1px solid rgba(200, 169, 81, 0.1);
          background: rgba(0, 0, 0, 0.18);
          color: rgba(214, 211, 199, 0.78);
          padding: 0.55rem;
          font: inherit;
          font-size: 0.62rem;
          line-height: 1.55;
        }
        textarea {
          min-height: 6.5rem;
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
        .manual-block {
          border: 1px solid rgba(141, 187, 165, 0.13);
          background: rgba(8, 18, 16, 0.22);
          margin-top: 0.6rem;
          padding: 0.55rem;
        }
        .metric-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.35rem;
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
