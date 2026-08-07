import type { SfiAgentPassport } from '@/lib/sfi/cognitive-runtime/agentPassports';
import { HumanReadableRecord } from '@/components/shared/HumanReadableRecord';

export function AgentPassportsConsole({ data }: { data: { generatedAt: string; runtimeStatus: string; counts: Record<string, number>; passports: SfiAgentPassport[] } }) {
  return (
    <main style={{ minHeight: '100vh', background: '#070706', color: '#eee7d7', padding: 28, fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace' }}>
      <header style={{ borderBottom: '1px solid #6c5a2d', paddingBottom: 18 }}>
        <span style={{ color: '#bba365', fontSize: 11, letterSpacing: '.16em' }}>SFI · ROOT · AGENT AUTHORITY</span>
        <h1 style={{ margin: '7px 0' }}>PASAPORTES DE AGENTES</h1>
        <p style={{ color: '#958c7b', maxWidth: 980 }}>Cada pasaporte se genera desde el contrato vigente, el executor enlazado, las fuentes disponibles y las ejecuciones persistidas. Tener archivo o contrato no equivale a estar operativo.</p>
      </header>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, margin: '16px 0' }}>
        {Object.entries(data.counts).map(([key, value]) => <article key={key} style={card}><small style={muted}>{key.toUpperCase()}</small><strong style={{ fontSize: 24, color: '#d8c488' }}>{value}</strong></article>)}
      </section>
      <section style={{ display: 'grid', gap: 10 }}>
        {data.passports.map((passport) => (
          <article key={passport.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <div><small style={muted}>{passport.id} · {passport.layer} · {passport.authorityLevel}</small><h2 style={{ margin: '5px 0', fontSize: 16 }}>{passport.name}</h2></div>
              <strong style={{ color: passport.lifecycle === 'OPERATIONAL' ? '#8fba92' : passport.lifecycle === 'MISSING' ? '#d27e7e' : '#d8b768' }}>{passport.lifecycle}</strong>
            </div>
            <p style={{ color: '#b5ad9c', lineHeight: 1.6, fontSize: 12 }}>{passport.purpose}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8 }}>
              <Metric label="Executor enlazado" value={passport.executorBound ? 'Sí' : 'No'} />
              <Metric label="Última ejecución" value={passport.latestExecutionAt ?? 'No observada'} />
              <Metric label="Fuentes disponibles" value={`${passport.observedTables.length}/${passport.sourceTables.length}`} />
              <Metric label="Aprobación humana" value={passport.humanApprovalRequired ? 'Requerida' : 'No para análisis interno'} />
            </div>
            {passport.warnings.length ? <p style={{ ...muted, color: '#caa176' }}>{passport.warnings.join(' · ')}</p> : null}
            <HumanReadableRecord value={passport} title="Pasaporte completo" maxFields={14} />
          </article>
        ))}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div style={{ borderTop: '1px solid #29251b', paddingTop: 7 }}><small style={muted}>{label}</small><div style={{ fontSize: 11, marginTop: 4 }}>{value}</div></div>;
}
const card = { border: '1px solid #29251b', background: '#0d0c09', padding: 15 } as const;
const muted = { color: '#8f8878', fontSize: 10, lineHeight: 1.5 } as const;
