'use client';

import { worldSpectCategories, type WorldSpectCategory } from '@/observatory/worldspect/worldSpectCategories';

function valueFromSnapshot(snapshot: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!snapshot) return null;
  for (const key of keys) {
    const value = snapshot[key];
    if (typeof value === 'number') return value.toFixed(2);
    if (typeof value === 'string' && value) return value;
  }
  const payload = snapshot.payload && typeof snapshot.payload === 'object' ? snapshot.payload as Record<string, unknown> : null;
  if (!payload) return null;
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'number') return value.toFixed(2);
    if (typeof value === 'string' && value) return value;
  }
  return null;
}

export function AtlasWorldSpectStrip({
  snapshot,
  activeCategory,
  onCategorySelect,
}: {
  snapshot?: Record<string, unknown> | null;
  activeCategory: WorldSpectCategory;
  onCategorySelect: (category: WorldSpectCategory) => void;
}) {
  const wsi = valueFromSnapshot(snapshot, ['wsi', 'WSI', 'ihg']);
  const nti = valueFromSnapshot(snapshot, ['nti', 'NTI', 'nti_obs']);
  const last = valueFromSnapshot(snapshot, ['observed_at', 'created_at', 'capturedAt']);
  const measured = Boolean(snapshot);
  return (
    <section className="atlas-world-strip" aria-label="WorldSpect">
      <div className="atlas-world-status">
        <strong>WorldSpect</strong>
        <span>{measured ? 'medido' : 'sin medicion vigente'}</span>
        <span>WSI {wsi || '--'}</span>
        <span>NTI {nti || '--'}</span>
        <span>{last ? `ultima ${last}` : 'sin ultima medicion'}</span>
        <span>proxima 00:01 / 12:01</span>
      </div>
      <div className="atlas-world-categories">
        {worldSpectCategories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={activeCategory === category.id ? 'active' : ''}
            onClick={() => onCategorySelect(category.id)}
          >
            <b>{category.symbol}</b>
            {category.label}
          </button>
        ))}
      </div>
      <style jsx>{`
        .atlas-world-strip {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 36;
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 0.7rem;
          align-items: center;
          min-height: calc(2.85rem + env(safe-area-inset-top, 0px));
          padding: env(safe-area-inset-top, 0px) 0.85rem 0;
          background: rgba(5, 5, 5, 0.92);
          border-bottom: 1px solid rgba(200, 169, 81, 0.1);
          backdrop-filter: blur(18px);
          font-family: "JetBrains Mono", monospace;
          color: rgba(216, 212, 200, 0.58);
        }
        .atlas-world-status,
        .atlas-world-categories {
          display: flex;
          align-items: center;
          gap: 0.48rem;
          min-width: 0;
        }
        .atlas-world-status {
          white-space: nowrap;
          text-transform: uppercase;
          letter-spacing: 0.13em;
          font-size: 0.5rem;
        }
        strong {
          color: #C8A951;
          font-weight: 600;
        }
        button {
          min-height: 2rem;
          border: 1px solid rgba(200, 169, 81, 0.09);
          background: rgba(12, 12, 10, 0.4);
          color: rgba(216, 212, 200, 0.48);
          font: inherit;
          font-size: 0.48rem;
          letter-spacing: 0.11em;
          text-transform: uppercase;
          padding: 0 0.48rem;
          cursor: pointer;
        }
        button b {
          color: rgba(200, 169, 81, 0.66);
          margin-right: 0.3rem;
          font-weight: 500;
        }
        button.active {
          color: #d8d4c8;
          border-color: rgba(200, 169, 81, 0.42);
          background: rgba(200, 169, 81, 0.08);
        }
        @media (max-width: 860px) {
          .atlas-world-strip {
            grid-template-columns: 1fr;
            gap: 0.35rem;
            padding-left: 0.65rem;
            padding-right: 0.65rem;
            padding-bottom: 0.4rem;
          }
          .atlas-world-status,
          .atlas-world-categories {
            overflow-x: auto;
            scrollbar-width: none;
          }
          .atlas-world-status::-webkit-scrollbar,
          .atlas-world-categories::-webkit-scrollbar {
            display: none;
          }
          button {
            min-width: max-content;
            min-height: 44px;
          }
        }
      `}</style>
    </section>
  );
}
