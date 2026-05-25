'use client';

import { useState } from 'react';
import { visibleGraphMode, type GraphMode } from '@/observatory/laboratory/graphModes';
import type { WorldSpectCategory } from '@/observatory/worldspect/worldSpectCategories';
import { getWorldSpectCategoryConfig } from '@/observatory/worldspect/worldSpectCategories';

type Tab = 'accion' | 'estado' | 'origen';

export function AtlasCommandPanel({
  activeCluster,
  activeProcess,
  activeStep,
  graphModes,
  worldSpectCategory,
  prioritizedNodes,
  suggestedProcesses,
  viewMode,
  eventLog,
  selectedNodeLabel,
  nextAction,
  responseText,
  canPersist,
  runtimeSummary,
  onProcessSelect,
  onContinue,
}: {
  activeCluster: string;
  activeProcess?: string | null;
  activeStep: string;
  graphModes: GraphMode[];
  worldSpectCategory: WorldSpectCategory;
  prioritizedNodes: string[];
  suggestedProcesses: string[];
  viewMode: string;
  eventLog: Array<{ event: string; detail: string; at: string }>;
  selectedNodeLabel?: string | null;
  nextAction: string;
  responseText?: string | null;
  canPersist: boolean;
  runtimeSummary: string;
  onProcessSelect: (process: string) => void;
  onContinue: () => void;
}) {
  const [tab, setTab] = useState<Tab>('accion');
  const category = getWorldSpectCategoryConfig(worldSpectCategory);
  return (
    <aside className="atlas-command-panel" aria-label="Cuadro de mando contextual">
      <div className="panel-tabs">
        {(['accion', 'estado', 'origen'] as Tab[]).map((item) => (
          <button key={item} type="button" className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
      </div>

      {tab === 'accion' && (
        <div className="panel-section">
          <span className="kicker">{activeCluster}</span>
          <h2>{activeProcess || suggestedProcesses[0] || 'Siguiente accion'}</h2>
          <p>{responseText || nextAction}</p>
          {selectedNodeLabel ? <p className="selected-node">Nodo seleccionado: {selectedNodeLabel}</p> : null}
          <div className="process-list">
            {suggestedProcesses.slice(0, 4).map((process) => (
              <button key={process} type="button" onClick={() => onProcessSelect(process)}>
                {process}
              </button>
            ))}
          </div>
          <button className="primary" type="button" onClick={onContinue}>
            {canPersist ? 'Ejecutar' : 'Continuar'}
          </button>
        </div>
      )}

      {tab === 'estado' && (
        <div className="panel-section">
          <span className="kicker">Estado</span>
          <dl>
            <div><dt>Cluster</dt><dd>{activeCluster}</dd></div>
            <div><dt>Proceso</dt><dd>{activeProcess || 'sin seleccion'}</dd></div>
            <div><dt>Modo</dt><dd>{graphModes.map(visibleGraphMode).join(' / ')}</dd></div>
            <div><dt>Vista</dt><dd>{viewMode}</dd></div>
            <div><dt>Flujo</dt><dd>{activeStep}</dd></div>
            <div><dt>WorldSpect</dt><dd>{category.label}</dd></div>
          </dl>
          <p className="lens">{category.description} Recomendacion: {category.suggestedProcesses[0]}.</p>
        </div>
      )}

      {tab === 'origen' && (
        <div className="panel-section">
          <span className="kicker">Origen</span>
          <p className="trace">{runtimeSummary}</p>
          <dl>
            <div><dt>Categoria</dt><dd>{category.id}</dd></div>
            <div><dt>Modos internos</dt><dd>{graphModes.join(' / ')}</dd></div>
            <div><dt>Nodos priorizados</dt><dd>{prioritizedNodes.slice(0, 5).join(', ') || 'sin medicion'}</dd></div>
          </dl>
          <div className="event-log">
            {eventLog.slice(0, 6).map((entry) => (
              <div key={`${entry.at}-${entry.event}`}>
                <time>{entry.at}</time>
                <b>{entry.event}</b>
                <span>{entry.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .atlas-command-panel {
          position: fixed;
          right: 1rem;
          top: calc(3.7rem + env(safe-area-inset-top, 0px));
          bottom: calc(5.2rem + env(safe-area-inset-bottom, 0px));
          z-index: 26;
          width: min(24rem, 31vw);
          border-left: 1px solid rgba(200, 169, 81, 0.12);
          background: linear-gradient(180deg, rgba(12,12,10,0.74), rgba(5,5,5,0.72));
          backdrop-filter: blur(18px);
          color: rgba(216, 212, 200, 0.72);
          font-family: "JetBrains Mono", monospace;
          padding: 0.8rem;
          overflow: auto;
        }
        .panel-tabs {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.3rem;
          margin-bottom: 0.9rem;
        }
        button {
          border: 1px solid rgba(200, 169, 81, 0.12);
          background: rgba(5, 5, 5, 0.4);
          color: rgba(216, 212, 200, 0.48);
          min-height: 2rem;
          font: inherit;
          font-size: 0.5rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
        }
        button.active,
        .primary {
          border-color: rgba(200, 169, 81, 0.45);
          color: #C8A951;
          background: rgba(200, 169, 81, 0.07);
        }
        .panel-section {
          animation: atlasFade 260ms ease;
        }
        .kicker {
          display: block;
          color: rgba(200, 169, 81, 0.58);
          font-size: 0.5rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          margin-bottom: 0.7rem;
        }
        h2 {
          margin: 0 0 0.6rem;
          color: #d8d4c8;
          font-family: "Cormorant Garamond", Georgia, serif;
          font-size: clamp(1.35rem, 2vw, 2rem);
          font-weight: 500;
          line-height: 1;
        }
        p {
          margin: 0;
          color: rgba(216, 212, 200, 0.58);
          font-size: 0.72rem;
          line-height: 1.65;
        }
        .process-list {
          display: grid;
          gap: 0.38rem;
          margin: 0.9rem 0;
        }
        .process-list button {
          text-align: left;
          padding: 0 0.55rem;
        }
        .primary {
          width: 100%;
          min-height: 2.65rem;
        }
        dl {
          display: grid;
          gap: 0.5rem;
          margin: 0;
        }
        dl div {
          display: grid;
          grid-template-columns: 6rem 1fr;
          gap: 0.5rem;
          border-bottom: 1px solid rgba(200, 169, 81, 0.08);
          padding-bottom: 0.45rem;
        }
        dt {
          color: rgba(216, 212, 200, 0.32);
          font-size: 0.5rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        dd {
          margin: 0;
          color: rgba(216, 212, 200, 0.68);
          font-size: 0.58rem;
          line-height: 1.45;
        }
        .lens,
        .trace,
        .selected-node {
          margin-top: 0.85rem;
          color: rgba(110, 200, 138, 0.66);
        }
        .event-log {
          display: grid;
          gap: 0.45rem;
          margin-top: 0.9rem;
          border-top: 1px solid rgba(200, 169, 81, 0.08);
          padding-top: 0.8rem;
        }
        .event-log div {
          display: grid;
          grid-template-columns: 3.6rem 4.8rem 1fr;
          gap: 0.4rem;
          align-items: baseline;
        }
        .event-log time {
          color: rgba(216, 212, 200, 0.24);
          font-size: 0.48rem;
        }
        .event-log b {
          color: rgba(200, 169, 81, 0.48);
          font-size: 0.48rem;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .event-log span {
          color: rgba(216, 212, 200, 0.38);
          font-size: 0.52rem;
          line-height: 1.4;
        }
        @keyframes atlasFade {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: none; }
        }
        @media (max-width: 860px) {
          .atlas-command-panel {
            left: 0;
            right: 0;
            top: auto;
            bottom: calc(4.25rem + env(safe-area-inset-bottom, 0px));
            width: auto;
            max-height: 35vh;
            border-top: 1px solid rgba(200, 169, 81, 0.12);
            border-left: 0;
            padding: 0.65rem 0.75rem;
          }
          .panel-tabs {
            max-width: 22rem;
          }
          .process-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </aside>
  );
}
