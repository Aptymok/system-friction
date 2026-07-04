'use client';

import type { RootSceneNode } from './rootSceneTypes';

type RootContextDrawerProps = {
  node: RootSceneNode | null;
  onClose: () => void;
};

export function RootContextDrawer({ node, onClose }: RootContextDrawerProps) {
  if (!node) return null;

  return (
    <aside className="root-scene-drawer" aria-label="ROOT node context">
      <header>
        <div>
          <span>{node.kind ?? 'node'}</span>
          <b>{node.label}</b>
        </div>
        <button type="button" onClick={onClose} aria-label="Clear ROOT scene selection">x</button>
      </header>
      <dl>
        <div>
          <dt>Value</dt>
          <dd>{node.value ?? node.status ?? 'observed'}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{node.status ?? node.dataClass}</dd>
        </div>
        <div>
          <dt>Data</dt>
          <dd>{node.dataClass}</dd>
        </div>
      </dl>
      <section>
        <span>Meaning</span>
        <p>{node.meaning}</p>
      </section>
      <section>
        <span>Source</span>
        <p>{node.source}</p>
      </section>
      <style jsx>{`
        .root-scene-drawer {
          position: absolute;
          z-index: 5;
          top: 76px;
          right: 16px;
          width: min(300px, 36%);
          max-height: calc(100% - 118px);
          overflow: auto;
          border: 1px solid rgba(218, 188, 102, .24);
          background: rgba(5, 4, 3, .92);
          box-shadow: 0 20px 70px rgba(0, 0, 0, .48);
          padding: 13px;
          color: #e9dfc8;
          backdrop-filter: blur(16px);
        }

        header {
          display: flex;
          align-items: start;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid rgba(218, 188, 102, .13);
          padding-bottom: 12px;
        }

        header span, section span, dt {
          display: block;
          font-size: 8px;
          letter-spacing: .15em;
          text-transform: uppercase;
          color: #817660;
        }

        header b {
          display: block;
          margin-top: 6px;
          font-size: 13px;
          line-height: 1.25;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: #f1d27b;
          font-weight: 500;
        }

        button {
          width: 26px;
          height: 26px;
          border: 1px solid rgba(218, 188, 102, .24);
          background: transparent;
          color: #f1d27b;
          cursor: pointer;
        }

        dl {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin: 12px 0;
        }

        dl div {
          border: 1px solid rgba(218, 188, 102, .12);
          padding: 8px;
          min-width: 0;
        }

        dd {
          margin: 6px 0 0;
          font-size: 11px;
          color: #efe5cc;
          overflow-wrap: anywhere;
        }

        section {
          border-top: 1px solid rgba(218, 188, 102, .1);
          padding-top: 10px;
          margin-top: 10px;
        }

        p {
          margin: 7px 0 0;
          color: #c5b99e;
          font-size: 11px;
          line-height: 1.55;
          overflow-wrap: anywhere;
        }

        @media (max-width: 900px) {
          .root-scene-drawer {
            left: 14px;
            right: 14px;
            width: auto;
            max-height: 42%;
          }
        }
      `}</style>
    </aside>
  );
}
