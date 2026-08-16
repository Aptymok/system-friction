import Link from 'next/link';
import type { ObservatoryGoldState } from '@/lib/observatory/gold/observatoryGoldState';
import { RootNativeFrame } from '@/components/root/surfaces/RootNativeFrame';

function dec(value: number | null, digits = 3) { return value === null ? 'NO_VALUE' : value.toFixed(digits); }
function dateTime(value: string | null) {
  if (!value) return 'NO OBSERVATION';
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return value;
  return parsed.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC';
}

export function PublicObservatoryUnified({ state }: { state: ObservatoryGoldState }) {
  const active = state.vectors.filter((vector) => vector.active);
  const anchors = active.slice(0,10).map((vector,index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1,Math.min(10,active.length));
    return { x:.5 + Math.cos(angle) * .32, y:.48 + Math.sin(angle) * .31, weight:.7 + vector.value, tone:(index % 3 === 0 ? 'cyan' : index % 3 === 1 ? 'gold' : 'amber') as 'cyan'|'gold'|'amber' };
  });
  anchors.push({x:.5,y:.48,weight:2,tone:'cyan'});
  return (
    <RootNativeFrame
      organ="PUBLIC OBSERVATORY"
      namespace="SFI / OBSERVATORY"
      code={`WORLD STATE / ${state.longitudinal.horizonDays}D`}
      state={state.systemState.toUpperCase()}
      generatedAt={state.publicContract.observedAt ?? state.generatedAt}
      anchors={anchors}
      accent="cyan"
      returnHref="/"
      returnLabel="RETURN TO SFI ATTRACTOR ↖"
      invariant="PUBLIC RECORD ≠ PRIVATE STATE · DERIVED ≠ OBSERVED · PROJECTION ≠ FACT"
    >
      <section className="rn-hero">
        <div><span className="rn-eyebrow">WORLD STATE / LONGITUDINAL OBSERVATION</span><h1>{state.wsv.regime}</h1><p>{state.explanation.body}</p></div>
        <div className="rn-summary">
          <div><span>WORLD STATE VECTOR</span><strong>{state.wsv.globalIndex.toFixed(3)}</strong><small>derived public index</small></div>
          <div><span>TENSION</span><strong>{state.wsv.tension.toFixed(3)}</strong><small>{state.dailyReading.stability.toUpperCase()}</small></div>
          <div><span>OBSERVATIONS</span><strong>{state.longitudinal.sampleCount}</strong><small>{state.longitudinal.horizonDays} day horizon</small></div>
          <div><span>CONFIDENCE</span><strong>{dec(state.dailyReading.confidence)}</strong><small>{state.dailyReading.evidenceCount} public evidence items</small></div>
        </div>
      </section>

      <section className="rn-field" data-sfi-field-anchor="observatory-native-world-field">
        <div className="rn-orbit" data-size="1"/><div className="rn-orbit" data-size="2"/><div className="rn-orbit" data-size="3"/>
        <div className="rn-node rn-node--core" data-tone="accent" style={{left:'50%',top:'48%'}}><span>WORLD STATE</span><strong>{state.wsv.globalIndex.toFixed(3)}</strong><small>{state.wsv.regime} · NTI {state.wsv.tension.toFixed(3)}</small></div>
        {active.slice(0,10).map((vector,index) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1,Math.min(10,active.length));
          return <article key={vector.id} className="rn-node" data-tone={index < 3 ? 'accent' : undefined} style={{left:`${50 + Math.cos(angle) * 38}%`,top:`${48 + Math.sin(angle) * 37}%`}}><span>{vector.domainKeys.join(' · ')}</span><strong>{vector.label}</strong><b>{vector.value.toFixed(3)}</b><small>{vector.sourceCount} sources · Δ {dec(vector.delta)} · {vector.trend}</small></article>;
        })}
      </section>

      <div className="rn-grid">
        <section className="rn-panel rn-panel--wide"><span>WORLD VECTOR</span><h2>{active.length}/{state.vectors.length} active domains</h2><div className="rn-list">{state.vectors.map((vector) => <article key={vector.id} data-state={vector.active ? 'OBSERVED' : 'GATED'}><strong>{vector.label} · {vector.active ? vector.value.toFixed(3) : 'NO_VALUE'}</strong><small>{vector.sourceCount} sources · persistence {dec(vector.persistence)} · trust {dec(vector.trust)} · confidence {dec(vector.confidence)} · Δ {dec(vector.delta)}</small></article>)}</div></section>
        <section className="rn-panel"><span>COHERENCE</span><h2>{state.wsv.coherence.toFixed(3)}</h2><dl><div><dt>RESILIENCE</dt><dd>{state.wsv.resilience.toFixed(3)}</dd></div><div><dt>ALIGNMENT</dt><dd>{state.wsv.alignment.toFixed(3)}</dd></div><div><dt>TENSION</dt><dd>{state.wsv.tension.toFixed(3)}</dd></div></dl></section>
        <section className="rn-panel"><span>LONGITUDINAL DELTA</span><h2>{dec(state.longitudinal.deltas.wsi)}</h2><dl><div><dt>WSV Δ</dt><dd>{dec(state.longitudinal.deltas.wsi)}</dd></div><div><dt>NTI Δ</dt><dd>{dec(state.longitudinal.deltas.nti)}</dd></div><div><dt>CONF Δ</dt><dd>{dec(state.longitudinal.deltas.confidence)}</dd></div></dl></section>
        <section className="rn-panel rn-panel--wide"><span>WORLD TENSIONS</span><h2>Ranked pressure field</h2><div className="rn-list">{state.worldTensions.slice(0,12).map((item) => <article key={`${item.rank}-${item.label}`}><strong>{String(item.rank).padStart(2,'0')} · {item.label}</strong><small>{item.domain} · {item.value.toFixed(3)}</small></article>)}</div></section>
        <section className="rn-panel"><span>REGIONAL TENSIONS</span><h2>{state.regionalTensions.length}</h2><div className="rn-list">{state.regionalTensions.slice(0,8).map((item) => <article key={item.region}><strong>{item.region}</strong><small>{item.value.toFixed(3)} · {item.trend ?? 'NO_TREND'}</small></article>)}</div></section>
        <section className="rn-panel"><span>GLOBAL MAP</span><h2>{state.globalMap.nodes.length} nodes</h2><p>{state.globalMap.flows.length} observed/derived flows are available to the public map model. Intensity range {state.globalMap.tensionIntensityMin.toFixed(3)}–{state.globalMap.tensionIntensityMax.toFixed(3)}.</p></section>
      </div>

      <div className="rn-timeline">{state.longitudinal.points.slice(-14).map((point,index) => <article key={`${point.observedAt}-${index}`}><span>{point.sourceState.toUpperCase()}</span><strong>WSV {dec(point.wsi)} · NTI {dec(point.nti)}</strong><small>{dateTime(point.observedAt)} · conf {dec(point.confidence)}</small></article>)}</div>

      <div className="rn-grid">
        <section className="rn-panel rn-panel--wide"><span>DAILY READING</span><h2>{state.dailyReading.title}</h2><p>{state.dailyReading.summary}</p><div className="rn-list" style={{marginTop:14}}>{state.dailyReading.evidence.map((item) => <article key={item} data-state="OBSERVED"><strong>{item}</strong></article>)}{!state.dailyReading.evidence.length ? <article data-state="GATED"><strong>NO PUBLICABLE EVIDENCE IN THIS CUT</strong></article> : null}</div></section>
        <section className="rn-panel"><span>LIMITS</span><div className="rn-list">{state.dailyReading.limits.map((item) => <article key={item}><strong>{item}</strong></article>)}</div></section>
        <section className="rn-panel rn-panel--wide"><span>PROVENANCE</span><h2>Based on</h2><div className="rn-list">{state.provenance.basedOn.map((item) => <article key={item} data-state="OBSERVED"><strong>{item}</strong></article>)}</div></section>
        <section className="rn-panel"><span>DEGRADED SOURCES</span><div className="rn-list">{state.provenance.degradedSources.length ? state.provenance.degradedSources.map((item) => <article key={item} data-state="DEGRADED"><strong>{item}</strong></article>) : <article data-state="OBSERVED"><strong>NONE DECLARED</strong></article>}</div></section>
        <section className="rn-panel rn-panel--full"><span>INSTITUTIONAL BOUNDARY</span><h2>Public observability does not expose governed organs.</h2><p>The public Observatory observes world state. Studio, Cognitive Twin, Method Lab and ROOT remain separate operational/governed surfaces; their existence can be navigated without leaking private evidence or internal state.</p><div className="rn-actions" style={{marginTop:14}}><Link href="/field">FIELD ↗</Link><Link href="/login?next=%2Fstudio">STUDIO / ACCESS ↗</Link><Link href="/login?next=%2Fmethod-lab">METHOD LAB / GOVERNED ↗</Link><Link href="/login?next=%2Froot%2Fcognitive-twin">COGNITIVE TWIN / GOVERNED ↗</Link></div></section>
      </div>
    </RootNativeFrame>
  );
}
