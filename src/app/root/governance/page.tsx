import Link from 'next/link';
import { GovernanceActions } from '@/components/root/governance/GovernanceActions';
import { RootNativeFrame } from '@/components/root/surfaces/RootNativeFrame';
import { readGovernanceHealth } from '@/lib/governance/readGovernanceHealth';
import { requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';

export default async function RootGovernancePage() {
  const gate = await requireRootActor('governance.page.read');
  if (!gate.ok) return <main style={{padding:24,background:'#050504',color:'#c8c0ad',minHeight:'100vh'}}>ROOT REQUIRED</main>;
  const health = await readGovernanceHealth();
  const counts = health.proposalLifecycle.counts;
  const inbox = health.sovereignInbox.proposals + health.sovereignInbox.ctDecisions + health.sovereignInbox.reports;
  const anchors = [
    {x:.50,y:.46,weight:2,tone:'gold' as const},
    {x:.20,y:.28,weight:1.2,tone:'cyan' as const},
    {x:.80,y:.28,weight:1.2,tone:'amber' as const},
    {x:.20,y:.72,weight:1,tone:'red' as const},
    {x:.80,y:.72,weight:1,tone:'gold' as const},
  ];
  return (
    <RootNativeFrame organ="GOVERNANCE" code="ROOT / ACP" state={health.runtime.status.toUpperCase()} generatedAt={new Date().toISOString()} anchors={anchors} accent="gold">
      <section className="rn-hero">
        <div><span className="rn-eyebrow">AUTHORITY / STATE MACHINE / AUDIT</span><h1>Authority is a governed transition, not a visual state.</h1><p>Aprobar diseño no ejecuta. Ejecutar no promueve. Un resultado no se convierte en canon por existir. Conflictos, evidencia insuficiente y fronteras de autoridad permanecen visibles antes de cualquier transición.</p></div>
        <div className="rn-summary">
          <div><span>ACP</span><strong>{health.runtime.status.toUpperCase()}</strong><small>{health.runtime.blindMode ? 'BLIND MODE' : 'AUTHORITY PRESENT'}</small></div>
          <div><span>SOVEREIGN INBOX</span><strong>{inbox}</strong><small>proposals + CT + reports</small></div>
          <div><span>CONFLICTED</span><strong>{counts.conflicted}</strong><small>promotion blocked</small></div>
          <div><span>RECEIPTS</span><strong>{health.receipts.promotions}</strong><small>auditable promotions</small></div>
        </div>
      </section>

      <section className="rn-field" data-sfi-field-anchor="governance-native-field">
        <div className="rn-orbit" data-size="1"/><div className="rn-orbit" data-size="2"/><div className="rn-orbit" data-size="3"/>
        <div className="rn-node rn-node--core" data-tone="accent" style={{left:'50%',top:'46%'}}><span>ROOT / ACP</span><strong>{health.runtime.status.toUpperCase()}</strong><small>canonical authority gate</small></div>
        <div className="rn-node" style={{left:'20%',top:'28%'}}><span>PROPOSALS</span><b>{health.sovereignInbox.proposals}</b><small>candidate actions</small></div>
        <div className="rn-node" style={{left:'80%',top:'28%'}}><span>CT DECISIONS</span><b>{health.sovereignInbox.ctDecisions}</b><small>cognitive disposition queue</small></div>
        <div className="rn-node" data-tone="red" style={{left:'20%',top:'72%'}}><span>CONFLICTS</span><b>{counts.conflicted}</b><small>blocks promotion</small></div>
        <div className="rn-node" style={{left:'80%',top:'72%'}}><span>PROMOTION RECEIPTS</span><b>{health.receipts.promotions}</b><small>auditable events</small></div>
        <div className="rn-node" style={{left:'50%',top:'82%'}}><span>CRL PERSISTENCE</span><strong>{health.crl.persistenceDecision}</strong><small>{health.crl.proposalId ? `proposal ${health.crl.proposalId}` : 'no proposal id'}</small></div>
      </section>

      <div className="rn-grid">
        <section className="rn-panel rn-panel--wide"><span>ACTION PROPOSAL LIFECYCLE</span><h2>Governed state transitions</h2><div className="rn-list">{health.proposalLifecycle.states.map(({state,meaning}) => <article key={state} data-state={state.toUpperCase()}><strong>{state.toUpperCase()} · {counts[state]}</strong><small>{meaning}</small></article>)}</div>{health.proposalLifecycle.legacyApproved ? <p style={{marginTop:12}}>LEGACY `approved`: {health.proposalLifecycle.legacyApproved}. Read-normalized to DESIGN_APPROVED.</p> : null}</section>
        <section className="rn-panel"><span>CRL BOUNDARY</span><h2>{health.crl.persistenceDecision}</h2><p>{health.crl.boundary}</p><div className="rn-list" style={{marginTop:12}}>{health.crl.options.map((option) => <article key={option}><strong>{option}</strong></article>)}</div></section>
        <section className="rn-panel rn-panel--full"><span>EXECUTION SURFACE</span><h2>Governance actions</h2><p style={{marginBottom:14}}>These controls preserve the existing authority path; the surrounding surface no longer drops back into the legacy administrative page.</p><GovernanceActions crlProposalId={typeof health.crl.proposalId === 'string' ? health.crl.proposalId : null}/></section>
        {health.warnings.length ? <section className="rn-panel rn-panel--full"><span>WARNINGS</span><div className="rn-list">{health.warnings.map((item) => <article key={item} data-state="DEGRADED"><strong>{item}</strong></article>)}</div></section> : null}
      </div>
      <div className="rn-actions"><Link href="/root/readiness">READINESS ↗</Link><Link href="/root/decisions">DECISION INBOX ↗</Link><Link href="/root/cognitive-twin">COGNITIVE TWIN ↗</Link></div>
    </RootNativeFrame>
  );
}
