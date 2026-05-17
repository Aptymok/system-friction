'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createBrowserSupabaseClient } from '@/runtime/supabase/client';
import { useNodeStore } from '@/observatory/store/nodeStore';

type PhaseKey = 'NARTEX' | 'NAVE' | 'CRUCERO' | 'PRESBITERIO' | 'SANTUARIO' | 'AMBULATORIO';
type Regime = 'Homeostático' | 'Crítico' | 'Entrópico';
type EventName =
  | 'liturgia_session_started'
  | 'phenomenon_registered'
  | 'metrics_registered'
  | 'intervention_registered'
  | 'liturgy_closed';

type LogItem = {
  time: string;
  phase: PhaseKey | 'SISTEMA';
  event: string;
};

const phases: Array<{ key: PhaseKey; label: string; title: string }> = [
  { key: 'NARTEX', label: 'I Nártex', title: 'Umbral ritual' },
  { key: 'NAVE', label: 'II Nave', title: 'Procesión' },
  { key: 'CRUCERO', label: 'III Crucero', title: 'Intersección' },
  { key: 'PRESBITERIO', label: 'IV Presbiterio', title: 'Intervención' },
  { key: 'SANTUARIO', label: 'V Santuario', title: 'Altar métrico' },
  { key: 'AMBULATORIO', label: 'VI Ambulatorio', title: 'Memoria' },
];

const anomalyOptions = ['contradicción', 'discontinuidad', 'latencia', 'degradación', 'desacoplamiento', 'evasión operativa'];
const interventionOptions = ['lingüística', 'operacional', 'relacional', 'documental', 'procedimental'];

function makeSessionId() {
  return `SFI-${Date.now().toString(36).toUpperCase()}`;
}

function nowTime() {
  return new Date().toTimeString().split(' ')[0];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function phiClass(phi: number) {
  if (phi < 0.22) return 'crit';
  if (phi > 0.58) return 'ok';
  return 'warn';
}

function valueClass(value: number, low: number, high: number, invert = false) {
  if (invert) {
    if (value > high) return 'crit';
    if (value < low) return 'ok';
    return 'warn';
  }
  if (value > high) return 'ok';
  if (value < low) return 'crit';
  return 'warn';
}

function detectRegime(ihg: number, nti: number, ldi: number, phi: number): Regime {
  if (ldi > 1.2 && ldi > ihg * 1.5) return 'Entrópico';
  if (phi < 0.2 || (nti < 0.25 && ldi > 1.4)) return 'Entrópico';
  if (phi > 0.65 && nti > 0.55 && ldi < 0.5) return 'Homeostático';
  return 'Crítico';
}

function MetricBox({ label, value, tone, sub }: { label: string; value: string; tone: string; sub: string }) {
  return (
    <div className="ld-metric">
      <div className="ld-metric-label">{label}</div>
      <div className={`ld-metric-value ${tone}`}>{value}</div>
      <div className="ld-metric-sub">{sub}</div>
    </div>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  left,
  right,
  decimals,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  left: string;
  right: string;
  decimals: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="ld-slider-row">
      <div className="ld-slider-head">
        <span>{label}</span>
        <span>{value.toFixed(decimals)}</span>
      </div>
      <input type="range" min={min} max={max} value={value} step={step} onChange={(event) => onChange(Number(event.target.value))} />
      <div className="ld-scale">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

function Radar({ ihg, nti, ldi, phi }: { ihg: number; nti: number; ldi: number; phi: number }) {
  const radius = 80;
  const ldiNorm = clamp(ldi / 3, 0, 1);
  const phiNorm = clamp(phi, 0, 1);
  const points = `100,${100 - radius * ihg} ${100 + radius * nti},100 100,${100 + radius * ldiNorm} ${100 - radius * phiNorm},100`;

  return (
    <svg width="210" height="210" viewBox="0 0 200 200" aria-label="Radar IHG NTI LDI Phi">
      {[80, 60, 40, 20].map((r) => (
        <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="#141412" strokeWidth="1" />
      ))}
      <line x1="100" y1="20" x2="100" y2="180" stroke="#141412" strokeWidth="1" />
      <line x1="20" y1="100" x2="180" y2="100" stroke="#141412" strokeWidth="1" />
      <line x1="32.7" y1="32.7" x2="167.3" y2="167.3" stroke="#141412" strokeWidth="1" />
      <line x1="167.3" y1="32.7" x2="32.7" y2="167.3" stroke="#141412" strokeWidth="1" />
      <polygon points={points} fill="rgba(200,169,81,0.08)" stroke="rgba(200,169,81,0.5)" strokeWidth="1.5" />
      <text x="100" y="11" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#2e2e28">IHG</text>
      <text x="192" y="103" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#2e2e28">NTI</text>
      <text x="100" y="198" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#2e2e28">LDI</text>
      <text x="8" y="103" textAnchor="start" fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#2e2e28">Φ_SF</text>
    </svg>
  );
}

export function LiturgiaDiagnosticPanel() {
  const node = useNodeStore((state) => state.node);
  const nodeMetrics = useNodeStore((state) => state.metrics);
  const addNodeLog = useNodeStore((state) => state.addLog);
  const atlasRef = useRef<HTMLDivElement | null>(null);
  const panelRefs = useRef<Array<HTMLElement | null>>([]);
  const [activePhase, setActivePhase] = useState(0);
  const [sessionId] = useState(makeSessionId);
  const [timestamp, setTimestamp] = useState(() => new Date());
  const [entity, setEntity] = useState(node?.alias || node?.objective || '');
  const [sector, setSector] = useState('');
  const [role, setRole] = useState('');
  const [phenomenon, setPhenomenon] = useState('');
  const [anomalies, setAnomalies] = useState<string[]>([]);
  const [nodesRaw, setNodesRaw] = useState(node?.id ? `Nodo ${node.id}` : '');
  const [traceability, setTraceability] = useState('');
  const [risk, setRisk] = useState(5);
  const [ihg, setIhg] = useState(clamp(Number(nodeMetrics.ihg ?? node?.current_ihg ?? 0.5), 0, 1));
  const [nti, setNti] = useState(clamp(Number(nodeMetrics.nti ?? node?.current_nti ?? 0.5), 0, 1));
  const [ldi, setLdi] = useState(clamp(Number(nodeMetrics.ldi ?? node?.current_ldi ?? 0.5), 0, 3));
  const [xi, setXi] = useState(clamp(Number(nodeMetrics.divergence ?? 0.05), 0.01, 0.25));
  const [interventionType, setInterventionType] = useState<string[]>(['lingüística']);
  const [interventionNotes, setInterventionNotes] = useState('');
  const [nextObservation, setNextObservation] = useState('');
  const [followMetric, setFollowMetric] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [log, setLog] = useState<LogItem[]>([{ time: nowTime(), phase: 'SISTEMA', event: 'Protocolo DIOL-SF v2.0 inicializado.' }]);
  const [persistStatus, setPersistStatus] = useState(node?.id ? 'persistencia pendiente' : 'sin nodo activo');

  const phi = useMemo(() => (ihg * nti) / (1 + ldi) + xi, [ihg, nti, ldi, xi]);
  const regime = useMemo(() => detectRegime(ihg, nti, ldi, phi), [ihg, nti, ldi, phi]);
  const nodeChips = useMemo(() => nodesRaw.split(',').map((item) => item.trim()).filter(Boolean), [nodesRaw]);
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const persistEvent = async (eventName: EventName, payload: Record<string, unknown>) => {
    if (!node?.id) {
      setPersistStatus('sin nodo activo');
      return;
    }
    if (!supabase) {
      setPersistStatus('supabase no configurado');
      return;
    }

    const { error } = await supabase.from('cognitive_event_stream').insert({
      node_id: node.id,
      stream_type: 'liturgia_diagnostic_panel',
      event_name: eventName,
      payload: {
        sessionId,
        entity,
        sector,
        observerRole: role,
        phenomenon,
        anomalies,
        metrics: { ihg, nti, ldi, xi, phi, regime },
        ...payload,
      },
      emitted_by: 'root/liturgia-diagnostic-panel',
    });

    setPersistStatus(error ? `persistencia rechazada: ${error.message}` : 'persistido en cognitive_event_stream');
  };

  const registerLog = (phase: LogItem['phase'], event: string, eventName?: EventName, payload: Record<string, unknown> = {}) => {
    setLog((current) => [{ time: nowTime(), phase, event }, ...current].slice(0, 18));
    addNodeLog(`Liturgia ${phase}: ${event}`, 'liturgia');
    if (eventName) void persistEvent(eventName, { phase, event, ...payload });
  };

  useEffect(() => {
    const clock = window.setInterval(() => setTimestamp(new Date()), 1000);
    void persistEvent('liturgia_session_started', { startedAt: new Date().toISOString() });
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    if (!node) return;
    setEntity((current) => current || node.alias || node.objective || '');
    setNodesRaw((current) => current || `Nodo ${node.id}`);
  }, [node]);

  const gotoPanel = (index: number) => {
    panelRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  };

  const onScroll = () => {
    const container = atlasRef.current;
    if (!container) return;
    let next = 0;
    panelRefs.current.forEach((panel, index) => {
      if (!panel) return;
      const left = panel.offsetLeft - container.offsetLeft;
      if (left <= container.scrollLeft + container.clientWidth * 0.55) next = index;
    });
    setActivePhase(next);
  };

  const activateSession = () => {
    if (!entity.trim()) {
      registerLog('NARTEX', 'Umbral retenido: falta denominación del sistema.');
      return;
    }
    registerLog('NARTEX', `Umbral atravesado · Entidad: ${entity.trim()}`, 'liturgia_session_started', { activated: true });
    gotoPanel(1);
  };

  const toggleValue = (value: string, setter: (next: string[]) => void, list: string[]) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const registerPhenomenon = () => {
    registerLog('NAVE', 'Fenómeno registrado.', 'phenomenon_registered', { traceability, risk, nodes: nodeChips });
    gotoPanel(2);
  };

  const registerMetrics = () => {
    registerLog('CRUCERO', `Φ_SF=${phi.toFixed(3)} · Régimen=${regime}`, 'metrics_registered');
    gotoPanel(3);
  };

  const registerIntervention = () => {
    registerLog('PRESBITERIO', 'Intervención registrada.', 'intervention_registered', {
      interventionType,
      interventionNotes,
    });
  };

  const closeLiturgy = () => {
    registerLog('AMBULATORIO', 'Liturgia cerrada.', 'liturgy_closed', {
      nextObservation,
      followMetric,
      closeNotes,
    });
  };

  const exportSession = () => {
    const lines = [
      'SYSTEM FRICTION INSTITUTE - DIOL-SF v2.0',
      `Sesion: ${sessionId}`,
      `Timestamp: ${timestamp.toISOString()}`,
      `Nodo: ${node?.id ?? 'sin nodo activo'}`,
      `Entidad: ${entity || '-'}`,
      `Sector: ${sector || '-'}`,
      `Rol observador: ${role || '-'}`,
      '',
      'VARIABLES',
      `IHG: ${ihg.toFixed(2)}`,
      `NTI_obs: ${nti.toFixed(2)}`,
      `LDI: ${ldi.toFixed(2)}`,
      `xi: ${xi.toFixed(3)}`,
      `Phi_SF: ${phi.toFixed(3)}`,
      `Regimen: ${regime}`,
      '',
      'FENOMENO',
      phenomenon || '-',
      '',
      'ANOMALIAS',
      anomalies.join(', ') || '-',
      '',
      'BITACORA',
      ...log.map((item) => `[${item.time}] ${item.phase}: ${item.event}`),
      '',
      'CIERRE',
      closeNotes || '-',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${sessionId}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    registerLog('AMBULATORIO', 'Registro exportado.');
  };

  const contextLine = `${entity || '—'} · Φ_SF ${phi.toFixed(3)} · ${regime} · ${node?.id ? `nodo ${node.id.slice(0, 8)}` : 'sin nodo activo'}`;
  const scenarioA = (ihg * nti) / (1 + clamp(ldi + 0.5, 0, 3)) + xi;
  const scenarioB = (ihg * clamp(nti + 0.2, 0, 1)) / (1 + ldi) + xi;
  const scenarioC = (clamp(ihg + 0.2, 0, 1) * nti) / (1 + ldi) + xi;

  return (
    <section className="ld-root" aria-label="Liturgia Diagnóstica DIOL-SF v2.0">
      <nav className="ld-nav">
        <div className="ld-brand">SFI · DIOL-SF</div>
        <div className="ld-phases">
          {phases.map((phase, index) => (
            <button
              key={phase.key}
              type="button"
              className={`ld-phase ${activePhase === index ? 'active' : ''} ${activePhase > index ? 'visited' : ''}`}
              onClick={() => gotoPanel(index)}
            >
              <span className="ld-dot" />
              <span>{phase.label}</span>
            </button>
          ))}
        </div>
        <div className="ld-clock">{timestamp.toLocaleString('es-MX')}</div>
      </nav>

      <div className="ld-atlas" ref={atlasRef} onScroll={onScroll}>
        <section className="ld-panel p-nartex" ref={(panel) => { panelRefs.current[0] = panel; }}>
          <p className="ld-kicker">Sistema de Observación Friccional</p>
          <p className="ld-chamber">I · Nártex · Umbral ritual</p>
          <h2>EL<br />UMBRAL</h2>
          <p className="ld-subtitle">Antes de observar un sistema, el sistema comienza a observarte.</p>
          <div className="ld-divider" />
          <div className="ld-formula">
            <span>DIOL-SF v2.0</span> · Protocolo de Diagnóstico, Intervención y Observación Longitudinal<br />
            Estado: <span>ACTIVO</span> · Sesión: <span>{sessionId}</span><br />
            Persistencia: <span>{persistStatus}</span>
          </div>
          <div className="ld-gate">
            <div className="ld-symbol">⬡ ◈ ⬡</div>
            <label>Denominación del sistema observado</label>
            <input value={entity} onChange={(event) => setEntity(event.target.value)} placeholder="Nombre de organización, sistema o nodo" />
            <div className="ld-two">
              <label>Sector operacional
                <select value={sector} onChange={(event) => setSector(event.target.value)}>
                  <option value="">— Seleccionar —</option>
                  <option value="manufactura">Manufactura / Producción</option>
                  <option value="institucional">Institucional / Gubernamental</option>
                  <option value="servicios">Servicios / Consultoría</option>
                  <option value="educativo">Educativo / Académico</option>
                  <option value="tecnologia">Tecnología / Digital</option>
                  <option value="otro">Otro</option>
                </select>
              </label>
              <label>Rol del observador
                <select value={role} onChange={(event) => setRole(event.target.value)}>
                  <option value="">— Seleccionar —</option>
                  <option value="interno">Observador interno</option>
                  <option value="externo">Consultor externo</option>
                  <option value="auditor">Auditor independiente</option>
                  <option value="arquitecto">Arquitecto del sistema</option>
                </select>
              </label>
            </div>
            <button type="button" onClick={activateSession}>◆ Atravesar el umbral</button>
          </div>
          <p className="ld-axiom">Un sistema no comienza a fallar cuando algo colapsa. Comienza cuando una anomalía es observada, nombrada, pero no registrada estructuralmente.</p>
        </section>

        <section className="ld-panel p-nave" ref={(panel) => { panelRefs.current[1] = panel; }}>
          <p className="ld-kicker">DIOL-SF · Fase 1</p>
          <p className="ld-chamber">II · Nave · Procesión</p>
          <h2>IDENTIFICACIÓN<br />DEL FENÓMENO</h2>
          <p className="ld-subtitle">La anomalía existe antes de ser nombrada.</p>
          <div className="ld-divider" />
          <label>Fenómeno observado
            <textarea value={phenomenon} onChange={(event) => setPhenomenon(event.target.value)} placeholder="Contradicción, discontinuidad, latencia, degradación de coherencia..." />
          </label>
          <p className="ld-label">Tipo de anomalía detectada</p>
          <div className="ld-tags">
            {anomalyOptions.map((item) => (
              <button key={item} type="button" className={anomalies.includes(item) ? 'sel' : ''} onClick={() => toggleValue(item, setAnomalies, anomalies)}>{item}</button>
            ))}
          </div>
          <div className="ld-two">
            <label>Inicio del período<input type="date" /></label>
            <label>Fin del período<input type="date" /></label>
          </div>
          <label>Nodos involucrados
            <input value={nodesRaw} onChange={(event) => setNodesRaw(event.target.value)} placeholder="Dirección, Operaciones, RRHH..." />
          </label>
          <div className="ld-chips">{nodeChips.map((chip) => <span key={chip}>{chip}</span>)}</div>
          <label>Trazabilidad documental
            <select value={traceability} onChange={(event) => setTraceability(event.target.value)}>
              <option value="">— Seleccionar —</option>
              <option value="alto">Alto — evidencia documentada y verificable</option>
              <option value="medio">Medio — evidencia parcial o fragmentada</option>
              <option value="bajo">Bajo — evidencia observacional sin respaldo</option>
              <option value="nulo">Nulo — sin trazabilidad disponible</option>
            </select>
          </label>
          <SliderControl label="Proyección de riesgo inicial" value={risk} min={0} max={10} step={0.1} left="mínimo" right="crítico" decimals={1} onChange={setRisk} />
          <div className="ld-formula">La fricción emerge cuando <span>ℐ(t) ≠ ε(t)</span>. Intención declarada ≠ Ejecución observable.</div>
          <button type="button" onClick={registerPhenomenon}>→ Registrar fenómeno</button>
        </section>

        <section className="ld-panel p-crucero" ref={(panel) => { panelRefs.current[2] = panel; }}>
          <p className="ld-kicker">DIOL-SF · Fase 2 + Fase 3</p>
          <p className="ld-chamber">III · Crucero · Intersección sagrada</p>
          <h2>VARIABLES<br />MAESTRAS</h2>
          <p className="ld-subtitle">Aquí convergen todos los vectores del sistema.</p>
          <div className="ld-divider" />
          <SliderControl label="IHG — Índice Homeostático de Gobernanza" value={ihg} min={0} max={1} step={0.01} left="fragmentación" right="cohesión" decimals={2} onChange={setIhg} />
          <SliderControl label="NTI_obs — Trazabilidad Observable" value={nti} min={0} max={1} step={0.01} left="opaco" right="trazable" decimals={2} onChange={setNti} />
          <SliderControl label="LDI — Longitudinal Decay Index" value={ldi} min={0} max={3} step={0.01} left="estable" right="colapso" decimals={2} onChange={setLdi} />
          <SliderControl label="ξ — Ruido residual del sistema" value={xi} min={0.01} max={0.25} step={0.005} left="mínimo" right="alto" decimals={3} onChange={setXi} />
          <div className="ld-phi">
            <p>Φ_SF — Fricción Sistémica Integrada</p>
            <strong className={phiClass(phi)}>{phi.toFixed(3)}</strong>
            <small>Φ_SF = (IHG · NTI_obs) / (1 + LDI) + ξ</small>
            <span className={`ld-regime ${regime}`}>{regime}</span>
          </div>
          <div className="ld-metrics">
            <MetricBox label="IHG" value={ihg.toFixed(2)} tone={valueClass(ihg, 0.3, 0.6)} sub="Cohesión gobernanza" />
            <MetricBox label="NTI" value={nti.toFixed(2)} tone={valueClass(nti, 0.3, 0.6)} sub="Trazabilidad" />
            <MetricBox label="LDI" value={ldi.toFixed(2)} tone={valueClass(ldi, 0.5, 1.5, true)} sub="Disipación longitudinal" />
            <MetricBox label="ξ" value={xi.toFixed(3)} tone="neutral" sub="Ruido residual" />
          </div>
          <button type="button" onClick={registerMetrics}>→ Registrar lectura métrica</button>
        </section>

        <section className="ld-panel p-presbiterio" ref={(panel) => { panelRefs.current[3] = panel; }}>
          <p className="ld-kicker">DIOL-SF · Fase 4</p>
          <p className="ld-chamber">IV · Presbiterio · Campo cognitivo</p>
          <h2>INTERVENCIÓN<br />SISTÉMICA</h2>
          <p className="ld-subtitle">Solo el sistema que sabe escuchar puede intervenir.</p>
          <div className="ld-divider" />
          <div className="ld-context">{contextLine}<br />Anomalías: {anomalies.join(', ') || '—'} · IHG {ihg.toFixed(2)} · LDI {ldi.toFixed(2)}</div>
          <div className="ld-chat">
            <div className="ld-chat-head">◆ AMV-SFI · Agente de Observación Friccional <span>NO CONECTADO</span></div>
            <p>AMV no conectado. No se invoca Anthropic desde navegador y no existe endpoint interno compatible de conversación diagnóstica.</p>
          </div>
          <p className="ld-label">Tipo de intervención</p>
          <div className="ld-tags">
            {interventionOptions.map((item) => (
              <button key={item} type="button" className={interventionType.includes(item) ? 'sel' : ''} onClick={() => toggleValue(item, setInterventionType, interventionType)}>{item}</button>
            ))}
          </div>
          <label>Notas de intervención
            <textarea value={interventionNotes} onChange={(event) => setInterventionNotes(event.target.value)} placeholder="Registrar reorganización propuesta..." />
          </label>
          <button type="button" onClick={registerIntervention}>→ Registrar intervención</button>
        </section>

        <section className="ld-panel p-santuario" ref={(panel) => { panelRefs.current[4] = panel; }}>
          <p className="ld-kicker">DIOL-SF · Revelación</p>
          <p className="ld-chamber">V · Santuario · El Altar</p>
          <h2>TOPOGRAFÍA<br />DE FRICCIÓN</h2>
          <p className="ld-subtitle">La fricción tiene geometría. Aquí se hace visible.</p>
          <div className="ld-divider" />
          <div className="ld-phi">
            <p>Sistema observado</p>
            <small>{entity || '—'}</small>
            <strong className={phiClass(phi)}>{phi.toFixed(3)}</strong>
            <span className={`ld-regime ${regime}`}>{regime}</span>
          </div>
          <div className="ld-radar"><Radar ihg={ihg} nti={nti} ldi={ldi} phi={phi} /></div>
          <div className="ld-vectors">
            <p><span>IHG — Cohesión Gobernanza</span><b className={valueClass(ihg, 0.3, 0.6)}>{ihg.toFixed(2)}</b></p>
            <p><span>NTI_obs — Trazabilidad</span><b className={valueClass(nti, 0.3, 0.6)}>{nti.toFixed(2)}</b></p>
            <p><span>LDI — Disipación</span><b className={valueClass(ldi, 0.5, 1.5, true)}>{ldi.toFixed(2)}</b></p>
            <p><span>ξ — Ruido residual</span><b>{xi.toFixed(3)}</b></p>
            <p><span>Φ_SF — Fricción integrada</span><b className={phiClass(phi)}>{phi.toFixed(3)}</b></p>
          </div>
          <div className="ld-three">
            <MetricBox label="Si LDI +0.5" value={scenarioA.toFixed(3)} tone={scenarioA < phi ? 'crit' : 'warn'} sub="↑ disipación" />
            <MetricBox label="Si NTI +0.2" value={scenarioB.toFixed(3)} tone={scenarioB > phi ? 'ok' : 'warn'} sub="↑ trazabilidad" />
            <MetricBox label="Si IHG +0.2" value={scenarioC.toFixed(3)} tone={scenarioC > phi ? 'ok' : 'warn'} sub="↑ cohesión" />
          </div>
        </section>

        <section className="ld-panel p-ambulatorio" ref={(panel) => { panelRefs.current[5] = panel; }}>
          <p className="ld-kicker">DIOL-SF · Fase 5</p>
          <p className="ld-chamber">VI · Ambulatorio · Registro longitudinal</p>
          <h2>OBSERVACIÓN<br />LONGITUDINAL</h2>
          <p className="ld-subtitle">El sistema no termina. Se acumula.</p>
          <div className="ld-formula">
            Sesión: <span>{sessionId}</span> · Nodo: <span>{node?.id ?? 'sin nodo activo'}</span><br />
            Sistema: <span>{entity || '—'}</span> · Régimen: <span>{regime}</span><br />
            Φ_SF: <span>{phi.toFixed(3)}</span> · Anomalías: <span>{anomalies.join(', ') || '—'}</span>
          </div>
          <div className="ld-log">
            {log.map((item, index) => (
              <div key={`${item.time}-${index}`}>
                <time>{item.time}</time>
                <p><span>[{item.phase}]</span>{item.event}</p>
              </div>
            ))}
          </div>
          <div className="ld-two">
            <label>Próxima observación<input type="date" value={nextObservation} onChange={(event) => setNextObservation(event.target.value)} /></label>
            <label>Métrica de seguimiento
              <select value={followMetric} onChange={(event) => setFollowMetric(event.target.value)}>
                <option value="">— Seleccionar —</option>
                <option value="ihg">IHG — Cohesión</option>
                <option value="ldi">LDI — Disipación</option>
                <option value="nti">NTI — Trazabilidad</option>
                <option value="phi">Φ_SF — Fricción total</option>
              </select>
            </label>
          </div>
          <label>Observaciones de cierre
            <textarea value={closeNotes} onChange={(event) => setCloseNotes(event.target.value)} placeholder="Condición actual, vectores de riesgo, acciones pendientes..." />
          </label>
          <div className="ld-actions">
            <button type="button" onClick={exportSession}>↓ Exportar registro</button>
            <button type="button" onClick={closeLiturgy}>◈ Cerrar liturgia</button>
            <button type="button" onClick={() => window.print()}>⎙ Imprimir</button>
          </div>
          <div className="ld-close">{regime === 'Homeostático' ? 'Régimen homeostático activo. La fricción se mantiene en rango operable.' : regime === 'Entrópico' ? 'Disipación supera la capacidad homeostática actual. Se identifican vectores de degradación longitudinal.' : 'Sistema converge hacia zona de transición. La coherencia operativa aún no se estabiliza.'}</div>
        </section>
      </div>

      <div className="ld-scroll">← desplazar · procesar →</div>

      <style jsx>{`
        .ld-root {
          position: relative;
          height: calc(100vh - 4.25rem);
          min-height: 720px;
          overflow: hidden;
          background: #060605;
          color: #c8c4b8;
          border-top: 1px solid rgba(200,169,81,0.08);
          font-family: var(--font-serif), Georgia, serif;
        }
        .ld-nav {
          position: sticky;
          top: 0;
          z-index: 20;
          height: 2.4rem;
          display: flex;
          background: rgba(6,6,5,0.97);
          border-bottom: 1px solid rgba(200,169,81,0.08);
        }
        .ld-brand, .ld-clock, .ld-phase {
          font-family: var(--font-mono), monospace;
          font-size: 0.42rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }
        .ld-brand, .ld-clock {
          display: flex;
          align-items: center;
          padding: 0 1.2rem;
          color: #C8A951;
          white-space: nowrap;
        }
        .ld-brand { border-right: 1px solid rgba(200,169,81,0.08); }
        .ld-clock { border-left: 1px solid rgba(200,169,81,0.08); color: #2e2e2a; }
        .ld-phases { display: flex; flex: 1; min-width: 0; }
        .ld-phase {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          border: 0;
          border-right: 1px solid rgba(200,169,81,0.06);
          background: transparent;
          color: #2e2e2a;
          cursor: pointer;
        }
        .ld-phase.active { color: #C8A951; background: rgba(200,169,81,0.04); }
        .ld-phase.visited { color: #5c5c52; }
        .ld-dot {
          width: 5px;
          height: 5px;
          border-radius: 999px;
          border: 1px solid #2e2e2a;
        }
        .active .ld-dot { background: #C8A951; border-color: #C8A951; }
        .visited .ld-dot { background: rgba(200,169,81,0.15); border-color: rgba(200,169,81,0.35); }
        .ld-atlas {
          display: flex;
          height: calc(100% - 2.4rem);
          overflow-x: auto;
          overflow-y: hidden;
          scroll-behavior: smooth;
          scroll-snap-type: x mandatory;
        }
        .ld-atlas::-webkit-scrollbar { height: 2px; }
        .ld-atlas::-webkit-scrollbar-track { background: #0a0a09; }
        .ld-atlas::-webkit-scrollbar-thumb { background: rgba(200,169,81,0.3); }
        .ld-panel {
          width: 22cm;
          min-width: min(22cm, 90vw);
          height: 100%;
          padding: 2rem;
          overflow-y: auto;
          scroll-snap-align: start;
          border-right: 1px solid rgba(200,169,81,0.06);
          background: #0a0a09;
        }
        .p-nartex { background: #050504; background-image: radial-gradient(ellipse 60% 40% at 50% 100%, rgba(200,169,81,0.025), transparent 70%), repeating-linear-gradient(90deg, transparent, transparent 3.9rem, rgba(200,169,81,0.015) 4rem); }
        .p-nave { background: #070706; background-image: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(200,169,81,0.02), transparent 70%), repeating-linear-gradient(90deg, transparent, transparent 2.9rem, rgba(200,169,81,0.02) 3rem); }
        .p-crucero { background: #090908; background-image: radial-gradient(ellipse 60% 60% at 50% 50%, rgba(200,169,81,0.04), transparent 70%); }
        .p-presbiterio { background: #0a0a09; background-image: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(200,169,81,0.05), transparent 60%); }
        .p-santuario { background: #0c0b0a; background-image: radial-gradient(ellipse 70% 70% at 50% 30%, rgba(200,169,81,0.07), transparent 70%); }
        .p-ambulatorio { background: #080807; background-image: radial-gradient(ellipse 60% 40% at 50% 0%, rgba(200,169,81,0.025), transparent 70%); }
        .ld-kicker, .ld-chamber, .ld-label, label, .ld-slider-head, .ld-scale, .ld-metric-label, .ld-metric-sub, .ld-formula, .ld-context, .ld-chat, .ld-log, .ld-actions button, .ld-close, .ld-scroll {
          font-family: var(--font-mono), monospace;
        }
        .ld-kicker { font-size: 0.48rem; letter-spacing: 0.35em; text-transform: uppercase; color: #C8A951; opacity: 0.55; }
        .ld-chamber { margin: 0.25rem 0 0.7rem; font-size: 0.42rem; letter-spacing: 0.22em; text-transform: uppercase; color: #2e2e2a; }
        h2 {
          margin: 0;
          font-family: var(--font-display), Syncopate, sans-serif;
          color: #C8A951;
          font-size: 1.45rem;
          line-height: 0.92;
          letter-spacing: 0;
        }
        .ld-subtitle {
          margin: 0.35rem 0 1rem;
          color: #5c5c52;
          font-style: italic;
          font-size: 0.82rem;
          line-height: 1.45;
        }
        .ld-divider { height: 1px; margin: 0.8rem 0; background: linear-gradient(to right, transparent, rgba(200,169,81,0.15), transparent); }
        .ld-formula, .ld-context {
          margin: 0.7rem 0;
          padding: 0.75rem 0.9rem;
          border-left: 1px solid rgba(200,169,81,0.25);
          background: rgba(200,169,81,0.04);
          color: #5c5c52;
          font-size: 0.56rem;
          line-height: 1.7;
        }
        .ld-formula span, .ld-context span { color: #C8A951; }
        .ld-gate, .ld-phi, .ld-chat, .ld-close {
          border: 1px solid rgba(200,169,81,0.08);
          background: rgba(0,0,0,0.3);
          padding: 1rem;
        }
        .ld-symbol { text-align: center; color: rgba(200,169,81,0.12); font-family: var(--font-mono), monospace; font-size: 1.8rem; }
        label, .ld-label {
          display: block;
          margin: 0.65rem 0 0.3rem;
          color: #5c5c52;
          font-size: 0.46rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        input, textarea, select {
          width: 100%;
          margin-top: 0.3rem;
          border: 0;
          border-bottom: 1px solid #1c1c1a;
          background: rgba(0,0,0,0.25);
          color: #c8c4b8;
          padding: 0.5rem 0.6rem;
          font-family: var(--font-mono), monospace;
          font-size: 0.6rem;
          outline: none;
        }
        textarea { min-height: 82px; resize: vertical; line-height: 1.5; }
        input:focus, textarea:focus, select:focus { border-bottom-color: rgba(200,169,81,0.45); background: rgba(200,169,81,0.03); }
        button {
          border: 1px solid rgba(200,169,81,0.25);
          background: rgba(200,169,81,0.04);
          color: #C8A951;
          cursor: pointer;
          font-family: var(--font-mono), monospace;
          font-size: 0.46rem;
          letter-spacing: 0.18em;
          padding: 0.5rem 0.9rem;
          text-transform: uppercase;
        }
        button:hover { background: rgba(200,169,81,0.08); border-color: rgba(200,169,81,0.45); }
        .ld-two { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem; }
        .ld-three, .ld-metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem; margin: 0.7rem 0; }
        .ld-tags { display: flex; flex-wrap: wrap; gap: 0.35rem; margin: 0.4rem 0; }
        .ld-tags button { color: #5c5c52; border-color: #1a1a18; background: transparent; }
        .ld-tags button.sel { color: #C8A951; border-color: rgba(200,169,81,0.35); background: rgba(200,169,81,0.03); }
        .ld-chips { min-height: 1.6rem; margin: 0.3rem 0; }
        .ld-chips span { display: inline-block; margin: 0.15rem; border: 1px solid #181816; color: #5c5c52; padding: 0.12rem 0.4rem; font-family: var(--font-mono), monospace; font-size: 0.4rem; }
        .ld-slider-row { margin-bottom: 0.9rem; }
        .ld-slider-head { display: flex; justify-content: space-between; color: #5c5c52; font-size: 0.5rem; }
        .ld-slider-head span:last-child { color: #C8A951; }
        input[type='range'] { height: 1px; padding: 0; accent-color: #C8A951; }
        .ld-scale { display: flex; justify-content: space-between; color: #2e2e2a; font-size: 0.36rem; margin-top: 0.2rem; }
        .ld-phi { text-align: center; margin: 0.8rem 0; }
        .ld-phi p { color: #2e2e2a; font-family: var(--font-mono), monospace; font-size: 0.44rem; letter-spacing: 0.3em; text-transform: uppercase; }
        .ld-phi strong { display: block; font-family: var(--font-mono), monospace; font-size: 2.8rem; font-weight: 300; line-height: 1; }
        .ld-phi small { display: block; color: #5c5c52; font-family: var(--font-mono), monospace; font-size: 0.5rem; }
        .ok { color: #3a8a5a; }
        .warn { color: #C8A951; }
        .crit { color: #b85050; }
        .neutral { color: #5c5c52; }
        .ld-regime { display: inline-block; margin-top: 0.5rem; border: 1px solid currentColor; padding: 0.25rem 0.7rem; font-family: var(--font-mono), monospace; font-size: 0.44rem; letter-spacing: 0.22em; text-transform: uppercase; }
        .ld-regime.Homeostático { color: #3a8a5a; }
        .ld-regime.Crítico { color: #C8A951; }
        .ld-regime.Entrópico { color: #b85050; }
        .ld-metric { position: relative; overflow: hidden; border: 1px solid rgba(200,169,81,0.08); background: rgba(0,0,0,0.2); padding: 0.65rem 0.75rem; }
        .ld-metric::before { content: ''; position: absolute; inset: 0 0 auto; height: 1px; background: rgba(200,169,81,0.2); }
        .ld-metric-label { color: #2e2e2a; font-size: 0.42rem; letter-spacing: 0.18em; }
        .ld-metric-value { font-family: var(--font-mono), monospace; font-size: 1.35rem; font-weight: 300; }
        .ld-metric-sub { color: #2e2e2a; font-size: 0.38rem; }
        .ld-chat { min-height: 180px; color: #5c5c52; font-size: 0.56rem; line-height: 1.65; }
        .ld-chat-head { display: flex; justify-content: space-between; border-bottom: 1px solid rgba(200,169,81,0.07); padding-bottom: 0.5rem; color: #2e2e2a; letter-spacing: 0.18em; }
        .ld-chat-head span { color: #b85050; }
        .ld-radar { display: flex; justify-content: center; margin: 0.6rem 0; }
        .ld-vectors p { display: flex; justify-content: space-between; border-bottom: 1px solid #0e0e0c; margin: 0; padding: 0.38rem 0; font-family: var(--font-mono), monospace; font-size: 0.5rem; color: #5c5c52; }
        .ld-log { margin: 0.7rem 0; }
        .ld-log div { display: flex; gap: 0.7rem; border-bottom: 1px solid #0e0e0c; padding: 0.35rem 0; }
        .ld-log time { min-width: 4rem; color: rgba(200,169,81,0.4); font-family: var(--font-mono), monospace; font-size: 0.44rem; }
        .ld-log p { margin: 0; color: #5c5c52; font-family: var(--font-mono), monospace; font-size: 0.44rem; line-height: 1.5; }
        .ld-log span { color: #C8A951; margin-right: 0.3rem; }
        .ld-actions { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0.7rem 0; }
        .ld-close { color: #5c5c52; text-align: center; font-size: 0.5rem; line-height: 1.8; }
        .ld-axiom { color: #5c5c52; font-style: italic; line-height: 1.6; text-align: center; }
        .ld-scroll { position: absolute; right: 1.2rem; bottom: 0.7rem; color: #2e2e2a; font-size: 0.38rem; letter-spacing: 0.25em; text-transform: uppercase; pointer-events: none; }
        @media (max-width: 900px) {
          .ld-root { min-height: 660px; }
          .ld-brand, .ld-clock { display: none; }
          .ld-phase span:last-child { display: none; }
          .ld-panel { min-width: 90vw; padding: 1.4rem; }
          .ld-two, .ld-three, .ld-metrics { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
}
