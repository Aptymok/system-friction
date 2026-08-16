'use client';

import { useMemo, useState } from 'react';
import type { CognitiveTwinState } from '@/core/cognitive-twin/readState';
import { RootNativeFrame } from './RootNativeFrame';

type Row = Record<string, unknown>;
function row(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function text(value: unknown, fallback = 'NO_VALUE') { return typeof value === 'string' && value.trim() ? value.trim() : fallback; }
function countLike(value: unknown) {
  if (Array.isArray(value)) return value.length;
  const r = row(value);
  for (const key of ['count','eventCount','total','length','runCount']) if (typeof r[key] === 'number') return r[key] as number;
  for (const key of ['events','runs','rows','items','journal','mutations','experiments']) if (Array.isArray(r[key])) return (r[key] as unknown[]).length;
  return 0;
}
function createdAt(value: unknown) { const r = row(value); return text(r.created_at ?? r.createdAt ?? r.executed_at ?? r.executedAt, '—'); }

export function CognitiveTwinNativeSurface({
  state,
  lineage,
  experiments,
  mutations,
  journal,
}: {
  state: CognitiveTwinState;
  lineage: { subjectId: string; lineageId: string; genesisPresent: boolean; chainIntegrity: string; eventCount: number; materialEventCount: number; lastEpochAt: string | null; headHash: string | null; lastDisposition: string | null; unresolvedMutationProposals: number };
  experiments: unknown;
  mutations: unknown;
  journal: unknown;
}) {
  const [focus, setFocus] = useState<'MEMORY'|'DECISIONS'|'RUNS'|'EVALUATIONS'|'LINEAGE'>('LINEAGE');
  const anchors = useMemo(() => [
    { x:.50,y:.46,weight:2,tone:'violet' as const },
    { x:.23,y:.28,weight:1.2,tone:'cyan' as const },
    { x:.78,y:.28,weight:1.1,tone:'gold' as const },
    { x:.20,y:.70,weight:1,tone:'amber' as const },
    { x:.80,y:.70,weight:1,tone:'violet' as const },
    { x:.50,y:.82,weight:.85,tone:'bone' as const },
  ], []);
  const providerNames = state.providers.filter((item) => item.available).map((item) => item.id).join(' / ') || 'NO_PROVIDER';
  const recent = focus === 'MEMORY' ? state.recentMemory : focus === 'DECISIONS' ? state.recentDecisions : focus === 'RUNS' ? state.recentRuns : focus === 'EVALUATIONS' ? state.recentEvaluations : [];
  const journalCount = countLike(journal);
  const experimentCount = countLike(experiments);
  const mutationCount = countLike(mutations);

  return (
    <RootNativeFrame organ="COGNITIVE TWIN" code={`${lineage.subjectId} / ${lineage.lineageId}`} state={state.implementation.databaseReady ? 'OBSERVABLE' : 'DEGRADED'} generatedAt={state.generatedAt} anchors={anchors} accent="violet">
      <section className="rn-hero">
        <div><span className="rn-eyebrow">COGNITIVE CONTINUITY / COMPUTATIONAL SELF-MODEL</span><h1>Continuity emerges from trace, not narration.</h1><p>Memory, decisions, runs, evaluations, lineage and governed mutation remain separable. Availability does not imply consumption; a computational self-report does not establish subjective experience.</p></div>
        <div className="rn-summary">
          <div><span>MEMORY</span><strong>{state.counts.memory}</strong><small>canonical events</small></div>
          <div><span>DECISIONS</span><strong>{state.counts.decisions ?? 'NO_VALUE'}</strong><small>{state.counts.approvedDecisions} approved</small></div>
          <div><span>RUNS</span><strong>{state.counts.runs ?? 'NO_VALUE'}</strong><small>{providerNames}</small></div>
          <div><span>LINEAGE</span><strong>{lineage.chainIntegrity}</strong><small>{lineage.eventCount} epochs</small></div>
        </div>
      </section>

      <section className="rn-field" data-sfi-field-anchor="ct-native-field">
        <div className="rn-orbit" data-size="1"/><div className="rn-orbit" data-size="2"/><div className="rn-orbit" data-size="3"/>
        <button className="rn-node rn-node--core" data-tone="accent" style={{left:'50%',top:'46%'}} onClick={() => setFocus('LINEAGE')}><span>CT-A01</span><strong>{lineage.chainIntegrity}</strong><small>{lineage.lastDisposition ?? 'NO DISPOSITION'}</small></button>
        <button className="rn-node" data-tone="accent" style={{left:'23%',top:'28%'}} onClick={() => setFocus('MEMORY')}><span>EPISODIC MEMORY</span><b>{state.counts.memory}</b><small>{state.recentMemory.length} recent</small></button>
        <button className="rn-node" style={{left:'78%',top:'28%'}} onClick={() => setFocus('DECISIONS')}><span>DECISION TRACE</span><b>{state.counts.decisions ?? 0}</b><small>{state.counts.approvedDecisions} approved</small></button>
        <button className="rn-node" style={{left:'20%',top:'70%'}} onClick={() => setFocus('RUNS')}><span>EXECUTION</span><b>{state.counts.runs ?? 0}</b><small>{state.implementation.providerExecutionObserved ? 'PROVIDER OBSERVED' : 'NO PROVIDER EXECUTION'}</small></button>
        <button className="rn-node" style={{left:'80%',top:'70%'}} onClick={() => setFocus('EVALUATIONS')}><span>METACOGNITION / EVAL</span><b>{state.counts.evaluations ?? 0}</b><small>{state.counts.approvedModels} approved models</small></button>
        <div className="rn-node" style={{left:'50%',top:'82%'}}><span>GOVERNED MUTATION</span><b>{mutationCount}</b><small>{lineage.unresolvedMutationProposals} unresolved lineage proposals</small></div>
      </section>

      <div className="rn-grid">
        <section className="rn-panel rn-panel--wide"><span>FOCUS / {focus}</span><h2>{focus === 'LINEAGE' ? 'Lineage health' : `Recent ${focus.toLowerCase()}`}</h2>{focus === 'LINEAGE' ? <dl><div><dt>GENESIS</dt><dd>{lineage.genesisPresent ? 'PRESENT' : 'MISSING'}</dd></div><div><dt>CHAIN INTEGRITY</dt><dd>{lineage.chainIntegrity}</dd></div><div><dt>MATERIAL EVENTS</dt><dd>{lineage.materialEventCount}</dd></div><div><dt>HEAD HASH</dt><dd>{lineage.headHash ? `${lineage.headHash.slice(0,16)}…` : 'NO_VALUE'}</dd></div><div><dt>LAST EPOCH</dt><dd>{lineage.lastEpochAt ?? 'NO_VALUE'}</dd></div></dl> : <div className="rn-list">{(recent as unknown[]).slice(0,8).map((item,index) => { const r=row(item); return <article key={text(r.id,`${focus}-${index}`)}><strong>{text(r.memory_key ?? r.task_id ?? r.test_key ?? r.operation_key ?? r.status,`${focus} ${index+1}`)}</strong><small>{text(r.status ?? r.outcome ?? r.canonical_store,'OBSERVED')} · {createdAt(r)}</small></article>; })}{!recent.length ? <p>NO RECENT RECORDS</p> : null}</div>}</section>
        <section className="rn-panel"><span>EXPERIMENTAL STATE</span><h2>{experimentCount}</h2><p>Experiment records remain experimental and cannot promote themselves into canonical memory or identity.</p></section>
        <section className="rn-panel"><span>JOURNAL</span><h2>{journalCount}</h2><p>Journal entries are auditable computational records. They are not phenomenal reports.</p></section>
        <section className="rn-panel"><span>SFI INTEGRATION</span><h2>{state.integration.summary.connected}/{state.integration.summary.total}</h2><p>{state.integration.summary.fullyConnected ? 'All declared SFI organs are connected.' : `${state.integration.summary.exercised} organs have qualifying observed records.`}</p></section>
        <section className="rn-panel"><span>AUTONOMY CLAIM</span><h2>{state.implementation.institutionalAutonomyProven ? 'PROVEN' : 'NOT DEMONSTRATED'}</h2><p>Architecture, continuity and observed execution do not by themselves demonstrate individuation or subjective autonomy.</p></section>
      </div>

      <div className="rn-timeline">{state.recentRuns.slice(0,10).map((item,index) => { const r=row(item); return <article key={text(r.id,`run-${index}`)}><span>{text(r.role,'RUN')}</span><strong>{text(r.objective ?? r.task_id,'COGNITIVE RUN')}</strong><small>{createdAt(r)}</small></article>; })}</div>
    </RootNativeFrame>
  );
}
