'use client';

import type { RootSceneNode } from './rootSceneTypes';

type RootHoverTooltipProps = {
  node: RootSceneNode | null;
  position: { x: number; y: number } | null;
};

export function RootHoverTooltip({ node, position }: RootHoverTooltipProps) {
  if (!node || !position) return null;

  return (
    <div className="root-scene-tooltip" style={{ left: `${position.x}%`, top: `${position.y}%` }}>
      <b>{node.label}</b>
      <span>{node.value ?? node.status ?? node.kind ?? 'observed'}</span>
      <em>{node.dataClass}</em>
      <p>{node.meaning}</p>
      <small>{node.source}</small>
      <style jsx>{`
        .root-scene-tooltip {
          position: absolute;
          z-index: 6;
          width: min(260px, 34vw);
          pointer-events: none;
          transform: translate(12px, -12px);
          border: 1px solid rgba(218, 188, 102, .34);
          background: rgba(6, 5, 4, .94);
          box-shadow: 0 18px 50px rgba(0, 0, 0, .42);
          padding: 10px 11px;
          color: #e9dfc8;
        }

        b, span, em, small {
          display: block;
        }

        b {
          font-size: 10px;
          letter-spacing: .13em;
          text-transform: uppercase;
          color: #f1d27b;
          font-weight: 500;
        }

        span {
          margin-top: 5px;
          font-size: 18px;
          line-height: 1;
          color: #f6ecd2;
        }

        em {
          margin-top: 5px;
          font-size: 8px;
          letter-spacing: .15em;
          text-transform: uppercase;
          font-style: normal;
          color: #9f947a;
        }

        p {
          margin: 9px 0 0;
          font-size: 11px;
          line-height: 1.45;
          color: #c7bda5;
        }

        small {
          margin-top: 9px;
          font-size: 8px;
          line-height: 1.35;
          color: #796f5c;
        }
      `}</style>
    </div>
  );
}
