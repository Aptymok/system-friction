import Link from 'next/link';
import { HumanReadableRecord } from '@/components/shared/HumanReadableRecord';

type Row = Record<string, unknown>;

type State = {
  attractor: Row | null;
  latestTrajectory: Row | null;
  phenomenonTrajectory: Row[];
  warnings: string[];
};

function record(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
function num(value: unknown) { const parsed = typeof value === 'number' ? value : Number(value); return Number.isFinite(parsed) ? parsed : null; }

export function InstitutionalAttractorConsole({ state }: { state: State }) {
  const vector = record(state.attractor?.vector);
  const trajectory = record(state.latestTrajectory);
  const dimensions = record(trajectory.dimension_state);
  const coverage = num(trajectory.evidence_coverage);
  const supported = strings(trajectory.supported_dimensions);
  const contradicted = strings(trajectory.contradicted_dimensions);
  const missing = strings(trajectory.missing_dimensions);

  return (
    <main style={{ minHeight: '100vh', background: '#070706', color: '#eee7d7', padding: 28, fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace' }}>
      <header style={{ borderBottom: '1px solid #6c5a2d', paddingBottom: 18 }}>
        <span style={eyebrow}>SFI · ROOT · INSTITUTIONAL ATTRACTOR</span>
        <h1 style={{ margin: '7px 0' }}>{String(state.attractor?.label ?? 'ATTRACTOR NOT AVAILABLE')}</h1>
        <p style={muted}>La dirección puede ser constituida por autoridad fundadora. Su cumplimiento no. Esta consola contrasta esa dirección contra evidencia persistida, contradicciones y fenómenos longitudinales.</p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.25fr) minmax(300px,.75fr)', gap: 12, marginTop: 16 }}>
        <article style={card}>
          <small style={eyebrow}>DECLARED DIRECTION · NOT AN ATTAINMENT CLAIM</small>
          <h2 style={{ font: '400 23px/1.45 Georgia,serif', color: '#e3d3ad' }}>{String(vector.desiredState ?? 'Declaración no disponible en runtime.')}</h2>
          <p style={muted}>{String(vector.mechanism ?? '')}</p>
          <p style={{ ...muted, borderLeft: '1px solid #806b37', paddingLeft: 12 }}>{String(vector.normativePosition ?? '')}</p>
          <p style={{ ...muted, color: '#c29f68' }}>{String(vector.claimBoundary ?? '')}</p>
        </article>
        <article style={card}>
          <small style={eyebrow}>EVIDENCE CONTRAST</small>
          <strong style={{ display: 'block', fontSize: 34, margin: '13px 0 5px', color: '#d8bd72' }}>{coverage === null ? '—' : `${Math.round(coverage * 100)}%`}</strong>
          <p style={muted}>{coverage === null ? 'Todavía no existe snapshot de trayectoria.' : `${supported.length} dimensiones con soporte · ${contradicted.length} contradichas/conflictuadas · ${missing.length} sin evidencia.`}</p>
          <p style={{ ...muted, color: '#c29f68' }}>La cobertura mide dimensiones para las que existe evidencia o contradicción. No es porcentaje de cumplimiento ni distancia normalizada al atractor.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 15 }}>
            <Link href="/root/evidence/intake" style={link}>ADD EVIDENCE</Link>
            <Link href="/root/agents" style={link}>AGENT PASSPORTS</Link>
          </div>
        </article>
      </section>

      <section style={{ marginTop: 12 }}>
        <h2 style={sectionTitle}>DIMENSIONS</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 9 }}>
          {Object.entries(dimensions).length ? Object.entries(dimensions).map(([key, value]) => {
            const item = record(value);
            const contradictionRefs = strings(item.contradictionRefs);
            return <article key={key} style={card}>
              <small style={eyebrow}>{String(item.status ?? 'UNKNOWN')}</small>
              <strong style={{ display: 'block', margin: '8px 0', color: '#d6c49a' }}>{key}</strong>
              <p style={muted}>{String(item.explanation ?? '')}</p>
              <small style={muted}>support observations {String(item.observedCount ?? 0)} · contradictions {String(item.contradictionCount ?? contradictionRefs.length)} · attainment {String(item.attainment ?? 'UNRESOLVED')}</small>
            </article>;
          }) : <article style={card}><strong>NO TRAJECTORY SNAPSHOT</strong><p style={muted}>El ciclo institucional debe ejecutar después de aplicar la migración.</p></article>}
        </div>
      </section>

      <section style={{ marginTop: 12 }}>
        <h2 style={sectionTitle}>PHENOMENON TRAJECTORY · PPOI SOURCE</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          {state.phenomenonTrajectory.length ? state.phenomenonTrajectory.map((row, index) => (
            <article key={String(row.id ?? `${row.phenomenon_key}-${index}`)} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><strong>{String(row.phenomenon_key ?? 'phenomenon')}</strong><small style={eyebrow}>{String(row.attractor_relation ?? 'unresolved')}</small></div>
              <p style={muted}>regime {String(row.regime ?? '—')} · persistence {String(row.persistence ?? '—')} · velocity {String(row.velocity ?? '—')} · evidence {String(row.evidence_count ?? 0)}</p>
            </article>
          )) : <article style={card}><strong>NO PHENOMENON TRAJECTORY OBSERVED</strong><p style={muted}>No se inventa una trayectoria para llenar la superficie.</p></article>}
        </div>
      </section>

      {state.warnings.length ? <section style={{ ...card, marginTop: 12 }}><h2 style={sectionTitle}>WARNINGS</h2><p style={{ ...muted, color: '#c29f68' }}>{state.warnings.join(' · ')}</p></section> : null}
      <details style={{ ...card, marginTop: 12 }}><summary style={{ cursor: 'pointer', color: '#9c8958', fontSize: 10 }}>TECHNICAL STATE</summary><HumanReadableRecord value={state} title="Attractor runtime state" maxFields={18} /></details>
    </main>
  );
}

const card = { border: '1px solid #29251b', background: '#0d0c09', padding: 16 } as const;
const eyebrow = { color: '#a99153', fontSize: 9, letterSpacing: '.14em' } as const;
const muted = { color: '#918979', fontSize: 11, lineHeight: 1.6 } as const;
const sectionTitle = { color: '#b8a064', fontSize: 10, letterSpacing: '.15em', fontWeight: 500 } as const;
const link = { display: 'inline-block', border: '1px solid #604f2b', padding: '8px 10px', color: '#d0b66c', fontSize: 9, textDecoration: 'none' } as const;