import { requireRootObserverPage } from '@/lib/root/server';
import { readMethodLabState } from '@/lib/method-lab/readModel';
import { RootNativeFrame } from '@/components/root/surfaces/RootNativeFrame';
import { MethodLabConsole } from '@/components/root/method-lab/MethodLabConsole';
import { DecisionTransferObservatory } from '@/components/root/method-lab/DecisionTransferObservatory';
import { BlindDecisionExperiment } from '@/components/root/method-lab/BlindDecisionExperiment';
import { CognitiveLabConsole } from '@/components/root/cognitive-lab/CognitiveLabConsole';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function MethodLabPage() {
  await requireRootObserverPage('/method-lab');
  const state = await readMethodLabState();
  const anchors = state.protocols.map((protocol,index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1,state.protocols.length);
    return { x:.5 + Math.cos(angle) * .31, y:.48 + Math.sin(angle) * .31, weight:protocol.status === 'OPERATIONAL' ? 1.35 : 1, tone:(protocol.status === 'OPERATIONAL' ? 'violet' : protocol.status === 'DEGRADED' ? 'red' : 'amber') as 'violet'|'red'|'amber' };
  });
  anchors.push({x:.5,y:.48,weight:2,tone:'violet'});
  return (
    <RootNativeFrame
      organ="METHOD LAB"
      namespace="SFI / METHOD LAB"
      code={`${state.contractVersion} / SIMULATED`}
      state={state.status}
      generatedAt={state.generatedAt}
      anchors={anchors}
      accent="violet"
      returnHref="/root"
      returnLabel="RETURN TO ROOT FIELD ↖"
      invariant="SIMULATE ≠ OBSERVE ≠ EXECUTE · PROMOTION REQUIRES ROOT"
    >
      <section className="rn-hero">
        <div><span className="rn-eyebrow">PROTOCOL / REPRODUCIBLE RUN / FALSIFICATION</span><h1>Test the model without pretending the world changed.</h1><p>Method Lab instantiates protocols, replays histories, perturbs models and compares returns. Every result remains SIMULATED until later evidence supplies an observed contrast; the laboratory cannot promote its own result.</p></div>
        <div className="rn-summary">
          <div><span>PROTOCOLS</span><strong>{state.protocols.length}</strong><small>{state.protocols.filter((item)=>item.status==='OPERATIONAL').length} operational</small></div>
          <div><span>DECISION TRANSFER</span><strong>{state.decisionTransfer.status}</strong><small>{state.decisionTransfer.totalEvaluations} evaluations</small></div>
          <div><span>PASS / FAIL</span><strong>{state.decisionTransfer.passCount}/{state.decisionTransfer.failCount}</strong><small>{state.decisionTransfer.blockedCount} blocked</small></div>
          <div><span>LLM PROVIDERS</span><strong>{state.llmProviders.filter((item)=>item.available).length}</strong><small>configured</small></div>
        </div>
      </section>

      <section className="rn-field" data-sfi-field-anchor="method-lab-native-field">
        <div className="rn-orbit" data-size="1"/><div className="rn-orbit" data-size="2"/><div className="rn-orbit" data-size="3"/>
        <div className="rn-node rn-node--core" data-tone="accent" style={{left:'50%',top:'48%'}}><span>METHOD LAB</span><strong>{state.status}</strong><small>ALL OUTPUTS PRESERVE EPISTEMIC CLASS</small></div>
        {state.protocols.map((protocol,index) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1,state.protocols.length);
          return <div key={protocol.id} className="rn-node" data-tone={protocol.status === 'DEGRADED' ? 'red' : protocol.status === 'OPERATIONAL' ? 'accent' : undefined} style={{left:`${50 + Math.cos(angle) * 37}%`,top:`${48 + Math.sin(angle) * 37}%`}}><span>{protocol.epistemicClass}</span><strong>{protocol.name}</strong><b>{protocol.runCount}</b><small>{protocol.status} · {protocol.lastValidationLevel ?? 'NO VALIDATION RUN'}</small></div>;
        })}
      </section>

      <div className="rn-grid">
        <section className="rn-panel rn-panel--wide"><span>PROTOCOL REGISTRY</span><h2>Operational and gated instruments</h2><div className="rn-list">{state.protocols.map((protocol) => <article key={protocol.id} data-state={protocol.status}><strong>{protocol.name} · {protocol.status} · {protocol.runCount} runs</strong><small>{protocol.purpose}</small><small>{protocol.lastRunAt ? `LAST ${protocol.lastRunAt}` : 'NO QUALIFYING RUN'} · {protocol.missingDependencies.length ? `MISSING ${protocol.missingDependencies.join(' · ')}` : 'DEPENDENCIES AVAILABLE'}</small></article>)}</div></section>
        <section className="rn-panel"><span>DECISION TRANSFER</span><h2>{state.decisionTransfer.status}</h2><p>{state.decisionTransfer.validationRule}</p><p style={{marginTop:10}}>{state.decisionTransfer.authorityRule}</p></section>
        <section className="rn-panel"><span>PROMOTION</span><h2>ROOT REQUIRED</h2><p>{state.promotionRule}</p><p style={{marginTop:10}}>{state.epistemicRule}</p></section>
        {state.decisionTransfer.latest ? <section className="rn-panel rn-panel--full"><span>LATEST DECISION TRANSFER EVALUATION</span><h2>{state.decisionTransfer.latest.outcome}</h2><dl><div><dt>PROVIDER / MODEL</dt><dd>{state.decisionTransfer.latest.provider} / {state.decisionTransfer.latest.model}</dd></div><div><dt>DECISION ACCURACY</dt><dd>{state.decisionTransfer.latest.decisionAccuracy ?? 'NO_VALUE'}</dd></div><div><dt>STRUCTURAL FIDELITY</dt><dd>{state.decisionTransfer.latest.structuralFidelity ?? 'NO_VALUE'}</dd></div><div><dt>COUNTERFACTUAL ACCURACY</dt><dd>{state.decisionTransfer.latest.counterfactualAccuracy ?? 'NO_VALUE'}</dd></div><div><dt>MATURITY</dt><dd>{state.decisionTransfer.latest.maturity ?? 'NO_VALUE'}</dd></div></dl></section> : null}
        {state.warnings.length ? <section className="rn-panel rn-panel--full"><span>WARNINGS</span><div className="rn-list">{state.warnings.map((item) => <article key={item} data-state="DEGRADED"><strong>{item}</strong></article>)}</div></section> : null}
      </div>

      <div className="rn-timeline">{state.decisionTransfer.recent.slice(0,10).map((item) => <article key={item.id}><span>{item.outcome}</span><strong>{item.operationKey}</strong><small>{item.executedAt ?? 'NO_TIME'} · {item.provider}/{item.model}</small></article>)}</div>

      <div className="rn-grid">
        <details className="rn-panel rn-panel--full"><summary className="rn-eyebrow">PROTOCOL EXECUTION / RUN SURFACE</summary><div style={{marginTop:16}}><MethodLabConsole state={state}/></div></details>
        <details className="rn-panel rn-panel--full"><summary className="rn-eyebrow">DECISION TRANSFER / OBSERVED CONTRAST</summary><div style={{marginTop:16}}><DecisionTransferObservatory initial={state.decisionTransfer}/></div></details>
        <details className="rn-panel rn-panel--full"><summary className="rn-eyebrow">BLIND DECISION EXPERIMENT</summary><div style={{marginTop:16}}><BlindDecisionExperiment/></div></details>
        <details className="rn-panel rn-panel--full"><summary className="rn-eyebrow">COGNITIVE RELATIONAL LAB</summary><div style={{marginTop:16}}><CognitiveLabConsole/></div></details>
      </div>
    </RootNativeFrame>
  );
}
