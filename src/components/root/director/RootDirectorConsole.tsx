'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  Activity,
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  CircleAlert,
  FileSearch,
  Gauge,
  Orbit,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { RootSovereignState, RootRow } from '@/lib/root/sovereign/rootSovereignState';
import './root-director.css';

type Props = { state: RootSovereignState; actorLabel: string; accessMode: 'sovereign' | 'observer' };

function text(row: RootRow, keys: string[], fallback = '—') {
  for (const key of keys) { const value = row[key]; if (typeof value === 'string' && value.trim()) return value.trim(); }
  return fallback;
}

function statusTone(value: string) {
  const normalized = value.toLowerCase();
  if (/fail|error|degrad|block|risk|missing/.test(normalized)) return 'bad';
  if (/wait|open|review|pending|gated|partial/.test(normalized)) return 'warn';
  return 'good';
}

function dateLabel(value: string | null) {
  if (!value) return 'sin observación';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : value;
}

export function RootDirectorConsole({ state, actorLabel, accessMode }: Props) {
  const proposals = state.governance.data.proposals ?? [];
  const gatedCapabilities = (state.execution.data.capabilities ?? []).filter((item) => item.state === 'gated');
  const evidenceRequests = state.predictions.data.evidenceRequests ?? [];
  const openPredictions = (state.predictions.data.runs ?? []).filter((row) => /OPEN|WAITING|DUE|REVIEW/i.test(text(row, ['status'], '')));
  const warnings = state.warnings ?? [];
  const agents = state.agents.data.agents ?? [];
  const activeAgents = agents.filter((agent) => /execut|active|available|ready|completed|ok/i.test(String(agent.state.value ?? agent.availability ?? ''))).length;
  const degradedAgents = agents.filter((agent) => /degrad|fail|error|missing|blocked/i.test(String(agent.state.value ?? agent.availability ?? agent.error ?? ''))).length;
  const needsAuthority = useMemo(() => [
    ...proposals.slice(0, 8).map((row) => ({ kind: 'PROPOSAL', title: text(row, ['title','label','summary','proposal_type'], 'Propuesta institucional'), state: text(row, ['status','state'], 'OPEN'), href: '/root/governance' })),
    ...gatedCapabilities.slice(0, 5).map((item) => ({ kind: 'AUTHORITY', title: item.label, state: 'GATED', href: '/root/governance' })),
  ].slice(0, 10), [proposals, gatedCapabilities]);

  return <main className="rd-shell">
    <div className="rd-field" aria-hidden="true"/>
    <header className="rd-topbar"><Link href="/" className="rd-brand"><span>SFI</span><small>SYSTEM FRICTION INSTITUTE</small></Link><div className="rd-actor"><span>{accessMode === 'sovereign' ? 'DIRECTOR' : 'OBSERVER'}</span><b>{actorLabel}</b></div></header>

    <section className="rd-hero">
      <div className="rd-eyebrow"><Orbit/> ROOT · DIRECTION LAYER</div>
      <h1>Dirige el instituto.<br/><em>No lo operes a mano.</em></h1>
      <p>SFI observa, analiza, reconstruye, simula, solicita evidencia, propone y calibra dentro de sus límites. ROOT concentra únicamente estado institucional, contradicciones y decisiones que requieren autoridad.</p>
      <div className="rd-health"><span>ESTADO GENERADO</span><b>{dateLabel(state.generatedAt)}</b><span>{state.interpretation?.overallState ? String(state.interpretation.overallState) : state.system.dataClass.toUpperCase()}</span></div>
    </section>

    <section className="rd-metrics">
      <article><Activity/><span>AGENTES</span><strong>{activeAgents}/{agents.length}</strong><small>{degradedAgents ? `${degradedAgents} requieren atención` : 'sin degradación declarada'}</small></article>
      <article><ShieldCheck/><span>DECISIONES</span><strong>{needsAuthority.length}</strong><small>requieren autoridad o revisión</small></article>
      <article><FileSearch/><span>EVIDENCIA</span><strong>{evidenceRequests.length}</strong><small>solicitudes predictivas abiertas</small></article>
      <article><Gauge/><span>PREDICCIONES</span><strong>{openPredictions.length}</strong><small>abiertas, due o en revisión</small></article>
      <article><BrainCircuit/><span>COGNITIVE SPINE</span><strong>{state.cognitiveTwin.dataClass.toUpperCase()}</strong><small>CT no expande autoridad</small></article>
    </section>

    <div className="rd-layout">
      <section className="rd-priority">
        <div className="rd-heading"><span>01</span><div><h2>Qué necesita de mí</h2><p>Si esta lista está vacía, la dirección no necesita intervenir.</p></div></div>
        {needsAuthority.length ? <div className="rd-list">{needsAuthority.map((item,index) => <Link href={item.href} key={`${item.kind}-${index}`}><div><span>{item.kind}</span><strong>{item.title}</strong></div><i data-tone={statusTone(item.state)}>{item.state}</i><ArrowRight/></Link>)}</div> : <div className="rd-empty"><CheckCircle2/><strong>Sin decisiones soberanas pendientes.</strong><span>El instituto puede continuar su operación interna.</span></div>}
      </section>

      <aside className="rd-status">
        <div className="rd-heading"><span>02</span><div><h2>Qué está haciendo SFI</h2><p>Lectura de órganos sin entrar a su implementación.</p></div></div>
        <div className="rd-organs">
          {[
            ['WORLD / SYSTEM', state.system.dataClass, '/observatory'],
            ['GOVERNANCE', state.governance.dataClass, '/root/governance'],
            ['COGNITIVE RUNTIME', state.cognitiveRuntime.dataClass, '/root/agents'],
            ['COGNITIVE TWIN', state.cognitiveTwin.dataClass, '/root/cognitive-twin'],
            ['EVIDENCE', state.evidence.dataClass, '/root/evidence'],
            ['PREDICTIVE', state.predictions.dataClass, '/root/predictions'],
            ['EXECUTION', state.execution.dataClass, '/root/returns'],
          ].map(([label,status,href]) => <Link key={String(label)} href={String(href)}><span>{label}</span><b data-tone={statusTone(String(status))}>{String(status).toUpperCase()}</b></Link>)}
        </div>
      </aside>
    </div>

    <section className="rd-watch">
      <div className="rd-heading"><span>03</span><div><h2>Contradicciones y señales</h2><p>No se ocultan estados missing, degraded o gated.</p></div></div>
      <div className="rd-watch-grid">
        {warnings.length ? warnings.slice(0,8).map((warning,index) => <article key={index}><CircleAlert/><span>{warning}</span></article>) : <article className="rd-ok"><CheckCircle2/><span>No hay warnings institucionales en este corte.</span></article>}
        {openPredictions.slice(0,4).map((row,index) => <article key={`p-${index}`}><Sparkles/><span>{text(row,['subject_id','scope','model_key'],'Predicción pendiente')} · {text(row,['status'],'OPEN')}</span></article>)}
      </div>
    </section>

    <section className="rd-actions">
      <Link href="/field"><Orbit/><span><b>FIELD</b><small>Entrar sistemas, fuentes y evidencia.</small></span><ArrowRight/></Link>
      <Link href="/root/governance"><ShieldCheck/><span><b>GOVERNANCE</b><small>Autorizar, rechazar o mantener límites.</small></span><ArrowRight/></Link>
      <Link href="/root/reports"><FileSearch/><span><b>REPORTS</b><small>Leer lo que el instituto produjo.</small></span><ArrowRight/></Link>
      <Link href="/root/technical"><Bot/><span><b>TECHNICAL</b><small>Superficie avanzada; no requerida para dirigir.</small></span><ArrowRight/></Link>
    </section>
  </main>;
}
