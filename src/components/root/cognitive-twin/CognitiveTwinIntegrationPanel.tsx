import Link from 'next/link';
import type { CognitiveTwinState } from '@/lib/cognitive-twin/readState';

export function CognitiveTwinIntegrationPanel({ integration }: { integration: CognitiveTwinState['integration'] }) {
  const topology = [
    ['INSTITUTION', 'COGNITIVE TWIN', 'Model-independent apparatus: memory, evidence, decisions, runs, evaluation and governance.'],
    ['SUBJECT', 'CT-A01', 'Longitudinal experimental subject with lineage, journal, snapshots, forks and governed mutation.'],
    ['MODEL SUBSTRATE', 'REPLACEABLE', 'OpenAI / Anthropic / Gemini / Groq / Ollama / HF are execution substrates, not the persistent subject or institution.'],
    ['AUTHORITY', 'ROOT / ACP', 'Canon, irreversible action, authority transfer and reserved institutional decisions remain outside autonomous model execution.'],
  ] as const;

  return (
    <section style={{ background:'#070706', color:'#eee7d7', padding:'24px 28px 0', fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace' }}>
      <div style={{ border:'1px solid #473d29', background:'#0d0c09', padding:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', gap:20, flexWrap:'wrap' }}>
          <div>
            <small style={{ color:'#bba365', letterSpacing:'.16em' }}>COGNITIVE TWIN · SFI INTEGRATION</small>
            <h2 style={{ margin:'8px 0 4px', fontSize:20 }}>El Twin como sistema nervioso institucional</h2>
            <p style={{ margin:0, maxWidth:900, color:'#918979', fontSize:11, lineHeight:1.6 }}>CONNECTED significa que el Twin puede leer la persistencia del órgano. EXERCISED significa que existen registros calificantes en esa superficie. Ninguno de los dos estados equivale a validación científica, individuación demostrada ni autoridad autónoma.</p>
          </div>
          <div style={{ minWidth:220, display:'grid', gap:4, alignContent:'start' }}>
            <strong style={{ color:'#d8c488' }}>{integration.summary.connected}/{integration.summary.total} CONNECTED</strong>
            <strong style={{ color:'#d8c488' }}>{integration.summary.exercised}/{integration.summary.total} EXERCISED</strong>
            <span style={{ color:'#8f8878', fontSize:10 }}>{integration.contractVersion}</span>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:8, marginTop:14 }}>
          {topology.map(([label,value,description]) => <article key={label} style={{ border:'1px solid #29251b', background:'#080705', padding:12 }}>
            <small style={{ color:'#81744f', fontSize:8, letterSpacing:'.14em' }}>{label}</small>
            <strong style={{ display:'block', marginTop:6, color:'#d8c488', fontSize:12 }}>{value}</strong>
            <p style={{ margin:'7px 0 0', color:'#81796b', fontSize:9, lineHeight:1.5 }}>{description}</p>
          </article>)}
        </div>

        <nav style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:12 }}>
          <span style={{ border:'1px solid #41371f', padding:'7px 9px', color:'#c9ad62', fontSize:9 }}>CT-A01 · LINEAGE + JOURNAL · INTEGRADOS EN ESTA SUPERFICIE</span>
          <Link href="/method-lab" style={{ border:'1px solid #41371f', padding:'7px 9px', color:'#c9ad62', textDecoration:'none', fontSize:9 }}>METHOD LAB</Link>
          <Link href="/root/readiness" style={{ border:'1px solid #41371f', padding:'7px 9px', color:'#c9ad62', textDecoration:'none', fontSize:9 }}>INSTITUTIONAL READINESS</Link>
        </nav>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:8, marginTop:14 }}>
          {integration.organs.map((organ) => (
            <article key={organ.organ} style={{ border:'1px solid #29251b', background:'#090806', padding:12, display:'grid', gap:6 }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                <strong style={{ fontSize:11, color:'#c9b36f' }}>{organ.organ}</strong>
                <span style={{ fontSize:9, color:organ.connected ? '#8fba92' : '#d08c77' }}>{organ.connected ? 'CONNECTED' : 'DISCONNECTED'}</span>
              </div>
              <span style={{ fontSize:20, color:'#eee0b9' }}>{organ.observedRecords ?? 'N/D'}</span>
              <span style={{ fontSize:9, color:'#756d60' }}>{organ.table}</span>
              <p style={{ margin:0, fontSize:10, lineHeight:1.5, color:'#918979' }}>{organ.description}</p>
              {organ.error ? <span style={{ fontSize:9, color:'#d08c77' }}>{organ.error}</span> : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
