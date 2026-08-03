'use client';

import type { ReactNode } from 'react';
import type { RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import type { RootViewId } from './sovereignTypes';
import './root-migrated-workspace.css';

const MODULES: Array<{ id: RootViewId; label: string; group: string }> = [
  { id: 'overview', label: 'Mapa general', group: 'OBSERVAR' },
  { id: 'cognitive-runtime', label: 'Procesos cognitivos', group: 'COMPRENDER' },
  { id: 'governance', label: 'Decisiones y permisos', group: 'CONTROLAR' },
  { id: 'agents', label: 'Agentes disponibles', group: 'EJECUTAR' },
  { id: 'predictions', label: 'Proyecciones', group: 'ANTICIPAR' },
  { id: 'amv', label: 'Atractores y desvíos', group: 'TRAYECTORIA' },
  { id: 'evidence', label: 'Evidencia y casos', group: 'MEMORIA' },
  { id: 'execution', label: 'Simular y actuar', group: 'OPERAR' },
  { id: 'telemetry', label: 'Historia y cambios', group: 'REVISAR' },
];

const TITLES: Record<RootViewId, { eyebrow: string; title: string; description: string }> = {
  overview: {
    eyebrow: 'ROOT',
    title: 'Mapa general del sistema',
    description: 'Aquí puedes ver qué partes del sistema están activas, cómo se relacionan y qué requiere atención.',
  },
  'cognitive-runtime': {
    eyebrow: 'ROOT · COMPRENDER',
    title: 'Procesos cognitivos',
    description: 'Muestra qué agentes pueden analizar una situación, cuáles están disponibles y qué les falta para trabajar.',
  },
  governance: {
    eyebrow: 'ROOT · CONTROLAR',
    title: 'Decisiones, permisos y auditoría',
    description: 'Revisa propuestas, autorizaciones, cambios realizados y el registro de quién hizo qué.',
  },
  agents: {
    eyebrow: 'ROOT · EJECUTAR',
    title: 'Agentes disponibles',
    description: 'Selecciona los agentes necesarios para investigar, comparar evidencia, evaluar riesgos o proponer acciones.',
  },
  predictions: {
    eyebrow: 'ROOT · ANTICIPAR',
    title: 'Proyecciones y resultados',
    description: 'Compara lo que se esperaba que ocurriera con lo que realmente ocurrió y observa qué aprendió el sistema.',
  },
  amv: {
    eyebrow: 'ROOT · TRAYECTORIA',
    title: 'Atractores, desvíos y dirección',
    description: 'Observa hacia dónde tiende el sistema, qué lo acerca a un objetivo y qué fuerzas lo alejan.',
  },
  evidence: {
    eyebrow: 'ROOT · MEMORIA',
    title: 'Evidencia y casos observados',
    description: 'Registra evidencia indicando qué afirmación respalda, contradice o ayuda a comprender.',
  },
  execution: {
    eyebrow: 'ROOT · OPERAR',
    title: 'Simular, probar y ejecutar',
    description: 'Revisa capacidades disponibles y ejecuta acciones sólo después de confirmar su efecto y objetivo.',
  },
  telemetry: {
    eyebrow: 'ROOT · REVISAR',
    title: 'Historia del sistema',
    description: 'Consulta eventos, cambios, trayectorias y resultados en orden temporal.',
  },
};

export function RootMigratedWorkspace({
  view,
  state,
  refreshing,
  warning,
  onChange,
  onRefresh,
  children,
}: {
  view: RootViewId;
  state: RootSovereignState;
  refreshing: boolean;
  warning: string | null;
  onChange: (view: RootViewId) => void;
  onRefresh: () => void;
  children: ReactNode;
}) {
  const title = TITLES[view];
  const observedSystems = state.system.data.matrix.filter((item) => item.state.value !== null).length;
  const activeAgents = state.agents.data.agents.filter((agent) => ['available', 'operational', 'active', 'ready'].includes(String(agent.state.value ?? agent.availability).toLowerCase())).length;

  return (
    <section className="rm-root">
      <header className="rm-header">
        <div className="rm-title">
          <span>{title.eyebrow}</span>
          <h1>{title.title}</h1>
          <p>{title.description}</p>
        </div>
        <div className="rm-state">
          <span><b>{observedSystems}/{state.system.data.matrix.length}</b>partes observadas</span>
          <span><b>{state.evidence.data.nodes.length}</b>registros de evidencia</span>
          <span><b>{state.amv.data.attractors.length}</b>atractores identificados</span>
          <span><b>{activeAgents}/{state.agents.data.agents.length}</b>agentes listos</span>
          <button type="button" onClick={onRefresh} disabled={refreshing}>{refreshing ? 'Actualizando…' : 'Actualizar información'}</button>
        </div>
      </header>

      <nav className="rm-modules" aria-label="Secciones principales de ROOT">
        {MODULES.map((module) => (
          <button
            key={module.id}
            type="button"
            className={view === module.id ? 'active' : ''}
            onClick={() => onChange(module.id)}
          >
            <span>{module.group}</span>
            <strong>{module.label}</strong>
          </button>
        ))}
      </nav>

      {warning ? <div className="rm-warning">No fue posible actualizar toda la información. Se muestra el último estado disponible. Detalle técnico: {warning}</div> : null}
      <div className="rm-canvas" aria-live="polite">{children}</div>
    </section>
  );
}
