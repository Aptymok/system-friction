import { SFI_INSTITUTIONAL_CONTRACT_MANIFEST } from '@/lib/contracts/institutionalContracts';

export function InstitutionalContractsConsole() {
  const active = SFI_INSTITUTIONAL_CONTRACT_MANIFEST.filter((item) => item.adoption === 'ACTIVE').length;
  const partial = SFI_INSTITUTIONAL_CONTRACT_MANIFEST.length - active;
  return (
    <section style={{ background: '#070706', color: '#eee7d7', padding: 20, fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace' }}>
      <header style={{ borderBottom: '1px solid #6c5a2d', paddingBottom: 18 }}>
        <span style={eyebrow}>SFI · INSTITUTIONAL CONTRACTS</span>
        <h2 style={{ margin: '7px 0' }}>{SFI_INSTITUTIONAL_CONTRACT_MANIFEST.length} CONTRATOS DE RUNTIME</h2>
        <p style={muted}>“ACTIVE” significa que el contrato ejecutable ya tiene un ancla de runtime identificada. No significa por sí solo que producción haya demostrado todas sus rutas. “PARTIAL” señala integración todavía incompleta.</p>
      </header>
      <section style={{ display: 'flex', gap: 10, margin: '16px 0', flexWrap: 'wrap' }}>
        <Metric label="CONTRATOS" value={String(SFI_INSTITUTIONAL_CONTRACT_MANIFEST.length)} />
        <Metric label="ANCLA ACTIVA" value={String(active)} />
        <Metric label="ADOPCIÓN PARCIAL" value={String(partial)} />
      </section>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 10 }}>
        {SFI_INSTITUTIONAL_CONTRACT_MANIFEST.map((item, index) => (
          <article key={item.name} style={card}>
            <small style={eyebrow}>{String(index + 1).padStart(2, '0')} · {item.adoption}</small>
            <h3 style={{ margin: '7px 0', fontSize: 16 }}>{item.name}</h3>
            <p style={muted}>{item.runtimeAnchor}</p>
          </article>
        ))}
      </section>
    </section>
  );
}
function Metric({ label, value }: { label: string; value: string }) { return <div style={card}><small style={muted}>{label}</small><strong style={{ display: 'block', color: '#d8c488', fontSize: 25 }}>{value}</strong></div>; }
const card = { border: '1px solid #29251b', background: '#0d0c09', padding: 15 } as const;
const eyebrow = { color: '#bba365', fontSize: 10, letterSpacing: '.14em' } as const;
const muted = { color: '#958c7b', fontSize: 11, lineHeight: 1.6 } as const;
