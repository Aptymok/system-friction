'use client';

import { useMemo, useState } from 'react';
import type { IntentProfile } from '@/observatory/surface/fieldSurfaceRouter';
import { inferIntentProfile } from '@/observatory/surface/fieldSurfaceRouter';
import { resolveLaboratoryGraph } from '@/observatory/laboratory/resolveLaboratoryGraph';
import { visibleGraphMode } from '@/observatory/laboratory/graphModes';
import { applyWorldSpectLens } from '@/observatory/worldspect/applyWorldSpectLens';
import type { WorldSpectCategory } from '@/observatory/worldspect/worldSpectCategories';
import { getWorldSpectCategoryConfig } from '@/observatory/worldspect/worldSpectCategories';
import { AtlasWorldSpectStrip } from './AtlasWorldSpectStrip';
import { AtlasRadialField } from './AtlasRadialField';
import { AtlasCommandPanel } from './AtlasCommandPanel';
import { AtlasActionBar } from './AtlasActionBar';
import { AtlasProcessRail } from './AtlasProcessRail';

function clusterForCommand(command: string, fallback: string) {
  const text = command.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/saturado|no entiendo|carga/.test(text)) return 'Nodo Vivo';
  if (/publicar|pieza|post|presencia|redes/.test(text)) return 'Presencia';
  if (/audita|auditar|texto|origen|coherencia/.test(text)) return 'Auditoria';
  if (/simula|proyecta|comparar|riesgo/.test(text)) return 'Simulacion';
  if (/resultado|conclusion|sintesis/.test(text)) return 'Resultado';
  if (/accion|ejecutar|hacer|cerrar/.test(text)) return 'Accion';
  if (/recordar|pendiente|memoria/.test(text)) return 'Memoria';
  if (/mundo|hoy|contexto/.test(text)) return 'Mundo';
  if (/fecha|hora|ventana|calendario/.test(text)) return 'Ventana';
  return fallback;
}

function responseForCommand(command: string, cluster: string) {
  const text = command.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/saturado|no entiendo/.test(text)) return 'Reduzco densidad. Queda un nodo activo y una accion minima.';
  if (/audita|auditar/.test(text)) return 'Generacion bloqueada. Revisare coherencia, origen y riesgo.';
  if (/publicar|pieza|post|redes/.test(text)) return 'No publicare. Preparare revision, ventana y retorno.';
  if (/decidir|decision/.test(text)) return 'Comparo criterios y cierro una decision minima reversible.';
  if (cluster === 'Simulacion') return 'Comparo rutas sin ejecutar.';
  return 'Accion registrada en el campo local.';
}

function placeholderFor(cluster: string) {
  if (cluster === 'Auditoria') return 'Pega el texto a auditar.';
  if (cluster === 'Simulacion') return 'Describe el escenario.';
  if (cluster === 'Presencia') return 'Sube o describe la pieza.';
  if (cluster === 'Accion') return 'Define la accion.';
  if (cluster === 'Ventana') return 'Indica fecha, hora o restriccion.';
  return 'Que necesitas observar?';
}

export function AtlasLaboratoryShell({
  nodeLabel,
  intentProfile,
  localNode,
  canPersist,
  latestWorldSnapshot,
  runtimeSummary,
  nextAction,
  initialCommand,
  onCommand,
  onWorldSpectCategorySelect,
  onContinuityRequest,
}: {
  nodeLabel: string;
  intentProfile: IntentProfile;
  localNode?: Record<string, unknown> | null;
  canPersist: boolean;
  latestWorldSnapshot?: Record<string, unknown> | null;
  runtimeSummary: string;
  nextAction: string;
  initialCommand?: string;
  onCommand: (command: string) => void | Promise<void>;
  onWorldSpectCategorySelect?: (category: WorldSpectCategory, detail: Record<string, unknown>) => void;
  onContinuityRequest?: () => void;
}) {
  const [command, setCommand] = useState(initialCommand || '');
  const [activeCluster, setActiveCluster] = useState(() => clusterForCommand(initialCommand || '', 'Nodo Vivo'));
  const [activeProcess, setActiveProcess] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<WorldSpectCategory>(() => {
    const inferred = inferIntentProfile(initialCommand || '', localNode);
    return inferred === 'social_publication' ? 'cultural' : inferred === 'world_observation' ? 'factual' : 'semantic';
  });
  const [responseText, setResponseText] = useState<string | null>(null);

  const graph = useMemo(() => resolveLaboratoryGraph({
    intentProfile,
    activeCluster,
    activeProcess,
    cognitiveTwinUxState: localNode?.cognitiveTwinUxState as Record<string, unknown> | undefined,
    command,
  }), [intentProfile, activeCluster, activeProcess, localNode, command]);

  const lens = useMemo(() => applyWorldSpectLens({
    baseGraph: { nodes: graph.nodes, edges: graph.edges },
    category: activeCategory,
    worldSpectSnapshot: latestWorldSnapshot,
    intentProfile,
    cognitiveTwinUxState: localNode?.cognitiveTwinUxState as Record<string, unknown> | undefined,
  }), [graph, activeCategory, latestWorldSnapshot, intentProfile, localNode]);

  const category = getWorldSpectCategoryConfig(activeCategory);
  const graphModes = lens.graphModes.length ? lens.graphModes : graph.graphModes;
  const suggestedProcesses = lens.suggestedProcesses.length ? lens.suggestedProcesses : category.suggestedProcesses;

  const submit = async (value: string) => {
    const nextCluster = clusterForCommand(value, activeCluster);
    setCommand(value);
    setActiveCluster(nextCluster);
    setResponseText(responseForCommand(value, nextCluster));
    await onCommand(value);
  };

  const selectCategory = (categoryId: WorldSpectCategory) => {
    setActiveCategory(categoryId);
    const nextLens = applyWorldSpectLens({
      baseGraph: { nodes: graph.nodes, edges: graph.edges },
      category: categoryId,
      worldSpectSnapshot: latestWorldSnapshot,
      intentProfile,
      cognitiveTwinUxState: localNode?.cognitiveTwinUxState as Record<string, unknown> | undefined,
    });
    if (!canPersist && typeof window !== 'undefined') {
      window.localStorage.setItem('sfi_worldspect_lens', JSON.stringify({
        category: categoryId,
        selectedAt: new Date().toISOString(),
        snapshotId: latestWorldSnapshot?.id || null,
        source: 'user_selection',
      }));
    }
    onWorldSpectCategorySelect?.(categoryId, {
      category: categoryId,
      snapshotId: latestWorldSnapshot?.id || null,
      graphModes: nextLens.graphModes,
      prioritizedNodes: nextLens.prioritizedNodes,
      suggestedProcesses: nextLens.suggestedProcesses,
    });
  };

  return (
    <main className="atlas-shell">
      <AtlasWorldSpectStrip snapshot={latestWorldSnapshot} activeCategory={activeCategory} onCategorySelect={selectCategory} />
      <div className="atlas-grain" />
      <section className="atlas-field-wrap">
        <AtlasRadialField
          graph={graph}
          nodeLabel={nodeLabel || 'Nodo vivo'}
          activeCluster={activeCluster}
          activeProcess={activeProcess}
          activeWorldSpectCategory={activeCategory}
          worldSpectLensState={lens}
          onClusterSelect={(cluster) => {
            setActiveCluster(cluster);
            setActiveProcess(null);
          }}
          onProcessSelect={setActiveProcess}
        />
      </section>
      <AtlasCommandPanel
        activeCluster={activeCluster}
        activeProcess={activeProcess}
        activeStep={graph.activeStep}
        graphModes={graphModes}
        worldSpectCategory={activeCategory}
        prioritizedNodes={lens.prioritizedNodes}
        suggestedProcesses={suggestedProcesses}
        nextAction={lens.visibleReading || nextAction}
        responseText={responseText}
        canPersist={canPersist}
        runtimeSummary={runtimeSummary}
        onProcessSelect={setActiveProcess}
        onContinue={() => canPersist ? setResponseText('Accion lista para ejecucion persistente.') : onContinuityRequest?.()}
      />
      <AtlasProcessRail activeStep={graph.activeStep} />
      <AtlasActionBar
        modeLabel={visibleGraphMode(graphModes[0])}
        placeholder={placeholderFor(activeCluster)}
        suggestedProcesses={suggestedProcesses}
        onSubmit={submit}
      />
      <style jsx>{`
        .atlas-shell {
          position: fixed;
          inset: 0;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 45%, rgba(200,169,81,0.09), transparent 22rem),
            radial-gradient(circle at 70% 25%, rgba(72,170,136,0.07), transparent 26rem),
            #050505;
          color: #d8d4c8;
          font-family: "Cormorant Garamond", Georgia, serif;
        }
        .atlas-grain {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.22;
          background-image: linear-gradient(rgba(200,169,81,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(200,169,81,0.02) 1px, transparent 1px);
          background-size: 54px 54px;
        }
        .atlas-field-wrap {
          position: absolute;
          left: 0;
          top: calc(3.2rem + env(safe-area-inset-top, 0px));
          bottom: calc(5.2rem + env(safe-area-inset-bottom, 0px));
          right: min(25rem, 32vw);
          display: grid;
          place-items: center;
          min-width: 0;
        }
        @media (max-width: 860px) {
          .atlas-field-wrap {
            top: calc(5.8rem + env(safe-area-inset-top, 0px));
            right: 0;
            bottom: calc(17rem + env(safe-area-inset-bottom, 0px));
            align-items: start;
          }
        }
      `}</style>
    </main>
  );
}
