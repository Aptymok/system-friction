'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  Aperture,
  Bot,
  Box,
  Braces,
  CheckCircle2,
  CircleDot,
  Clock3,
  Eye,
  FileCheck2,
  FlaskConical,
  GitCompareArrows,
  Network,
  Orbit,
  Radar,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Target,
  TriangleAlert,
  Waypoints,
  Waves,
} from 'lucide-react';
import './sfi-cinematic.css';

export type SfiEpistemicTone = 'OBSERVED' | 'DERIVED' | 'INFERRED' | 'PROJECTED' | 'SIMULATED' | 'MISSING' | 'CONTRADICTED' | 'GOVERNED';

export type SfiCinematicCrumb = {
  label: string;
  value: string;
  tone?: 'default' | 'accent' | 'muted';
};

export type SfiCinematicNode = {
  id: string;
  label: string;
  type: string;
  status?: string | null;
  value?: string | null;
  tone?: SfiEpistemicTone;
  parentId?: string | null;
  selected?: boolean;
};

export type SfiCinematicRelation = {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  tone?: SfiEpistemicTone;
  strength?: number | null;
};

export type SfiCinematicInsight = {
  id: string;
  tone: SfiEpistemicTone;
  statement: string;
  evidenceCount?: number;
  at?: string | null;
};

export type SfiCinematicTimelineItem = {
  id: string;
  at: string | null;
  label: string;
  type: string;
  tone?: SfiEpistemicTone;
};

export type SfiCinematicStat = {
  label: string;
  value: string;
  detail?: string | null;
  tone?: SfiEpistemicTone;
};

export type SfiCinematicSurfaceProps = {
  brand?: string;
  subtitle?: string;
  crumbs: SfiCinematicCrumb[];
  timeWindow?: string | null;
  integrity?: string | null;
  artifactId?: string | null;
  certificateState?: string | null;
  mode?: string | null;
  generatedAt?: string | null;
  nodes: SfiCinematicNode[];
  relations: SfiCinematicRelation[];
  fieldLabel: string;
  fieldDetail?: string | null;
  insights: SfiCinematicInsight[];
  timeline: SfiCinematicTimelineItem[];
  evidenceStats?: SfiCinematicStat[];
  mihmStats?: SfiCinematicStat[];
  frictionStats?: SfiCinematicStat[];
  regimeStats?: SfiCinematicStat[];
  returnStats?: SfiCinematicStat[];
  commandPlaceholder?: string;
  commands?: string[];
  actions?: Array<{ id: string; label: string; disabled?: boolean }>;
  onCommand?: (command: string) => void;
  onAction?: (action: string) => void;
  onNodeSelect?: (nodeId: string) => void;
  toolbar?: ReactNode;
  fieldOverlay?: ReactNode;
  footer?: ReactNode;
};

const toneLabel: Record<SfiEpistemicTone, string> = {
  OBSERVED: 'OBSERVED',
  DERIVED: 'DERIVED',
  INFERRED: 'INFERRED',
  PROJECTED: 'PROJECTED',
  SIMULATED: 'SIMULATED',
  MISSING: 'MISSING',
  CONTRADICTED: 'CONTRADICTED',
  GOVERNED: 'GOVERNED',
};

function clampStrength(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0.45;
  return Math.max(0.08, Math.min(1, value));
}

function formatTime(value: string | null | undefined) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

function nodePosition(index: number, count: number, selected: boolean) {
  if (selected) return { x: 50, y: 49 };
  const orbitIndex = index + 1;
  const angle = -Math.PI / 2 + (Math.PI * 2 * orbitIndex) / Math.max(3, count);
  const radiusX = 31 + (index % 3) * 3.5;
  const radiusY = 28 + (index % 2) * 5;
  return {
    x: 50 + Math.cos(angle) * radiusX,
    y: 49 + Math.sin(angle) * radiusY,
  };
}

function StatBlock({ title, stats, icon }: { title: string; stats: SfiCinematicStat[]; icon: ReactNode }) {
  return (
    <section className="sfi-cine__micro-panel">
      <header><span>{icon}</span><strong>{title}</strong></header>
      <div className="sfi-cine__stat-list">
        {stats.length ? stats.map((stat) => (
          <div key={`${title}:${stat.label}`} data-tone={stat.tone ?? 'GOVERNED'}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            {stat.detail ? <small>{stat.detail}</small> : null}
          </div>
        )) : <div className="sfi-cine__empty-value"><span>NO VALUE</span><strong>—</strong></div>}
      </div>
    </section>
  );
}

function RelationField({ nodes, relations, onNodeSelect }: Pick<SfiCinematicSurfaceProps, 'nodes' | 'relations' | 'onNodeSelect'>) {
  const positioned = useMemo(() => {
    const selectedIndex = nodes.findIndex((node) => node.selected);
    const ordered = selectedIndex >= 0 ? [nodes[selectedIndex], ...nodes.filter((_, index) => index !== selectedIndex)] : nodes;
    const map = new Map<string, { x: number; y: number }>();
    ordered.forEach((node, index) => map.set(node.id, nodePosition(index, ordered.length, Boolean(node.selected) || (selectedIndex < 0 && index === 0))));
    return { ordered, map };
  }, [nodes]);

  return (
    <div className="sfi-cine__relation-field">
      <div className="sfi-cine__field-grid" aria-hidden />
      <div className="sfi-cine__field-orbit sfi-cine__field-orbit--a" aria-hidden />
      <div className="sfi-cine__field-orbit sfi-cine__field-orbit--b" aria-hidden />
      <svg className="sfi-cine__relations" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <defs>
          <filter id="sfiGlow"><feGaussianBlur stdDeviation="0.55" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {relations.map((relation) => {
          const source = positioned.map.get(relation.sourceId);
          const target = positioned.map.get(relation.targetId);
          if (!source || !target) return null;
          const strength = clampStrength(relation.strength);
          const mx = (source.x + target.x) / 2;
          const my = (source.y + target.y) / 2 - 5.5;
          return (
            <g key={relation.id} data-tone={relation.tone ?? 'DERIVED'} style={{ opacity: 0.35 + strength * 0.65 }}>
              <path d={`M ${source.x} ${source.y} Q ${mx} ${my} ${target.x} ${target.y}`} filter="url(#sfiGlow)" />
              <circle cx={mx} cy={my} r={0.33 + strength * 0.32} />
            </g>
          );
        })}
      </svg>
      {positioned.ordered.map((node, index) => {
        const position = positioned.map.get(node.id)!;
        const central = Boolean(node.selected) || (!nodes.some((item) => item.selected) && index === 0);
        return (
          <button
            key={node.id}
            type="button"
            className={`sfi-cine__field-node ${central ? 'is-central' : ''}`}
            data-tone={node.tone ?? (central ? 'INFERRED' : 'OBSERVED')}
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            onClick={() => onNodeSelect?.(node.id)}
          >
            <span>{node.type}</span>
            <strong>{node.label}</strong>
            <small>{node.value ?? node.status ?? 'REGISTERED'}</small>
          </button>
        );
      })}
      {!nodes.length ? (
        <div className="sfi-cine__field-empty">
          <Orbit size={42} />
          <strong>NO OBSERVED FIELD</strong>
          <span>El campo aparecerá al existir scopes y relaciones persistidas.</span>
        </div>
      ) : null}
    </div>
  );
}

export function SfiCinematicSurface(props: SfiCinematicSurfaceProps) {
  const [command, setCommand] = useState('');
  const groupedInsights = useMemo(() => {
    const order: SfiEpistemicTone[] = ['OBSERVED', 'DERIVED', 'INFERRED', 'PROJECTED', 'SIMULATED', 'CONTRADICTED', 'MISSING', 'GOVERNED'];
    return order.map((tone) => ({ tone, items: props.insights.filter((item) => item.tone === tone) })).filter((group) => group.items.length);
  }, [props.insights]);

  function submitCommand(value: string) {
    const normalized = value.trim();
    if (!normalized) return;
    props.onCommand?.(normalized);
    setCommand('');
  }

  return (
    <div className="sfi-cine">
      <header className="sfi-cine__topbar">
        <div className="sfi-cine__brand"><Aperture /><div><strong>{props.brand ?? 'SFI STUDIO'}</strong><span>{props.subtitle ?? 'SYSTEM FRICTION INSTITUTE'}</span></div></div>
        <div className="sfi-cine__crumbs">
          {props.crumbs.map((crumb, index) => (
            <div key={`${crumb.label}:${index}`} data-tone={crumb.tone ?? 'default'}><span>{crumb.label}</span><strong>{crumb.value || '—'}</strong></div>
          ))}
        </div>
        <div className="sfi-cine__status-strip">
          <div><Clock3 /><span>TIME</span><strong>{props.timeWindow ?? 'CURRENT'}</strong></div>
          <div><ShieldCheck /><span>INTEGRITY</span><strong>{props.integrity ?? 'UNRESOLVED'}</strong></div>
          <div><FileCheck2 /><span>ARTIFACT</span><strong>{props.artifactId ?? 'NO ID'}</strong></div>
          <div><ScanLine /><span>MODE</span><strong>{props.mode ?? 'OBSERVE'}</strong></div>
        </div>
      </header>

      <main className="sfi-cine__workspace">
        <aside className="sfi-cine__left-stack">
          <StatBlock title="EVIDENCE" stats={props.evidenceStats ?? []} icon={<Eye size={14} />} />
          <StatBlock title="MIHM STATE" stats={props.mihmStats ?? []} icon={<Radar size={14} />} />
          <StatBlock title="FRICTION / EXCHANGE" stats={props.frictionStats ?? []} icon={<Waves size={14} />} />
        </aside>

        <section className="sfi-cine__field-shell">
          <header className="sfi-cine__field-header">
            <div><Waypoints size={16} /><span>ACTIVE FIELD</span><strong>{props.fieldLabel}</strong>{props.fieldDetail ? <small>{props.fieldDetail}</small> : null}</div>
            <div className="sfi-cine__field-toolbar">{props.toolbar}</div>
          </header>
          <RelationField nodes={props.nodes} relations={props.relations} onNodeSelect={props.onNodeSelect} />
          {props.fieldOverlay ? <div className="sfi-cine__field-overlay">{props.fieldOverlay}</div> : null}
          <div className="sfi-cine__lower-analytics">
            <StatBlock title="TRAJECTORY / REGIME" stats={props.regimeStats ?? []} icon={<Activity size={14} />} />
            <StatBlock title="RETURN / CERTIFICATE" stats={props.returnStats ?? []} icon={<CheckCircle2 size={14} />} />
          </div>
        </section>

        <aside className="sfi-cine__intel">
          <header><div><Bot size={17} /><span>INTELLIGENCE</span></div><small>{props.generatedAt ? formatTime(props.generatedAt) : 'LIVE CONTEXT'}</small></header>
          <div className="sfi-cine__action-row">
            {(props.actions ?? [
              { id: 'observe', label: 'OBSERVE' },
              { id: 'contrast', label: 'CONTRAST' },
              { id: 'trace', label: 'TRACE' },
              { id: 'simulate', label: 'SIMULATE' },
              { id: 'propose', label: 'PROPOSE' },
              { id: 'certify', label: 'CERTIFY' },
            ]).map((action) => (
              <button key={action.id} type="button" disabled={action.disabled} onClick={() => props.onAction?.(action.id)}>{action.label}</button>
            ))}
          </div>
          <div className="sfi-cine__insights">
            {groupedInsights.length ? groupedInsights.map((group) => (
              <section key={group.tone} data-tone={group.tone}>
                <header><span>{toneLabel[group.tone]}</span><strong>{group.items.length}</strong></header>
                {group.items.slice(0, 6).map((item) => (
                  <article key={item.id}>
                    <CircleDot size={10} />
                    <p>{item.statement}</p>
                    <small>{item.evidenceCount ? `${item.evidenceCount} refs` : ''}{item.at ? ` · ${formatTime(item.at)}` : ''}</small>
                  </article>
                ))}
              </section>
            )) : <div className="sfi-cine__intel-empty"><Sparkles size={22} /><strong>NO CURRENT ASSESSMENT</strong><span>La interfaz no reconstruye narrativamente resultados ausentes.</span></div>}
          </div>
          <div className="sfi-cine__command">
            <label htmlFor="sfi-cine-command">COMMAND</label>
            <div><input id="sfi-cine-command" value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submitCommand(command); }} placeholder={props.commandPlaceholder ?? 'Escribe una instrucción sobre el scope activo…'} /><button type="button" onClick={() => submitCommand(command)}><Braces size={15} /></button></div>
            <div className="sfi-cine__command-chips">{(props.commands ?? []).slice(0, 6).map((item) => <button key={item} type="button" onClick={() => submitCommand(item)}>{item}</button>)}</div>
          </div>
        </aside>
      </main>

      <section className="sfi-cine__timeline">
        <header><div><Clock3 size={14} /><strong>TEMPORAL CONTINUUM</strong></div><span>{props.timeline.length} EVENTS</span></header>
        <div className="sfi-cine__timeline-track">
          <i aria-hidden />
          {props.timeline.length ? props.timeline.slice(-30).map((event, index, array) => {
            const left = array.length === 1 ? 50 : 2.5 + (index / (array.length - 1)) * 95;
            return <div key={event.id} className="sfi-cine__timeline-event" data-tone={event.tone ?? 'OBSERVED'} style={{ left: `${left}%` }}><span /><strong>{event.label}</strong><small>{event.type}<br />{formatTime(event.at)}</small></div>;
          }) : <div className="sfi-cine__timeline-none">NO TEMPORAL EVENTS</div>}
        </div>
        {props.footer ? <footer>{props.footer}</footer> : null}
      </section>
    </div>
  );
}

export const SfiCinematicIcons = {
  Activity,
  Box,
  FlaskConical,
  GitCompareArrows,
  Network,
  Orbit,
  Target,
  TriangleAlert,
};
