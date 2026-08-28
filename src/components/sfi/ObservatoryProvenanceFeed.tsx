'use client';

import { useEffect, useMemo, useState } from 'react';

type Provenance = {
  sourceUrl?: string | null;
  reportRef?: string | null;
  caseBinding?: string | null;
  subscriptionRef?: string | null;
  epistemicClass?: string | null;
  sourceRole?: string | null;
  independentlyVerified?: boolean | null;
  verificationState?: string | null;
  strategyOrigin?: string | null;
  whyShown?: string | null;
  visibility?: 'VISIBLE_BY_DEFAULT' | 'COLLAPSED_BY_DEFAULT' | string | null;
  semanticBoundary?: string | null;
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
    .filter((node) => node.provenance?.visibility === 'VISIBLE_BY_DEFAULT')
    .filter((node) => Boolean(node.provenance?.reportRef || node.provenance?.caseBinding || node.provenance?.subscriptionRef))
    .slice(0, 5), [nodes]);

  if (!reportNodes.length) return null;

  return (
    <aside aria-label="Public provenance" style={{
      position: 'fixed',
      left: 18,
      bottom: 18,
      zIndex: 40,
      width: 'min(440px, calc(100vw - 36px))',
      maxHeight: '42vh',
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
        <span>{reportNodes.length} relevant</span>
      </div>
      <div style={{ opacity: .62, marginBottom: 8 }}>SOURCE / PROVENANCE ≠ ACCEPTED EVIDENCE</div>
      {reportNodes.map((node) => {
        const provenance = node.provenance ?? {};
        const verification = provenance.verificationState
          ?? (provenance.independentlyVerified === false
            ? 'NOT INDEPENDENTLY VERIFIED'
            : provenance.independentlyVerified === true
              ? 'INDEPENDENTLY VERIFIED'
              : 'NOT RECORDED');
        return (
          <article key={node.id} style={{ borderTop: '1px solid rgba(255,255,255,.09)', padding: '9px 0' }}>
            <div style={{ color: 'white', marginBottom: 3 }}>{node.title}</div>
            <div>{[provenance.epistemicClass, provenance.sourceRole, provenance.reportRef ?? provenance.caseBinding].filter(Boolean).join(' · ') || node.publisher}</div>
            <div style={{ opacity: .72 }}>WHY SHOWN · {provenance.whyShown ?? 'NOT_RECORDED'}</div>
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
