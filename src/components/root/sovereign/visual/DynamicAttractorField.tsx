'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { RootRow, RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import type { RootSelection } from '../sovereignTypes';

function rec(value: unknown): RootRow { return value && typeof value === 'object' && !Array.isArray(value) ? value as RootRow : {}; }
function text(value: unknown, fallback = '') { return typeof value === 'string' && value.trim() ? value.trim() : fallback; }
function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
function num(value: unknown, fallback = 0) { const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN; return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback; }
function dateValue(value: unknown) { const raw = typeof value === 'string' ? value : ''; return raw && Number.isFinite(Date.parse(raw)) ? raw : null; }
function rid(row: RootRow, fallback: string) { return text(row.id ?? row.attractor_key ?? row.ejector_key, fallback); }
function observedAt(row: RootRow) { return dateValue(row.first_seen ?? row.created_at ?? row.last_seen ?? row.updated_at); }
function lastAt(row: RootRow) { return dateValue(row.last_seen ?? row.updated_at ?? row.first_seen ?? row.created_at); }
function when(value: string | null) { return value ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'SIN FECHA'; }
function stableUnit(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return ((hash >>> 0) % 10000) / 10000;
}
function visibleAt(row: RootRow, cutoffMs: number) {
  const first = observedAt(row);
  return !first || Date.parse(first) <= cutoffMs;
}
function selectRow(kind: string, row: RootRow, source: string, title: string): RootSelection {
  return { kind, id: rid(row, kind), title, source, observedAt: lastAt(row), confidence: num(row.confidence, 0), evidenceIds: [], warning: null, data: row };
}

export function DynamicAttractorField({ state, onSelect }: { state: RootSovereignState; onSelect: (selection: RootSelection) => void }) {
  const attractors = state.amv.data.attractors;
  const ejectors = state.amv.data.ejectors;
  const memories = state.amv.data.memories;
  const timeline = useMemo(() => [...new Set([...attractors, ...ejectors, ...memories].flatMap((row) => [observedAt(row), lastAt(row)]).filter((value): value is string => Boolean(value)))].sort((a, b) => Date.parse(a) - Date.parse(b)), [attractors, ejectors, memories]);
  const [cursor, setCursor] = useState(Math.max(0, timeline.length - 1));
  const [activeId, setActiveId] = useState(() => attractors[0] ? rid(attractors[0], 'attractor') : '');
  useEffect(() => setCursor(Math.max(0, timeline.length - 1)), [timeline.length]);
  const cutoff = timeline[Math.min(cursor, Math.max(0, timeline.length - 1))] ?? state.generatedAt;
  const cutoffMs = Date.parse(cutoff);
  const visibleAttractors = attractors.filter((row) => visibleAt(row, cutoffMs));
  const visibleEjectors = ejectors.filter((row) => visibleAt(row, cutoffMs));
  const visibleMemories = memories.filter((row) => visibleAt(row, cutoffMs));

  useEffect(() => {
    if (!visibleAttractors.length) { setActiveId(''); return; }
    if (!visibleAttractors.some((row) => rid(row, 'attractor') === activeId)) {
      const strongest = [...visibleAttractors].sort((a, b) => (num(b.weight) + num(b.persistence) + num(b.trust)) - (num(a.weight) + num(a.persistence) + num(a.trust)))[0];
      setActiveId(rid(strongest, 'attractor'));
    }
  }, [visibleAttractors, activeId]);

  const active = visibleAttractors.find((row) => rid(row, 'attractor') === activeId) ?? visibleAttractors[0] ?? null;
  const vector = rec(active?.vector);
  const dimensions = strings(vector.dimensions);
  const supported = new Set(strings(vector.supportedDimensions));
  const contradicted = new Set(strings(vector.contradictedDimensions));
  const missing = new Set(strings(vector.missingDimensions));
  const confidence = num(active?.confidence);
  const persistence = num(active?.persistence);
  const trust = num(active?.trust);
  const weight = num(active?.weight);
  const fieldEnergy = (confidence + persistence + trust + weight) / 4;
  const centerX = 50 + (trust - confidence) * 9;
  const centerY = 50 + (weight - persistence) * 8;
  const phase = (cursor + 1) * 0.31 + fieldEnergy * Math.PI;

  return <div className="dynamic-attractor" onClick={(event) => event.stopPropagation()} style={{ '--field-energy': fieldEnergy, '--field-x': `${centerX}%`, '--field-y': `${centerY}%` } as CSSProperties}>
    <div className="attractor-flow-grid" />
    <div className="attractor-field-meta"><b>{visibleAttractors.length} A</b><b>{visibleEjectors.length} E</b><b>{visibleMemories.length} M</b><span>campo visual parametrizado · movimiento ≠ nueva evidencia</span></div>

    {visibleAttractors.length > 1 ? <label className="dynamic-attractor-selector"><span>ATRACTOR</span><select value={active ? rid(active, '') : ''} onChange={(event) => setActiveId(event.target.value)}>{visibleAttractors.map((row) => <option key={rid(row, 'attractor')} value={rid(row, 'attractor')}>{text(row.label ?? row.attractor_key, 'Atractor')}</option>)}</select></label> : null}

    <svg className="attractor-links" viewBox="0 0 100 100" aria-hidden="true">
      {dimensions.map((dimension, index) => {
        const angle = phase + (index / Math.max(1, dimensions.length)) * Math.PI * 2;
        const radialNoise = (stableUnit(dimension) - .5) * 6;
        const radius = 22 + (1 - confidence) * 10 + radialNoise;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        return <line key={dimension} x1={centerX} y1={centerY} x2={x} y2={y} />;
      })}
      {visibleEjectors.map((row) => {
        const id = rid(row, 'ejector');
        const angle = stableUnit(id) * Math.PI * 2 + phase * .45;
        const pressure = num(row.external_pressure ?? row.weight ?? row.decay, .2);
        const radius = 35 + pressure * 8;
        return <line className="ejector-link" key={id} x1={centerX} y1={centerY} x2={50 + Math.cos(angle) * radius} y2={50 + Math.sin(angle) * radius} />;
      })}
    </svg>

    {active ? <button className="dynamic-attractor-core" type="button" onClick={() => onSelect(selectRow('attractor', active, state.amv.source, text(active.label ?? active.attractor_key, 'Atractor')))} style={{ left: `${centerX}%`, top: `${centerY}%`, '--pulse-speed': `${Math.max(2.4, 7 - persistence * 4)}s` } as CSSProperties}>
      <i /><strong>{text(active.label ?? active.attractor_key, 'ATRACTOR')}</strong><span>{text(active.status, 'DECLARED').toUpperCase()}</span><small>C {confidence.toFixed(2)} · P {persistence.toFixed(2)} · T {trust.toFixed(2)} · W {weight.toFixed(2)}</small>
    </button> : <div className="dynamic-attractor-empty">MISSING · SIN ATRACTOR EN ESTE CORTE</div>}

    {dimensions.map((dimension, index) => {
      const angle = phase + (index / Math.max(1, dimensions.length)) * Math.PI * 2;
      const radialNoise = (stableUnit(dimension) - .5) * 6;
      const radius = 22 + (1 - confidence) * 10 + radialNoise;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const status = contradicted.has(dimension) ? 'contradicted' : supported.has(dimension) ? 'supported' : missing.has(dimension) ? 'missing' : 'declared';
      return <button type="button" className="attractor-dimension" data-state={status} key={dimension} style={{ left: `${x}%`, top: `${y}%`, '--delay': `${-stableUnit(dimension) * 5}s`, '--drift': `${3 + stableUnit(dimension) * 4}s` } as CSSProperties} title={dimension} onClick={() => active && onSelect({ ...selectRow('attractor-dimension', active, state.amv.source, dimension), id: `${rid(active, 'attractor')}:${dimension}`, data: { attractor: active, dimension, state: status, cutoff } })}><span>{index + 1}</span><small>{dimension}</small></button>;
    })}

    {visibleAttractors.filter((row) => rid(row, 'attractor') !== activeId).slice(0, 9).map((row) => {
      const id = rid(row, 'attractor');
      const angle = stableUnit(id) * Math.PI * 2 + phase * .22;
      const radius = 40 + num(row.persistence) * 5;
      return <button key={id} type="button" className="field-attractor-node" style={{ left: `${50 + Math.cos(angle) * radius}%`, top: `${50 + Math.sin(angle) * radius}%`, '--drift': `${4 + stableUnit(id) * 5}s` } as CSSProperties} onClick={() => setActiveId(id)} title={text(row.label ?? row.attractor_key, id)}>A</button>;
    })}

    {visibleEjectors.slice(0, 12).map((row) => {
      const id = rid(row, 'ejector');
      const angle = stableUnit(id) * Math.PI * 2 + phase * .45;
      const pressure = num(row.external_pressure ?? row.weight ?? row.decay, .2);
      const radius = 35 + pressure * 8;
      return <button key={id} type="button" className="field-ejector-node" style={{ left: `${50 + Math.cos(angle) * radius}%`, top: `${50 + Math.sin(angle) * radius}%`, '--drift': `${2.8 + (1 - pressure) * 4}s` } as CSSProperties} onClick={() => onSelect(selectRow('ejector', row, state.amv.source, text(row.label ?? row.ejector_key, 'Ejector')))} title={text(row.label ?? row.ejector_key, id)}>E</button>;
    })}

    <div className="attractor-timeline"><span>CAMPO t</span><input aria-label="Mover campo de atractores longitudinalmente" type="range" min={0} max={Math.max(0, timeline.length - 1)} value={Math.min(cursor, Math.max(0, timeline.length - 1))} onChange={(event) => setCursor(Number(event.target.value))} disabled={!timeline.length} /><time>{when(cutoff)}</time></div>
  </div>;
}
