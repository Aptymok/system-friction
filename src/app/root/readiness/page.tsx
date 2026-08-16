import Link from 'next/link';
import { RootDevelopmentResolvedView } from '@/components/root/development/RootDevelopmentResolvedView';
import { ContinuityConsole } from '@/components/root/continuity/ContinuityConsole';
import { InstitutionalContractsConsole } from '@/components/root/contracts/InstitutionalContractsConsole';
import { TotalProofControl } from '@/components/root/closure/TotalProofControl';
import { RootNativeFrame } from '@/components/root/surfaces/RootNativeFrame';
import { readContinuityDashboard } from '@/lib/continuity/runtime';
import { readInstitutionalReadiness } from '@/lib/root/closure/readInstitutionalReadiness';
import { evaluateTotalProof } from '@/lib/root/closure/totalProof';
import { requireRootViewer } from '@/lib/root/server';

export const dynamic = 'force-dynamic';

async function readContinuitySafe() {
  try {
    const observed = await readContinuityDashboard();
    return { ...observed, errors: observed.errors.filter((item): item is string => typeof item === 'string') };
  } catch (error) {
    return { state: { mode: 'UNAVAILABLE' }, runs: [], checks: [], incidents: [], decisions: [], reports: [], errors: [error instanceof Error ? error.message : String(error)] };
  }
}

export default async function RootReadinessPage() {
  const gate = await requireRootViewer('root.readiness.page');
  if (!gate.ok) return <main style={{padding:24,background:'#050504',color:'#c8c0ad',minHeight:'100vh'}}>ROOT VIEWER REQUIRED</main>;
  const model = await readInstitutionalReadiness();
  const isRoot = gate.ctx.isRoot;
  const [proof, continuity] = isRoot ? await Promise.all([evaluateTotalProof(), readContinuitySafe()]) : [null, null];
  const operational = model.modules.filter((m) => m.state === 'OPERATIONAL').length;
  const ready = model.modules.filter((m) => m.state === 'READY').length;
  const degraded = model.modules.filter((m) => m.state === 'DEGRADED').length;
  const gated = model.modules.filter((m) => m.state === 'GATED').length;
  const anchors = model.modules.slice(0, 12).map((module, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, Math.min(12, model.modules.length));
    const radius = index % 2 ? .31 : .24;
    return {
      x: .5 + Math.cos(angle) * radius,
      y: .5 + Math.sin(angle) * radius,
      weight: module.state === 'OPERATIONAL' ? 1.35 : module.state === 'READY' ? 1.05 : 1.2,
      tone: (module.state === 'OPERATIONAL' ? 'cyan' : module.state === 'READY' ? 'gold' : 'red') as 'cyan'|'gold'|'red',
    };
  });
  anchors.push({ x:.5,y:.5,weight:2,tone:model.runtimeOperational ? 'gold' : 'red' });

  return (
    <RootNativeFrame organ="READINESS" code="PLATFORM / CONTINUITY / PROOF" state={model.runtimeOperational ? 'OPERABLE' : 'BLOCKED'} generatedAt={new Date().toISOString()} anchors={anchors} accent={model.runtimeOperational ? 'gold' : 'red'}>
      <section className="rn-hero">
        <div><span className="rn-eyebrow">INSTITUTIONAL READINESS / CLOSURE STATE</span><h1>Can the institute operate now?</h1><p>READY means an organ exists and can start clean. OPERATIONAL means qualified execution has been observed. DEGRADED and GATED remain visible instead of being converted into cosmetic completion.</p></div>
        <div className="rn-summary">
          <div><span>STRUCTURE</span><strong>{model.structuralComplete ? 'COMPLETE' : 'OPEN'}</strong><small>architecture boundary</small></div>
          <div><span>RUNTIME</span><strong>{model.runtimeOperational ? 'OPERABLE' : 'BLOCKED'}</strong><small>{model.blockers.length} blockers</small></div>
          <div><span>OPERATIONAL</span><strong>{operational}</strong><small>observed organs</small></div>
          <div><span>READY / EMPTY</span><strong>{ready}</strong><small>clean starts</small></div>
        </div>
      </section>

      <section className="rn-field" data-sfi-field-anchor="readiness-native-field">
        <div className="rn-orbit" data-size="1"/><div className="rn-orbit" data-size="2"/><div className="rn-orbit" data-size="3"/>
        <div className="rn-node rn-node--core" data-tone="accent" style={{left:'50%',top:'50%'}}><span>SFI RUNTIME</span><strong>{model.runtimeOperational ? 'OPERABLE' : 'BLOCKED'}</strong><small>{model.structuralComplete ? 'STRUCTURE COMPLETE' : 'STRUCTURE OPEN'}</small></div>
        {model.modules.slice(0,12).map((module,index) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, Math.min(12, model.modules.length));
          const radiusX = index % 2 ? 36 : 28; const radiusY = index % 2 ? 36 : 28;
          const left = 50 + Math.cos(angle) * radiusX; const top = 50 + Math.sin(angle) * radiusY;
          return <div key={module.id} className="rn-node" data-tone={module.state === 'DEGRADED' || module.state === 'GATED' ? 'red' : module.state === 'OPERATIONAL' ? 'accent' : undefined} style={{left:`${left}%`,top:`${top}%`}}><span>{module.id.replaceAll('_',' ')}</span><strong>{module.label}</strong><small>{module.state} · {module.observed ? 'OBSERVED' : 'NO QUALIFYING RUN'}</small></div>;
        })}
      </section>

      <div className="rn-grid">
        <section className="rn-panel rn-panel--wide"><span>MODULE STATE</span><h2>{operational} operational · {ready} ready · {degraded} degraded · {gated} gated</h2><div className="rn-list">{model.modules.map((module) => <article key={module.id} data-state={module.state}><strong>{module.label} · {module.state}</strong><small>{module.blockers.length ? module.blockers.join(' · ') : module.nextAction ?? (module.observed ? 'QUALIFIED ACTIVITY OBSERVED' : 'NO INTERNAL BLOCKER')}</small></article>)}</div></section>
        <section className="rn-panel"><span>DEVELOPMENT BOUNDARY</span><h2>{model.structuralComplete ? 'PLATFORM STRUCTURE CLOSED' : 'STRUCTURE OPEN'}</h2><p>SFI can reach 100% platform development while scientific validation remains open. {model.definition.scientificBoundary}</p></section>
        <section className="rn-panel"><span>BLOCKERS</span><h2>{model.blockers.length}</h2><div className="rn-list">{model.blockers.length ? model.blockers.map((blocker) => <article key={blocker} data-state="BLOCKED"><strong>{blocker.replaceAll('_',' ').replaceAll(':',' · ')}</strong></article>) : <article data-state="OPERATIONAL"><strong>NO INTERNAL RUNTIME BLOCKERS</strong></article>}</div></section>
      </div>

      {isRoot && proof && continuity ? <div className="rn-grid">
        <section className="rn-panel rn-panel--full"><span>TOTAL PROOF</span><h2>{proof.structuralPass && proof.livePass && proof.longitudinalPass ? 'CIRCUIT PASS' : 'CIRCUIT OPEN'}</h2><div className="rn-summary" style={{marginBottom:14}}><div><span>STRUCTURAL</span><strong>{proof.structuralPass ? 'PASS' : 'OPEN'}</strong></div><div><span>LIVE</span><strong>{proof.livePass ? 'PASS' : 'OPEN'}</strong></div><div><span>LONGITUDINAL</span><strong>{proof.longitudinalPass ? 'PASS' : 'OPEN'}</strong></div><div><span>STAGES</span><strong>{proof.stages.length}</strong></div></div><div className="rn-list">{proof.stages.map((stage) => <article key={stage.id} data-state={stage.pass ? 'PASS' : 'BLOCKED'}><strong>{stage.id} · {stage.pass ? 'PASS' : 'OPEN'}</strong><small>{stage.evidence.join(' · ') || 'NO EVIDENCE'}{stage.missing.length ? ` · MISSING ${stage.missing.join(' · ')}` : ''}</small></article>)}</div><p style={{marginTop:12}}>{proof.truthBoundary}</p><div style={{marginTop:14}}><TotalProofControl/></div></section>
        <details className="rn-panel rn-panel--full"><summary className="rn-eyebrow">DEVELOPMENT / RESOLVED RECORD</summary><div style={{marginTop:14}}><RootDevelopmentResolvedView/></div></details>
        <details className="rn-panel rn-panel--full"><summary className="rn-eyebrow">CONTINUITY / STATE + CONTROL</summary><div style={{marginTop:14}}><ContinuityConsole initial={continuity}/></div></details>
        <details className="rn-panel rn-panel--full"><summary className="rn-eyebrow">CONTRACTS / RUNTIME ANCHORS</summary><div style={{marginTop:14}}><InstitutionalContractsConsole/></div></details>
      </div> : null}

      <div className="rn-actions"><Link href="/root/governance">GOVERNANCE ↗</Link><Link href="/root/cognitive-twin">COGNITIVE TWIN ↗</Link><Link href="/method-lab">METHOD LAB ↗</Link></div>
    </RootNativeFrame>
  );
}
