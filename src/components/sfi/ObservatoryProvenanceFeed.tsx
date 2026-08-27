'use client';

import { useEffect, useMemo, useState } from 'react';

type Provenance = {
  sourceUrl?: string | null;
  reportRef?: string | null;
  epistemicClass?: string | null;
  independentlyVerified?: boolean | null;
  strategyOrigin?: string | null;
};

type PublicNode = {
  id: string;
  title: string;
  publisher: string;
  observedAt: string;
  provenance?: Provenance | null;
};

export function ObservatoryProvenanceFeed() {
  const [nodes, setNodes] = useState<PublicNode[]>([]);

  useEffect(() => {
    let stopped = false;
    const pull = async () => {
      try {
        const response = await fetch('/api/observatory/world', { cache: 'no-store' });
        const data = await response.json();
        if (!stopped && Array.isArray(data?.nodes)) setNodes(data.nodes);
      } catch {
        if (!stopped) setNodes([]);
      }
    };
    void pull();
    const timer = setInterval(pull, 20_000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, []);

  const reportNodes = useMemo(() => nodes
    .filter((node) => Boolean(node.provenance?.reportRef || node.provenance?.sourceUrl || node.provenance?.epistemicClass))
    .slice(0, 5), [nodes]);

  if (!reportNodes.length) return null;

  return (
    <aside aria-label="Public provenance" style={{
      position: 'fixed',
      left: 18,
      bottom: 18,
      zIndex: 40,
      width: 'min(420px, calc(100vw - 36px))',
      maxHeight: '38vh',
      overflow: 'auto',
      padding: '12px 14px',
      border: '1px solid rgba(255,255,255,.14)',
      background: 'rgba(3,6,11,.88)',
      backdropFilter: 'blur(12px)',
      fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)',
      fontSize: 11,
      lineHeight: 1.45,
      color: 'rgba(255,255,255,.78)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <strong style={{ letterSpacing: '.12em', color: 'white' }}>PUBLIC PROVENANCE</strong>
        <span>{reportNodes.length} visible</span>
      </div>
      {reportNodes.map((node) => {
        const provenance = node.provenance ?? {};
        const verification = provenance.independentlyVerified === false
          ? 'NOT INDEPENDENTLY VERIFIED'
          : provenance.independentlyVerified === true
            ? 'INDEPENDENTLY VERIFIED'
            : 'VERIFICATION N/D';
        return (
          <article key={node.id} style={{ borderTop: '1px solid rgba(255,255,255,.09)', padding: '9px 0' }}>
            <div style={{ color: 'white', marginBottom: 3 }}>{node.title}</div>
            <div>{[provenance.epistemicClass, provenance.reportRef, provenance.strategyOrigin].filter(Boolean).join(' · ') || node.publisher}</div>
            <div style={{ opacity: .68 }}>{verification}</div>
            {provenance.sourceUrl && (
              <a
                href={provenance.sourceUrl}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}
              >
                SOURCE ↗
              </a>
            )}
          </article>
        );
      })}
    </aside>
  );
}
