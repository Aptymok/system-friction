import Link from 'next/link';
import { readSystemMutationLedger } from '@/lib/sfi/mutationEvidence';

export const dynamic = 'force-dynamic';

const STAGE_LABEL: Record<string, string> = {
  CODE_RECORDED: 'CODE RECORDED',
  QA_VERIFIED: 'QA VERIFIED',
  DEPLOYMENT_EVIDENCE_RECORDED: 'DEPLOYMENT EVIDENCE RECORDED',
  EXERCISED: 'EXERCISED',
  CALIBRATED_LEARNING_LINKED: 'CALIBRATED LEARNING LINKED',
};

export default async function MutationHistoryPage() {
  const ledger = await readSystemMutationLedger(80);
  return (
    <main style={{minHeight:'100vh',background:'#070705',color:'#d8c6a0',padding:'48px 28px 84px',fontFamily:'Georgia, serif'}}>
      <div style={{maxWidth:1180,margin:'0 auto'}}>
        <header style={{display:'flex',justifyContent:'space-between',gap:24,alignItems:'flex-start',borderBottom:'1px solid rgba(202,160,92,.28)',paddingBottom:28}}>
          <div>
            <small style={{letterSpacing:'.28em',color:'#b78d50'}}>SYSTEM FRICTION INSTITUTE · MUTATION EVIDENCE</small>
            <h1 style={{fontSize:'clamp(42px,7vw,88px)',fontWeight:400,letterSpacing:'-.03em',margin:'14px 0 10px',color:'#e7cf9c'}}>CODE → RETURN</h1>
            <p style={{maxWidth:860,fontSize:18,lineHeight:1.7,color:'#b9aa8e'}}>Cada entrada distingue la mutación del repositorio de su validación posterior. Un commit demuestra que el código cambió; QA, evidencia de deployment, ejercicio real y aprendizaje calibrado requieren evidencias adicionales.</p>
          </div>
          <Link href="/history" style={{color:'#d5ad69',textDecoration:'none',letterSpacing:'.15em',fontSize:12}}>← HISTORY</Link>
        </header>

        <section style={{marginTop:32,padding:'18px 20px',border:'1px solid rgba(202,160,92,.25)',background:'rgba(191,139,65,.035)'}}>
          <small style={{letterSpacing:'.22em',color:'#b78d50'}}>VALIDATION CHAIN</small>
          <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:14}}>
            {['CODE_RECORDED','QA_VERIFIED','DEPLOYMENT_EVIDENCE_RECORDED','EXERCISED','CALIBRATED_LEARNING_LINKED'].map((stage, index) => (
              <span key={stage} style={{border:'1px solid rgba(202,160,92,.22)',padding:'9px 11px',fontFamily:'ui-monospace, monospace',fontSize:10,color:'#c5aa79'}}>{String(index+1).padStart(2,'0')} · {STAGE_LABEL[stage]}</span>
            ))}
          </div>
        </section>

        {!ledger.ok ? (
          <section style={{marginTop:36,border:'1px solid rgba(165,90,70,.35)',padding:20,color:'#c99b8e'}}>Mutation ledger unavailable. No historical claim is substituted.</section>
        ) : ledger.mutations.length === 0 ? (
          <section style={{marginTop:36,border:'1px solid rgba(202,160,92,.18)',padding:24,color:'#94866f'}}>No governed mutation records have been admitted yet.</section>
        ) : (
          <section style={{display:'grid',gap:16,marginTop:38}}>
            {ledger.mutations.map((mutation) => (
              <article key={mutation.mutationId} style={{border:'1px solid rgba(202,160,92,.2)',padding:'20px 22px',background:'rgba(255,255,255,.008)'}}>
                <div style={{display:'flex',justifyContent:'space-between',gap:18,flexWrap:'wrap',alignItems:'baseline'}}>
                  <div>
                    <small style={{fontFamily:'ui-monospace, monospace',letterSpacing:'.12em',color:'#9f845b'}}>{STAGE_LABEL[mutation.stage] ?? mutation.stage}</small>
                    <h2 style={{fontWeight:400,fontSize:26,margin:'8px 0 8px',color:'#dfc38c'}}>{mutation.title}</h2>
                  </div>
                  <span style={{fontFamily:'ui-monospace, monospace',fontSize:11,color:'#83745e'}}>{mutation.recordedAt?.slice(0,10) ?? '—'}</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10,marginTop:18}}>
                  <div><small style={{color:'#806c4d'}}>QA</small><div style={{fontFamily:'ui-monospace, monospace'}}>{mutation.qaCount}</div></div>
                  <div><small style={{color:'#806c4d'}}>DEPLOY EVIDENCE</small><div style={{fontFamily:'ui-monospace, monospace'}}>{mutation.deploymentCount}</div></div>
                  <div><small style={{color:'#806c4d'}}>EXERCISE</small><div style={{fontFamily:'ui-monospace, monospace'}}>{mutation.exerciseCount}</div></div>
                  <div><small style={{color:'#806c4d'}}>LEARNING LINK</small><div style={{fontFamily:'ui-monospace, monospace'}}>{mutation.learningLinkCount}</div></div>
                </div>
                {mutation.capabilityIds.length > 0 && <p style={{fontFamily:'ui-monospace, monospace',fontSize:11,color:'#95866e',marginTop:18}}>CAPABILITIES · {mutation.capabilityIds.join(' · ')}</p>}
                <p style={{fontSize:13,lineHeight:1.6,color:'#938671',marginBottom:0}}>{mutation.boundary}</p>
                {mutation.commit.htmlUrl && <a href={mutation.commit.htmlUrl} target="_blank" rel="noreferrer" style={{display:'inline-block',marginTop:14,color:'#cfa15d',textDecoration:'none',fontFamily:'ui-monospace, monospace',fontSize:11}}>GITHUB · {mutation.commit.sha?.slice(0,12) ?? 'COMMIT'} ↗</a>}
              </article>
            ))}
          </section>
        )}

        <footer style={{marginTop:48,borderTop:'1px solid rgba(202,160,92,.2)',paddingTop:22,display:'flex',justifyContent:'space-between',gap:18,flexWrap:'wrap'}}>
          <span style={{fontFamily:'ui-monospace, monospace',fontSize:11,color:'#786b56'}}>SFI-MUTATION-EVIDENCE-1.0</span>
          <a href="/api/public/mutations" style={{color:'#b98d4e',textDecoration:'none',fontFamily:'ui-monospace, monospace',fontSize:11}}>MACHINE-READABLE LEDGER →</a>
        </footer>
      </div>
    </main>
  );
}
