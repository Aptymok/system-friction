'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type EntityType = 'usuario' | 'institucion' | 'organizacion' | 'empresa';
type Scenario = 'publicar' | 'decidir' | 'auditar' | 'proyectar' | 'ejecutar' | 'coordinar' | 'reorganizar' | 'presencia';

type LocalNode = {
  localNodeId: string;
  createdAt: string;
  updatedAt: string;
  puzzleSignals: Record<string, unknown>;
  declaredObjective: string;
  dailyActivity: string;
  recurrentActivity: string;
  advancementLoop: string;
  declaredEntityType: EntityType | '';
  inferredPattern: string;
  cognitiveTwinUxState: Record<string, unknown>;
  currentStep: string;
  unlockedPreviewModules: string[];
  previewUsage: {
    basalReadingsUsedToday: number;
    lastPreviewDate: string | null;
    auditBriefUsedToday: number;
    simulationBriefUsedToday: number;
  };
  paymentState: 'anonymous_local' | 'persisted';
};

const storageKey = 'sfi_local_node';

const scenarios: Array<{ id: Scenario; label: string; action: string }> = [
  { id: 'publicar', label: 'Publicar', action: 'Publicar, ajustar, dividir, retrasar o encapsular.' },
  { id: 'decidir', label: 'Decidir', action: 'Cerrar una decision minima reversible.' },
  { id: 'auditar', label: 'Auditar', action: 'Separar patron central, omision y accion correctiva.' },
  { id: 'proyectar', label: 'Proyectar', action: 'Ubicar restriccion y punto de intervencion minima.' },
  { id: 'ejecutar', label: 'Ejecutar', action: 'Definir evidencia, bloqueo y terminado.' },
  { id: 'coordinar', label: 'Coordinar', action: 'Alinear nodos, roles y siguiente comunicacion.' },
  { id: 'reorganizar', label: 'Reorganizar', action: 'Ordenar deuda operativa y secuencia de cierre.' },
  { id: 'presencia', label: 'Administrar presencia', action: 'Ajustar canales, voz y ventana de publicacion.' },
];

function createEmptyNode(): LocalNode {
  return {
    localNodeId: `SFI-LOCAL-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    puzzleSignals: {},
    declaredObjective: '',
    dailyActivity: '',
    recurrentActivity: '',
    advancementLoop: '',
    declaredEntityType: '',
    inferredPattern: 'calibracion inicial',
    cognitiveTwinUxState: {},
    currentStep: 'puzzle',
    unlockedPreviewModules: ['auditoria', 'simulacion', 'resultado', 'accion'],
    previewUsage: {
      basalReadingsUsedToday: 0,
      lastPreviewDate: null,
      auditBriefUsedToday: 0,
      simulationBriefUsedToday: 0,
    },
    paymentState: 'anonymous_local',
  };
}

function inferPattern(node: LocalNode) {
  const text = `${node.declaredObjective} ${node.dailyActivity} ${node.recurrentActivity} ${node.advancementLoop}`.toLowerCase();
  if (/public|post|red|contenido|marca|audiencia/.test(text)) return 'salida publica con friccion de coherencia';
  if (/decid|eleg|duda|pendiente/.test(text)) return 'latencia de decision';
  if (/equipo|cliente|junta|coord/.test(text)) return 'friccion inter-nodal';
  if (/archivo|documento|codigo|pdf|reporte/.test(text)) return 'auditoria de evidencia';
  return 'recurrencia operativa sin cierre';
}

function worldHourLayer() {
  const hour = new Date().getHours();
  if (hour < 6) return 'capa nocturna - baja interferencia';
  if (hour < 12) return 'capa matinal - decision breve';
  if (hour < 18) return 'capa diurna - exposicion activa';
  return 'capa vespertina - cierre y revision';
}

export function SfiLandingCalibration() {
  const router = useRouter();
  const [node, setNode] = useState<LocalNode>(() => createEmptyNode());
  const [step, setStep] = useState(0);
  const [selectedScenario, setSelectedScenario] = useState<Scenario>('auditar');
  const [startedAt] = useState(Date.now());
  const [choiceChanges, setChoiceChanges] = useState(0);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as LocalNode;
        setNode({ ...createEmptyNode(), ...parsed });
        setStep(parsed.currentStep === 'field' ? 4 : 0);
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(node));
  }, [node]);

  const pattern = useMemo(() => inferPattern(node), [node]);
  const scenario = scenarios.find((item) => item.id === selectedScenario) || scenarios[2];

  const updateNode = (patch: Partial<LocalNode>) => {
    setNode((current) => {
      const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
      next.inferredPattern = inferPattern(next);
      return next;
    });
  };

  const completePuzzle = (signal: string) => {
    updateNode({
      puzzleSignals: {
        ...node.puzzleSignals,
        firstChoice: signal,
        decisionMs: Date.now() - startedAt,
        choiceChanges,
      },
      currentStep: 'objective',
    });
    setStep(1);
  };

  const unlockField = () => {
    const today = new Date().toISOString().slice(0, 10);
    updateNode({
      currentStep: 'field',
      inferredPattern: pattern,
      cognitiveTwinUxState: {
        ...node.cognitiveTwinUxState,
        initialScenario: selectedScenario,
        initialEntityType: node.declaredEntityType,
      },
      previewUsage: {
        ...node.previewUsage,
        lastPreviewDate: today,
        basalReadingsUsedToday: node.previewUsage.lastPreviewDate === today ? node.previewUsage.basalReadingsUsedToday : 1,
      },
    });
    setStep(4);
  };

  return (
    <main className="landing-field">
      <div className="ambient" />
      <header>
        <span>SFI</span>
        <strong>{step < 4 ? 'calibracion local' : 'campo minimo observable'}</strong>
      </header>

      <section className="field-core">
        <div className="node-orbit">
          <div className="gold-node" />
          <div className="ring ring-a" />
          <div className="ring ring-b" />
          <span className="cluster c1">Auditoria</span>
          <span className="cluster c2">Simulacion</span>
          <span className="cluster c3">Resultado</span>
          <span className="cluster c4">Accion</span>
        </div>

        {step === 0 && (
          <div className="interaction">
            <p className="micro">Elige sin optimizar. El tiempo tambien calibra.</p>
            <div className="choices">
              {['actuar ahora', 'esperar una senal', 'reducir alcance'].map((item) => (
                <button key={item} onMouseEnter={() => setChoiceChanges((value) => value + 1)} onClick={() => completePuzzle(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="interaction wide">
            <p>Evitemos divergencia. Cual es el objetivo recurrente aun no alcanzado?</p>
            <textarea value={node.declaredObjective} onChange={(event) => updateNode({ declaredObjective: event.target.value })} />
            <button disabled={!node.declaredObjective.trim()} onClick={() => setStep(2)}>Continuar</button>
          </div>
        )}

        {step === 2 && (
          <div className="interaction wide">
            <p>Distingue actividad de recurrencia.</p>
            <input placeholder="Actividad diaria" value={node.dailyActivity} onChange={(event) => updateNode({ dailyActivity: event.target.value })} />
            <input placeholder="Actividad recurrente no constante" value={node.recurrentActivity} onChange={(event) => updateNode({ recurrentActivity: event.target.value })} />
            <input placeholder="Lo que reaparece cuando intentas avanzar" value={node.advancementLoop} onChange={(event) => updateNode({ advancementLoop: event.target.value })} />
            <button disabled={!node.advancementLoop.trim()} onClick={() => setStep(3)}>Continuar</button>
          </div>
        )}

        {step === 3 && (
          <div className="interaction">
            <p>Nodo inicial calibrado.</p>
            <div className="choices">
              {(['usuario', 'institucion', 'organizacion', 'empresa'] as EntityType[]).map((item) => (
                <button key={item} onClick={() => { updateNode({ declaredEntityType: item }); unlockField(); }}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="operational">
            <div className="route">Auditoria <span /> Simulacion <span /> Resultado <span /> Accion</div>
            <p className="basal">{worldHourLayer()}</p>
            <h1>{pattern}</h1>
            <p>{scenario.action}</p>
            <div className="scenario-strip">
              {scenarios.map((item) => (
                <button key={item.id} className={selectedScenario === item.id ? 'active' : ''} onClick={() => setSelectedScenario(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="bottom-command">
              <input
                aria-label="Linea de comando del campo"
                placeholder="Describe archivo, decision o accion minima"
                onFocus={() => updateNode({ currentStep: 'field' })}
              />
              <button onClick={() => router.push('/login')}>Conservar memoria</button>
            </div>
            <button className="locked" onClick={() => router.push('/login')}>
              El nodo local llego a su limite. Para conservar memoria, ejecutar acciones y activar modulos longitudinales, crea una cuenta.
            </button>
          </div>
        )}
      </section>

      <style jsx>{`
        .landing-field {
          min-height: 100vh;
          overflow: hidden;
          background: #050605;
          color: rgba(221, 216, 202, 0.82);
          font-family: var(--font-mono), "JetBrains Mono", monospace;
          position: relative;
        }
        .ambient {
          position: fixed;
          inset: 0;
          background:
            linear-gradient(rgba(200,169,81,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(80,128,116,0.03) 1px, transparent 1px),
            radial-gradient(circle at 50% 46%, rgba(200,169,81,0.16), transparent 18rem),
            radial-gradient(circle at 70% 20%, rgba(80,128,116,0.11), transparent 22rem);
          background-size: 48px 48px, 48px 48px, auto, auto;
          opacity: 0.9;
        }
        header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 3;
          height: 2.8rem;
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0 1rem;
          border-bottom: 1px solid rgba(200,169,81,0.08);
          background: rgba(5,6,5,0.68);
          backdrop-filter: blur(14px);
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 0.62rem;
        }
        header span {
          color: #c8a951;
          font-weight: 700;
        }
        header strong {
          color: rgba(221,216,202,0.42);
          font-weight: 400;
        }
        .field-core {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 5rem 1rem 2rem;
          position: relative;
          z-index: 1;
        }
        .node-orbit {
          position: absolute;
          width: min(68vw, 38rem);
          aspect-ratio: 1;
          display: grid;
          place-items: center;
          opacity: 0.92;
        }
        .gold-node {
          width: 1.2rem;
          height: 1.2rem;
          border-radius: 50%;
          background: #c8a951;
          box-shadow: 0 0 34px rgba(200,169,81,0.72);
        }
        .ring {
          position: absolute;
          border: 1px solid rgba(200,169,81,0.13);
          border-radius: 50%;
        }
        .ring-a { inset: 22%; }
        .ring-b { inset: 4%; border-color: rgba(80,128,116,0.12); }
        .cluster {
          position: absolute;
          border: 1px solid rgba(200,169,81,0.11);
          background: rgba(5,6,5,0.54);
          padding: 0.34rem 0.5rem;
          font-size: 0.52rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(221,216,202,0.46);
        }
        .c1 { top: 18%; left: 22%; }
        .c2 { top: 28%; right: 14%; }
        .c3 { bottom: 24%; right: 20%; }
        .c4 { bottom: 18%; left: 18%; }
        .interaction,
        .operational {
          position: relative;
          z-index: 2;
          width: min(42rem, calc(100vw - 2rem));
          border: 1px solid rgba(200,169,81,0.13);
          background: rgba(5,6,5,0.62);
          backdrop-filter: blur(16px);
          padding: 1rem;
        }
        .interaction {
          text-align: center;
        }
        .interaction.wide {
          text-align: left;
        }
        p, h1 {
          margin: 0;
        }
        h1 {
          margin-top: 0.55rem;
          color: rgba(200,169,81,0.86);
          font-size: clamp(1.2rem, 4vw, 2.6rem);
          font-weight: 500;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }
        .micro,
        .basal {
          color: rgba(141,187,165,0.68);
          font-size: 0.62rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        textarea,
        input {
          width: 100%;
          border: 1px solid rgba(200,169,81,0.14);
          background: rgba(0,0,0,0.34);
          color: rgba(221,216,202,0.86);
          padding: 0.8rem;
          margin-top: 0.7rem;
          font: inherit;
          outline: none;
        }
        textarea {
          min-height: 7rem;
          resize: vertical;
        }
        button {
          border: 1px solid rgba(200,169,81,0.16);
          background: rgba(200,169,81,0.06);
          color: rgba(221,216,202,0.72);
          padding: 0.65rem 0.8rem;
          font: inherit;
          font-size: 0.58rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
        }
        button:disabled {
          opacity: 0.35;
          cursor: default;
        }
        .choices,
        .scenario-strip {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 0.9rem;
        }
        .scenario-strip {
          justify-content: flex-start;
        }
        .scenario-strip button.active {
          border-color: rgba(200,169,81,0.45);
          color: #c8a951;
        }
        .route {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.45rem;
          color: rgba(221,216,202,0.46);
          font-size: 0.54rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .route span {
          width: 1.5rem;
          height: 1px;
          background: rgba(200,169,81,0.22);
        }
        .bottom-command {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 0.5rem;
          margin-top: 1rem;
        }
        .bottom-command input {
          margin: 0;
        }
        .locked {
          width: 100%;
          margin-top: 0.55rem;
          border-color: rgba(80,128,116,0.2);
          background: rgba(80,128,116,0.06);
          color: rgba(141,187,165,0.72);
          text-align: left;
          line-height: 1.5;
        }
        @media (max-width: 720px) {
          .node-orbit {
            width: 120vw;
            opacity: 0.58;
          }
          .interaction,
          .operational {
            width: calc(100vw - 1rem);
          }
          .bottom-command {
            grid-template-columns: 1fr;
          }
          .cluster {
            font-size: 0.44rem;
          }
        }
      `}</style>
    </main>
  );
}
