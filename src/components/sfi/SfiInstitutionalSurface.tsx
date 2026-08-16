import Link from 'next/link';
import type { SfiWorldInterfaceState } from '@/lib/sfi/worldInterfaceState';
import type { PublicInstitutionalAttractorState } from '@/lib/institution/publicAttractor';
import { SfiExperienceLink } from '@/components/navigation/SfiExperienceLink';
import './sfi-institutional-surface.css';

function label(value: string | null | undefined, fallback = 'NO_VALUE') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function utc(value: string | null | undefined) {
  if (!value) return 'NO_TIMESTAMP';
  const parsed = new Date(value);
  return Number.isFinite(parsed.valueOf()) ? `${parsed.toISOString().replace('T', ' ').slice(0, 19)} UTC` : 'NO_TIMESTAMP';
}

function ctx(path: string, scene: string, focus?: string, mode?: string) {
  const params = new URLSearchParams({ origin: '/', scene });
  if (focus) params.set('focus', focus);
  if (mode) params.set('mode', mode);
  return `${path}?${params.toString()}`;
}

function SceneLink({ href, label: text, access = 'public' }: { href: string; label: string; access?: 'public' | 'authenticated' | 'root' }) {
  return <SfiExperienceLink href={href} access={access} className="is-scene-link"><span>{text}</span><b>↗</b></SfiExperienceLink>;
}

export function SfiInstitutionalSurface({ state, attractor }: { state: SfiWorldInterfaceState; attractor: PublicInstitutionalAttractorState }) {
  const coverage = attractor.evidenceCoverage === null ? 'NO_VALUE' : `${Math.round(attractor.evidenceCoverage * 100)}%`;
  const visibleNodes = state.nodes.slice(0, 14);
  const activeWarnings = [...state.warnings, ...attractor.warnings].filter(Boolean).slice(0, 6);

  return (
    <main className="is-root">
      <header className="is-attractor-top">
        <Link href="/" className="is-mark"><strong>SFI</strong><span>SYSTEM FRICTION INSTITUTE</span></Link>
        <span>INSTITUTIONAL SYSTEM OBSERVATORY · 2026</span>
      </header>

      <section className="is-scene is-hero" id="signal" data-index="01">
        <div className="is-scene-copy">
          <span className="is-kicker">01 / SIGNAL ACQUISITION</span>
          <h1><span>SYSTEM</span><em>FRICTION</em><span>INSTITUTE</span></h1>
          <p>Observe reality. Reduce friction. Increase clarity. Evidence remains distinct from inference; trajectory precedes intervention; returns determine what the system may learn.</p>
          <div className="is-axis"><div><small>SIGNAL</small><strong>{label(state.signalState.value, state.signalState.status)}</strong></div><div><small>GENERATED</small><strong>{utc(state.generatedAt)}</strong></div><div><small>ATTRACTOR</small><strong>{label(attractor.status)}</strong></div></div>
        </div>
      </section>

      <section className="is-scene is-observation" id="observation" data-index="02">
        <div className="is-scene-head"><div><span className="is-kicker">02 / OBSERVATION FIELD</span><h2>Reality enters as signal, not conclusion.</h2></div><SceneLink href={ctx('/observatory','observation','world-state','longitudinal')} label="ENTER OBSERVATORY" /></div>
        <div className="is-runtime">
          <article><span>SIGNAL STATE</span><strong>{label(state.signalState.value, state.signalState.status)}</strong><small>{state.signalState.detail}</small></article>
          <article><span>FIELD COHERENCE</span><strong>{label(state.fieldCoherence.value)}</strong><small>{label(state.fieldCoherence.trend)}</small></article>
          <article><span>ACTIVE INTERACTIONS</span><strong>{label(state.activeInteractions.value)}</strong><small>{state.activeInteractions.detail}</small></article>
          <article><span>WORLD VECTOR</span><strong>{state.coreIndicators.wsv.value.toFixed(3)}</strong><small>{state.indicatorHistory.available ? `24h reference ${utc(state.indicatorHistory.referenceCapturedAt)}` : '24h reference unavailable'}</small></article>
        </div>
      </section>

      <section className="is-scene" id="system" data-index="03">
        <div className="is-scene-head"><div><span className="is-kicker">03 / SYSTEM TOPOLOGY</span><h2>Relations become observable before they become explanatory.</h2></div><SceneLink href={ctx('/observatory','system','topology','relational')} label="OPEN TOPOLOGY" /></div>
        <div className="is-system-map">
          <div className="is-system-grid" />
          {visibleNodes.map((node) => <div key={node.id} className="is-system-node" data-state={node.state} style={{ left: `${node.x}%`, top: `${node.y}%` }} title={node.interpretation}><span>{node.label}</span><small>{node.state.toUpperCase()}</small></div>)}
          <div className="is-system-readout"><span>LIVE READ MODEL</span><strong>{state.nodes.length} NODES · {state.connections.length} RELATIONS</strong><small>RELATION ≠ CAUSALITY</small></div>
        </div>
      </section>

      <section className="is-scene is-friction" id="friction" data-index="04">
        <div className="is-scene-head"><div><span className="is-kicker">04 / FRICTION</span><h2>A system accumulates friction before it announces failure.</h2></div><SceneLink href={ctx('/friction','friction','institutional-field','current')} label="INSPECT FRICTION" /></div>
        <div className="is-friction-grid">
          <article><span>FRICTION LEVEL</span><strong>{label(state.frictionLevel.value)}</strong><small>{label(state.frictionLevel.trend)}</small></article>
          <article><span>SYSTEM STRAIN</span><strong>{label(state.systemStrain.value)}</strong><small>{label(state.systemStrain.trend)}</small></article>
          <article><span>IHG</span><strong>{state.coreIndicators.ihg.value.toFixed(3)}</strong><small>{state.coreIndicators.ihg.delta24h === null ? 'Δ24h NO_VALUE' : `Δ24h ${state.coreIndicators.ihg.delta24h.toFixed(3)}`}</small></article>
          <article><span>NTI</span><strong>{state.coreIndicators.nti.value.toFixed(3)}</strong><small>{state.coreIndicators.nti.delta24h === null ? 'Δ24h NO_VALUE' : `Δ24h ${state.coreIndicators.nti.delta24h.toFixed(3)}`}</small></article>
          <article><span>LDI</span><strong>{state.coreIndicators.ldi.value.toFixed(3)}</strong><small>{state.coreIndicators.ldi.delta24h === null ? 'Δ24h NO_VALUE' : `Δ24h ${state.coreIndicators.ldi.delta24h.toFixed(3)}`}</small></article>
        </div>
      </section>

      <section className="is-scene is-split" id="mihm" data-index="05">
        <div><span className="is-kicker">05 / MODELO INTEGRAL HOMEOSTÁTICO MULTINODAL</span><h2>Homeostasis is governed reconfiguration.</h2><p>MIHM describes interacting nodes, dimensions, relations, flows and constraints across time. The public surface exposes the method without converting model state into truth.</p><SceneLink href={ctx('/mihm','mihm','institutional-state','current')} label="EXPLORE MIHM" /></div>
        <div className="is-rings"><i/><i/><i/><i/><strong>MIHM</strong><small>NODE × DIMENSION × RELATION × FLOW × CONSTRAINT</small></div>
      </section>

      <section className="is-scene" id="evidence" data-index="06">
        <div className="is-scene-head"><div><span className="is-kicker">06 / EVIDENCE STATE</span><h2>A signal earns epistemic weight through lineage.</h2></div><SceneLink href={ctx('/observatory','evidence','public-reading','provenance')} label="INSPECT PUBLIC EVIDENCE" /></div>
        <div className="is-evidence-board">
          <article><span>ATTRACTOR COVERAGE</span><strong>{coverage}</strong><small>{attractor.activePhenomena} active phenomenon trajectories</small></article>
          <article><span>SUPPORTED DIMENSIONS</span><strong>{attractor.supportedDimensions.length}</strong><small>{attractor.supportedDimensions.join(' · ') || 'NO_VALUE'}</small></article>
          <article><span>MISSING DIMENSIONS</span><strong>{attractor.missingDimensions.length}</strong><small>{attractor.missingDimensions.join(' · ') || 'NONE DECLARED'}</small></article>
          <article><span>CONTRADICTED</span><strong>{attractor.contradictedDimensions.length}</strong><small>{attractor.contradictedDimensions.join(' · ') || 'NONE DECLARED'}</small></article>
        </div>
        {activeWarnings.length ? <div className="is-warning-strip">{activeWarnings.map((warning) => <span key={warning}>{warning}</span>)}</div> : null}
      </section>

      <section className="is-scene is-operation" id="studio" data-index="07">
        <div><span className="is-kicker">07 / STUDIO</span><h2>A case moves through states. Studio exposes the transfer.</h2><p>Sources, records, evidence, system model, observations, friction, hypotheses, trajectories, instrument runs, recommendations and returns remain addressable without collapsing into one authority.</p></div>
        <div className="is-operation-flow"><span>SOURCES</span><b>→</b><span>EVIDENCE</span><b>→</b><span>MODEL</span><b>→</b><span>TRAJECTORY</span><b>→</b><span>RETURN</span></div>
        <SceneLink href={ctx('/studio','studio','active-workspace','analysis')} label="OPEN STUDIO" access="authenticated" />
      </section>

      <section className="is-scene is-split" id="twin" data-index="08">
        <div><span className="is-kicker">08 / COGNITIVE TWIN</span><h2>Continuity without pretending subjectivity.</h2><p>Versioned operating state, episodic trace, causal decision history and governed mutation remain distinct from claims about human subjective experience.</p><SceneLink href={ctx('/root/cognitive-twin','twin','institutional-twin','governed')} label="OPEN COGNITIVE TWIN" access="root" /></div>
        <div className="is-memory-stack"><i/><i/><i/><i/><i/><i/><strong>VERSIONED CONTINUITY</strong></div>
      </section>

      <section className="is-scene is-split" id="simulation" data-index="09">
        <div><span className="is-kicker">09 / METHOD LAB + SIMULATION</span><h2>Perturb the model. Keep the world untouched.</h2><p>Simulation remains <b>SIMULATED</b>. A lab run can challenge a hypothesis or compare trajectories, but it cannot become external observation merely because it rendered successfully.</p><SceneLink href={ctx('/method-lab','simulation','method-run','simulated')} label="OPEN METHOD LAB" access="authenticated" /></div>
        <div className="is-simulation-field"><span>SIMULATED</span><strong>NO PUBLIC RUN SELECTED</strong><small>WORLD STATE REMAINS EXTERNAL</small></div>
      </section>

      <section className="is-scene" id="trajectories" data-index="10">
        <div className="is-scene-head"><div><span className="is-kicker">10 / TRAJECTORY DIVERGENCE</span><h2>The future is a branch set, not a claim.</h2></div><SceneLink href={ctx('/observatory','trajectories','longitudinal','trajectory')} label="VIEW TRAJECTORIES" /></div>
        <div className="is-trajectory-lines"><i/><i/><i/><i/><span>OBSERVED STATE</span><strong>{label(state.predictions.value)}</strong><small>{state.predictions.detail}</small></div>
      </section>

      <section className="is-scene" id="governance" data-index="11">
        <div className="is-scene-head"><div><span className="is-kicker">11 / GOVERNANCE TRACE</span><h2>Domains remain distinct even when the pipeline is continuous.</h2></div><SceneLink href={ctx('/repository','governance','epistemic-contract','read')} label="READ GOVERNANCE CONTRACT" /></div>
        <div className="is-governance"><div><span>RECORD</span><b>≠</b><span>EVIDENCE</span></div><div><span>EVIDENCE</span><b>≠</b><span>COGNITIVE STATE</span></div><div><span>COGNITIVE STATE</span><b>≠</b><span>COGNITIVE EXECUTION</span></div><div><span>COGNITIVE EXECUTION</span><b>≠</b><span>GOVERNANCE</span></div><div><span>GOVERNANCE</span><b>≠</b><span>TRUTH</span></div></div>
      </section>

      <section className="is-scene is-field-scene" id="field" data-index="12">
        <div><span className="is-kicker">12 / FIELD RETURN</span><h2>The model earns relevance only when reality returns.</h2><p>Field is where observation, intervention and return reconnect. It is also the natural commercial entry point: introduce a system, case, collaboration or operational problem into a governed intake.</p></div>
        <SceneLink href={ctx('/field','field','intake','engage') + '&intent=engage'} label="BRING A SYSTEM INTO THE FIELD" />
      </section>

      <section className="is-scene" id="research" data-index="13">
        <div className="is-scene-head"><div><span className="is-kicker">13 / RESEARCH + LIBRARY</span><h2>Methods should survive contact with falsification.</h2></div><SceneLink href={ctx('/library','research','canonical-corpus','read')} label="OPEN LIBRARY" /></div>
        <div className="is-research-grid"><article><span>R / 001</span><strong>MIHM</strong><p>Multinodal homeostatic representation.</p></article><article><span>R / 002</span><strong>COGNITIVE TWIN</strong><p>Versioned computational continuity.</p></article><article><span>R / 003</span><strong>RETROLONGITUDINAL</strong><p>Backward reconstruction constrained by surviving evidence.</p></article></div>
      </section>

      <section className="is-scene is-root-scene" id="root" data-index="14">
        <div><span className="is-kicker">14 / ROOT</span><h2>Everything reconnects. Nothing collapses.</h2><p>ROOT governs institutional admission, epistemic debt, canonical state and the Cognitive Spine. It is not a commercial super-dashboard and is never exposed as public authority.</p></div>
        <div className="is-root-topology"><i/><i/><i/><strong>ROOT</strong>{['EVIDENCE','STUDIO','COGNITIVE TWIN','FIELD','METHOD LAB','OBSERVATORY','RETURNS','POLICY'].map((item,index) => <span key={item} style={{ ['--i' as string]: index } as React.CSSProperties}>{item}</span>)}</div>
        <SceneLink href={ctx('/root','root','institutional-governance','governed')} label="ENTER ROOT" access="root" />
      </section>

      <section className="is-scene is-final" id="institute" data-index="15">
        <span className="is-kicker">15 / INSTITUTIONAL ATTRACTOR</span>
        <div className="is-final-mark"><span>S</span><span>F</span><span>I</span></div>
        <h2>Observe what the system is actually doing.</h2>
        <div className="is-final-exits">
          <SceneLink href={ctx('/observatory','institute','world-state','observe')} label="OBSERVE · OBSERVATORY" />
          <SceneLink href={ctx('/field','institute','intake','engage') + '&intent=engage'} label="ENGAGE · FIELD" />
          <SfiExperienceLink href={ctx('/studio','institute','workspace','access')} access="authenticated" className="is-final-access"><span>ACCESS · RESUME</span><b>↗</b></SfiExperienceLink>
        </div>
        <footer><span>SYSTEM FRICTION INSTITUTE</span><strong>OBSERVE SYSTEMS · RECONSTRUCT TRAJECTORIES · MODEL FRICTION · TEST INTERVENTIONS · MEASURE RETURN</strong></footer>
      </section>
    </main>
  );
}
