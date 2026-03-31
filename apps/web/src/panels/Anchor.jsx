// AnchorPanel.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================
// Configuración
// ============================================================
const BACKEND = import.meta.env.VITE_SF_BACKEND_URL || 'https://scorefriction-production.up.railway.app';
const POLL_MS = 3000;

// ============================================================
// Herramientas
// ============================================================
const TOOLS = [
  { id: 'gavel',   label: 'MAZO',    hz: 333, fx: 'colapsa',   delta: { nti: -0.06, ihg: 0.08 } },
  { id: 'chisel',  label: 'CINCEL',  hz: 852, fx: 'narrativa', delta: { r: 0.05, cff: 0.05 } },
  { id: 'compass', label: 'COMPÁS',  hz: 432, fx: 'recalibra', delta: { nti: 0.03, r: 0.02 } },
  { id: 'level',   label: 'NIVEL',   hz: 963, fx: 'nivela',    delta: { nti: 0.04, r: 0.03 } },
  { id: 'square',  label: 'ESCUADRA', hz: 528, fx: 'estructura', delta: { ihg: 0.05 } },
  { id: 'mallet',  label: 'MALLET',  hz: 741, fx: 'resonancia', delta: { cff: 0.08 } },
  { id: 'ruler',   label: 'REGLA',   hz: 111, fx: 'medición',  delta: null },
  { id: 'trowel',  label: 'LLANA',   hz: 222, fx: 'cementa',   delta: null, pm: 'task_done' },
  { id: 'plumb',   label: 'PLOMADA', hz: 639, fx: 'alinea',    delta: null, health: true },
  { id: 'maestra', label: 'MAESTRA', hz: 444, fx: 'orquesta',  delta: null, tick: true },
];

// ============================================================
// Reglas
// ============================================================
const RULES = [
  { id: 'r1', cond: 'NTI > 0.6',   action: 'API · bifurcación → /predict',
    test: s => s.nti > 0.6,
    exec: s => apiPredict({ nti: -0.04 }, `bifurcacion_NTI${s.nti.toFixed(3)}`) },
  { id: 'r2', cond: 'NTI > 0.8',   action: 'API · colapso crítico → /predict',
    test: s => s.nti > 0.8,
    exec: s => apiPredict({ nti: -0.08, r: -0.05 }, `colapso_NTI${s.nti.toFixed(3)}`) },
  { id: 'r3', cond: 'TOOL = gavel', action: 'API · forzar decisión → /predict',
    test: s => s.activeTool === 'gavel',
    exec: s => apiPredict({ nti: -0.06, ihg: 0.08 }, 'gavel_colapso_decision') },
  { id: 'r4', cond: 'TOOL = chisel', action: 'API · narrativa → /predict',
    test: s => s.activeTool === 'chisel',
    exec: s => apiPredict({ r: 0.05, cff: 0.05 }, 'chisel_narrativa') },
  { id: 'r5', cond: 'REAL < MIHM−0.3', action: 'API · desfase → /predict',
    test: s => s.sensorIn < s.mihm - 0.3,
    exec: s => apiPredict({ ihg: -0.03 }, `desfase_d${(s.mihm - s.sensorIn).toFixed(3)}`) },
  { id: 'r6', cond: 'REAL ≥ MIHM',  action: 'API · coherencia → /pm/event',
    test: s => s.sensorIn >= s.mihm && s.mihm > 0,
    exec: s => apiPmEvent('task_done', 'coherencia_verificada') },
];

// ============================================================
// Utilidades
// ============================================================
const getMIHM = () => {
  const n = new Date();
  const h = n.getHours() + n.getMinutes() / 60 + n.getSeconds() / 3600;
  if (h <= 6) return 0;
  if (h >= 22) return 1;
  return (h - 6) / 16;
};

const ntiStyle = (v) => {
  if (v < 0.2) return { lbl: 'COHERENTE', col: '#C8A951', cls: 'live' };
  if (v < 0.4) return { lbl: 'TENSIÓN BAJA', col: '#8BC34A', cls: 'live' };
  if (v < 0.6) return { lbl: 'TENSIÓN CRÍTICA', col: '#E6FF00', cls: 'live' };
  if (v < 0.8) return { lbl: 'BIFURCACIÓN', col: '#FF8C00', cls: 'alert' };
  return { lbl: 'COLAPSO TRAYECTORIA', col: '#FF3B30', cls: 'alert' };
};

const formatTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

const ts = () => formatTime();

// ============================================================
// Funciones API
// ============================================================
async function apiPredict(delta, label, setBackend, addExecLog, addLog) {
  try {
    addLog('sy', `→ POST /predict [${label}]`);
    const res = await fetch(`${BACKEND}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'anchor', text: label, ...delta }),
      signal: AbortSignal.timeout(7000),
    });
    const data = await res.json();
    if (data.state) {
      setBackend({ ...data.state, irc: data.irc, cost_j: data.cost_j });
    }
    addExecLog('PREDICT', label, 'api');
    addLog('ok', `← NTI=${data.state?.nti?.toFixed(3)} IHG=${data.state?.ihg?.toFixed(3)} J=${data.cost_j?.toFixed(3)}`);
    return data;
  } catch (e) {
    addExecLog('PREDICT', `${label} ERR`, 'fail');
    addLog('er', `← ${e.message}`);
  }
}

async function apiPmEvent(type, label, setBackend, addExecLog, addLog) {
  try {
    addLog('sy', `→ POST /pm/event [${type}]`);
    const res = await fetch(`${BACKEND}/pm/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
      signal: AbortSignal.timeout(7000),
    });
    const data = await res.json();
    if (data.state) {
      setBackend({ ...data.state, irc: data.irc, cost_j: data.cost_j });
    }
    addExecLog('PM_EVT', label || type, 'ok');
    addLog('ok', `← pm:${type} ok`);
    return data;
  } catch (e) {
    addExecLog('PM_EVT', type, 'fail');
    addLog('er', `← ${e.message}`);
  }
}

async function apiTick(setBackend, addExecLog, addLog) {
  try {
    addLog('sy', '→ POST /orchestrator/tick');
    const res = await fetch(`${BACKEND}/orchestrator/tick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(12000),
    });
    const data = await res.json();
    addExecLog('ORCH_TICK', 'tick completado', 'api');
    addLog('ok', `← ${JSON.stringify(data).slice(0, 90)}`);
    return data;
  } catch (e) {
    addExecLog('ORCH_TICK', 'error', 'fail');
    addLog('er', `← ${e.message}`);
  }
}

async function apiSysState(addLog) {
  try {
    const res = await fetch(`${BACKEND}/system/state`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    addLog('sy', `IHG=${data.state?.ihg?.toFixed(3)} NTI=${data.state?.nti?.toFixed(3)} R=${data.state?.r?.toFixed(3)}`);
    addLog('sy', `CFF=${data.state?.cff?.toFixed(3)} IRC=${data.irc?.toFixed(3)} J=${data.cost_j?.toFixed(3)}`);
    addLog('sy', `hist:${data.history_size} rules:${data.reflexive_rules} queue:${data.delayed_queue}`);
    return data;
  } catch (e) {
    addLog('er', `system/state: ${e.message}`);
  }
}

async function apiRules(addLog) {
  try {
    const res = await fetch(`${BACKEND}/system/rules`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    const live = data.live_rules || [];
    if (!live.length) {
      addLog('in', 'sin reglas reflexivas activas');
      return;
    }
    live.forEach(r => addLog('sy', `[regla] ${r.rule} Δj=${r.j_improvement?.toFixed(4)}`));
    return data;
  } catch (e) {
    addLog('er', `system/rules: ${e.message}`);
  }
}

async function fetchGh(setCommits, addLog) {
  try {
    const res = await fetch('https://api.github.com/users/aptymok/events/public', { signal: AbortSignal.timeout(5000) });
    const events = await res.json();
    const today = new Date().toISOString().slice(0, 10);
    const count = events
      .filter(e => e.type === 'PushEvent' && e.created_at?.startsWith(today))
      .reduce((acc, e) => acc + (e.payload?.commits?.length || 0), 0);
    setCommits(Math.min(8, count));
    addLog('ok', `github: ${count} commits hoy`);
  } catch (e) {
    addLog('wn', `github: ${e.message}`);
  }
}

// ============================================================
// Componente Principal
// ============================================================
const AnchorPanel = () => {
  // Estados
  const [commits, setCommits] = useState(0);
  const [focusMin, setFocusMin] = useState(0);
  const [sensorIn, setSensorIn] = useState(0);
  const [mihm, setMihm] = useState(getMIHM());
  const [nti, setNti] = useState(0);
  const [activeTool, setActiveTool] = useState(null);
  const [backend, setBackend] = useState(null);
  const [backendOk, setBackendOk] = useState(false);
  const [ghOn, setGhOn] = useState(false);
  const [execLog, setExecLog] = useState([]);
  const [cmdHist, setCmdHist] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [cycle, setCycle] = useState(0);
  const [clock, setClock] = useState(formatTime());
  const [consoleLogs, setConsoleLogs] = useState([]);

  // Refs
  const prevFired = useRef(new Set());
  const audioCtx = useRef(null);
  const cmdInputRef = useRef(null);

  // Helper para agregar logs a la consola
  const addLog = useCallback((level, message) => {
    setConsoleLogs(prev => [
      ...prev,
      { time: ts(), level, message }
    ]);
  }, []);

  // Helper para agregar entradas al log de ejecución
  const addExecLog = useCallback((type, desc, result) => {
    setExecLog(prev => [{ time: ts(), type, desc, result }, ...prev].slice(0, 15));
  }, []);

  // Sincronización del estado con backend
  const poll = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/state`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBackend(data);
      setBackendOk(true);
    } catch (e) {
      setBackendOk(false);
      addLog('er', `poll /state: ${e.message}`);
    }
  }, [addLog]);

  // Actualizar sensor y NTI desde commits/focus
  const updateSensor = useCallback(() => {
    const cn = commits / 8;
    const fn = focusMin / 240;
    const newSensor = cn * 0.55 + fn * 0.45;
    setSensorIn(newSensor);
    const newMihm = getMIHM();
    setMihm(newMihm);
    const newNti = Math.abs(newMihm - newSensor);
    setNti(newNti);
  }, [commits, focusMin]);

  // Evaluar reglas
  const evalRules = useCallback(() => {
    const firing = new Set();
    const s = { nti, sensorIn, mihm, activeTool };
    RULES.forEach(rule => {
      if (rule.test(s)) {
        firing.add(rule.id);
        if (!prevFired.current.has(rule.id)) {
          rule.exec(s);
          // Flash visual se maneja con CSS (clase firing)
        }
      }
    });
    prevFired.current = firing;
  }, [nti, sensorIn, mihm, activeTool]);

  // Efecto para sincronización periódica
  useEffect(() => {
    const interval = setInterval(() => {
      poll();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [poll]);

  // Efecto para tick de tiempo (cada segundo)
  useEffect(() => {
    const tickInterval = setInterval(() => {
      setCycle(c => c + 1);
      setClock(formatTime());
      const newMihm = getMIHM();
      setMihm(newMihm);
      const newSensor = commits / 8 * 0.55 + focusMin / 240 * 0.45;
      setSensorIn(newSensor);
      const newNti = Math.abs(newMihm - newSensor);
      if (Math.abs(newNti - nti) > 0.0001) {
        setNti(newNti);
        evalRules();
      }
    }, 1000);
    return () => clearInterval(tickInterval);
  }, [commits, focusMin, nti, evalRules]);

  // Efecto para github polling si activado
  useEffect(() => {
    if (!ghOn) return;
    const ghInterval = setInterval(() => {
      fetchGh(setCommits, addLog);
    }, 60000);
    fetchGh(setCommits, addLog); // inicial
    return () => clearInterval(ghInterval);
  }, [ghOn, addLog]);

  // Efecto para actualizar NTI cuando cambien commits/focus
  useEffect(() => {
    updateSensor();
  }, [commits, focusMin, updateSensor]);

  // Efecto para reevaluar reglas cuando cambie el NTI o sensor
  useEffect(() => {
    evalRules();
  }, [nti, sensorIn, mihm, activeTool, evalRules]);

  // Función para activar herramienta
  const activateTool = useCallback((id) => {
    const newActive = activeTool === id ? null : id;
    setActiveTool(newActive);
    if (newActive) {
      const tool = TOOLS.find(t => t.id === id);
      if (tool) {
        addLog('sy', `herramienta: ${tool.label} · ${tool.hz}Hz · ${tool.fx}`);
        // Reproducir tono
        if (!audioCtx.current) {
          audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        try {
          const osc = audioCtx.current.createOscillator();
          const gain = audioCtx.current.createGain();
          osc.type = 'sine';
          osc.frequency.value = tool.hz;
          gain.gain.setValueAtTime(0.05, audioCtx.current.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.current.currentTime + 1.2);
          osc.connect(gain);
          gain.connect(audioCtx.current.destination);
          osc.start();
          osc.stop(audioCtx.current.currentTime + 1.2);
        } catch (e) { /* ignore */ }

        // Ejecutar acción según tipo de herramienta
        if (tool.delta) {
          apiPredict(tool.delta, `tool:${id}`, setBackend, addExecLog, addLog);
        } else if (tool.pm) {
          apiPmEvent(tool.pm, `tool:${id}`, setBackend, addExecLog, addLog);
        } else if (tool.health) {
          fetch(`${BACKEND}/system/health`, { signal: AbortSignal.timeout(5000) })
            .then(r => r.json())
            .then(d => {
              addLog('ok', `health: ${JSON.stringify(d).slice(0, 100)}`);
              addExecLog('HEALTH', 'system health check', 'ok');
            })
            .catch(e => addLog('er', `health: ${e.message}`));
        } else if (tool.tick) {
          apiTick(setBackend, addExecLog, addLog);
        } else {
          apiSysState(addLog);
        }
      }
    } else {
      addLog('in', 'herramienta desactivada');
    }
  }, [activeTool, addLog, addExecLog]);

  // Procesar comandos de consola
  const processCmd = useCallback(async (rawCmd) => {
    const [cmd, ...rest] = rawCmd.trim().split(/\s+/);
    const args = rest.join(' ');
    switch (cmd.toLowerCase()) {
      case 'estado':
        await apiSysState(addLog);
        break;
      case 'tick':
        await apiTick(setBackend, addExecLog, addLog);
        break;
      case 'commit':
        await apiPredict({ nti: 0.02 }, args || `commit_${Date.now()}`, setBackend, addExecLog, addLog);
        addExecLog('COMMIT', args || `snapshot_${Date.now()}`, 'ok');
        break;
      case 'reglas':
        await apiRules(addLog);
        break;
      case 'reset':
        try {
          const res = await fetch(`${BACKEND}/reset`, { method: 'POST', signal: AbortSignal.timeout(5000) });
          const data = await res.json();
          addLog('sy', `reset: ${data.status}`);
          addExecLog('RESET', 'MIHM reiniciado', 'warn');
          if (data.state) setBackend(data.state);
        } catch (e) {
          addLog('er', `reset: ${e.message}`);
        }
        break;
      case 'proyecto': {
        const name = args || `proyecto_${Date.now()}`;
        try {
          const res = await fetch(`${BACKEND}/pm/project`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, members: [], deadline_days: 30 }),
            signal: AbortSignal.timeout(5000)
          });
          await res.json();
          addLog('ok', `proyecto: ${name}`);
          addExecLog('PM_PROJ', name, 'api');
        } catch (e) {
          addLog('er', `proyecto: ${e.message}`);
        }
        break;
      }
      case 'github':
        setGhOn(prev => !prev);
        addLog('sy', `github sensor: ${!ghOn ? 'activado' : 'desactivado'}`);
        break;
      case 'limpiar':
        setConsoleLogs([]);
        break;
      case 'ayuda':
        [
          'estado         → GET /system/state (IHG NTI R CFF IRC J)',
          'tick           → POST /orchestrator/tick',
          'commit [msg]   → POST /predict + log',
          'reglas         → GET /system/rules (reflexivas)',
          'reset          → POST /reset (reiniciar MIHM)',
          'proyecto [n]   → POST /pm/project',
          'github         → toggle sensor GitHub API',
          'limpiar        → vacía consola',
          'ayuda          → este mensaje',
        ].forEach(line => addLog('in', line));
        break;
      default:
        addLog('er', `desconocido: "${cmd}" → ayuda`);
    }
  }, [addLog, addExecLog, ghOn]);

  const runCmd = useCallback(() => {
    const raw = cmdInputRef.current?.value.trim();
    if (!raw) return;
    setCmdHist(prev => [raw, ...prev]);
    setHistIdx(-1);
    if (cmdInputRef.current) cmdInputRef.current.value = '';
    addLog('in', `> ${raw}`);
    processCmd(raw);
  }, [addLog, processCmd]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowUp') {
      if (histIdx < cmdHist.length - 1) {
        const newIdx = histIdx + 1;
        setHistIdx(newIdx);
        if (cmdInputRef.current) cmdInputRef.current.value = cmdHist[newIdx];
      }
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      if (histIdx > 0) {
        const newIdx = histIdx - 1;
        setHistIdx(newIdx);
        if (cmdInputRef.current) cmdInputRef.current.value = cmdHist[newIdx];
      } else if (histIdx === 0) {
        setHistIdx(-1);
        if (cmdInputRef.current) cmdInputRef.current.value = '';
      }
      e.preventDefault();
    } else if (e.key === 'Enter') {
      runCmd();
    }
  }, [histIdx, cmdHist, runCmd]);

  // Renderizado de los medidores (gauges)
  const renderGauges = () => {
    if (!backend) return null;
    const { ihg = 0, nti: bnti = 0, r = 0, cff = 0, irc = 0, cost_j: j = 0 } = backend;
    const ihgColor = ihg > -0.5 ? 'var(--green)' : (ihg > -0.9 ? 'var(--gold)' : 'var(--red)');
    const ntiColor = bnti > 0.6 ? 'var(--green)' : (bnti > 0.35 ? 'var(--gold)' : 'var(--red)');
    const rColor = r > 0.6 ? 'var(--green)' : (r > 0.35 ? 'var(--gold)' : 'var(--red)');
    const cffColor = cff > 0.2 ? 'var(--green)' : (cff > -0.2 ? 'var(--gold)' : 'var(--red)');
    const ircColor = irc > 0.5 ? 'var(--green)' : 'var(--gold)';
    const jColor = j < 0.5 ? 'var(--green)' : (j < 1.2 ? 'var(--orange)' : 'var(--red)');

    return (
      <div className="gauges">
        <div className="gauge"><div className="gk">IHG</div><div className="gv">{ihg.toFixed(3)}</div><div className="gbar"><div className="gbf" style={{ width: `${((ihg + 2) / 2 * 100).toFixed(1)}%`, background: ihgColor }}></div></div></div>
        <div className="gauge"><div className="gk">NTI</div><div className="gv">{bnti.toFixed(3)}</div><div className="gbar"><div className="gbf" style={{ width: `${(bnti * 100).toFixed(1)}%`, background: ntiColor }}></div></div></div>
        <div className="gauge"><div className="gk">R</div><div className="gv">{r.toFixed(3)}</div><div className="gbar"><div className="gbf" style={{ width: `${(r * 100).toFixed(1)}%`, background: rColor }}></div></div></div>
        <div className="gauge"><div className="gk">CFF</div><div className="gv">{cff.toFixed(3)}</div><div className="gbar"><div className="gbf" style={{ width: `${((cff + 1) / 2 * 100).toFixed(1)}%`, background: cffColor }}></div></div></div>
        <div className="gauge"><div className="gk">IRC</div><div className="gv">{irc.toFixed(3)}</div><div className="gbar"><div className="gbf" style={{ width: `${(irc * 100).toFixed(1)}%`, background: ircColor }}></div></div></div>
        <div className="gauge"><div className="gk">COST J</div><div className="gv">{j.toFixed(3)}</div><div className="gbar"><div className="gbf" style={{ width: `${Math.min(100, j * 40).toFixed(1)}%`, background: jColor }}></div></div></div>
      </div>
    );
  };

  // Estilos embebidos (copiados del HTML)
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;700&family=IBM+Plex+Sans:wght@300;400;600&display=swap');
    :root {
      --void:#060606;--void2:#0C0C0C;--void3:#111111;
      --dim:#1A1A1A;--dim2:#242424;--dim3:#2E2E2E;
      --gold:#C8A951;--gold-dim:#8A7235;--gold-glow:rgba(200,169,81,0.10);
      --red:#FF3B30;--red-dim:rgba(255,59,48,0.12);
      --orange:#FF8C00;--green:#34C759;--green-dim:rgba(52,199,89,0.08);
      --blue:#3A8FFF;--neon:#E6FF00;
      --text:#C8C8C8;--text-dim:#555;--text-ghost:#2A2A2A;
      --mono:'IBM Plex Mono',monospace;--sans:'IBM Plex Sans',sans-serif;
    }
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:var(--void);font-family:var(--mono);color:var(--text);min-height:100vh;overflow-x:hidden;}
    body::before{content:'';position:fixed;inset:0;
      background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 3px);
      pointer-events:none;z-index:9999;}
    .app{max-width:940px;margin:0 auto;padding:20px;}

    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid var(--dim);padding-bottom:16px;margin-bottom:18px;}
    .hl .tag{font-size:9px;color:var(--gold);letter-spacing:.22em;margin-bottom:4px;}
    .hl .title{font-size:22px;font-weight:700;color:#fff;letter-spacing:.06em;}
    .hl .sub{font-size:9px;color:var(--text-dim);margin-top:2px;}
    .hr{text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:5px;}
    .badge{display:inline-flex;align-items:center;gap:6px;font-size:9px;letter-spacing:.14em;padding:4px 10px;border:1px solid var(--dim2);color:var(--text-dim);transition:all .4s;}
    .badge.live{border-color:var(--gold-dim);color:var(--gold);}
    .badge.alert{border-color:rgba(255,59,48,.4);color:var(--red);animation:blink 1s infinite;}
    .badge.offline{border-color:rgba(255,140,0,.4);color:var(--orange);}
    .dot{width:5px;height:5px;border-radius:50%;background:var(--text-dim);transition:background .4s;}
    .badge.live .dot{background:var(--gold);}
    .badge.alert .dot{background:var(--red);}
    .badge.offline .dot{background:var(--orange);}
    .be{font-size:8px;color:var(--text-ghost);letter-spacing:.1em;}
    .be.on{color:var(--green);}
    .be.err{color:var(--red);}

    .g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;}
    .g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px;}

    .panel{background:var(--void2);border:1px solid var(--dim);padding:14px;position:relative;overflow:hidden;transition:border-color .4s,box-shadow .4s;}
    .panel.alert-state{border-color:rgba(255,59,48,.35);box-shadow:0 0 20px rgba(255,59,48,.06);animation:pulsePanel 1.4s ease-in-out infinite;}
    .panel.live-state{border-color:var(--gold-dim);}
    .mb10{margin-bottom:10px;}
    .plabel{font-size:9px;color:var(--gold);letter-spacing:.2em;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;}
    .pr{font-size:8px;color:var(--text-ghost);}

    .nti-big{font-size:46px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums;transition:color .5s;}
    .nti-lbl{font-size:9px;letter-spacing:.16em;margin-top:4px;margin-bottom:12px;transition:color .5s;}
    .btrack{height:3px;background:var(--dim);position:relative;margin-bottom:6px;}
    .bfill{position:absolute;top:0;left:0;bottom:0;transition:width .8s cubic-bezier(.4,0,.2,1),background .5s;}
    .thresh{position:absolute;top:-4px;width:1px;height:11px;background:rgba(230,255,0,.3);}
    .blabels{display:flex;justify-content:space-between;font-size:8px;color:var(--text-ghost);letter-spacing:.08em;}

    .gauges{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:4px;}
    .gauge{padding:8px;background:var(--void3);border:1px solid var(--dim);}
    .gk{font-size:8px;color:var(--text-dim);letter-spacing:.12em;margin-bottom:4px;}
    .gv{font-size:15px;font-weight:500;font-variant-numeric:tabular-nums;}
    .gbar{height:2px;background:var(--dim);margin-top:5px;}
    .gbf{height:100%;transition:width .8s ease,background .5s;}

    .si{margin-bottom:10px;}
    .si:last-child{margin-bottom:0;}
    .slbl{display:flex;justify-content:space-between;font-size:9px;color:var(--text-dim);letter-spacing:.12em;margin-bottom:5px;}
    .slbl span{color:var(--gold);}
    input[type=range]{-webkit-appearance:none;width:100%;height:3px;background:var(--dim);outline:none;cursor:pointer;}
    input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:10px;height:10px;background:var(--gold);border-radius:0;cursor:pointer;}
    .ssub{font-size:8px;color:var(--text-ghost);margin-top:3px;text-align:right;}
    .mrow{display:flex;justify-content:space-between;font-size:9px;color:var(--text-dim);letter-spacing:.1em;margin-bottom:4px;}
    .gh-btn{font-size:8px;color:var(--text-ghost);cursor:pointer;letter-spacing:.1em;border:1px solid var(--dim);padding:2px 7px;transition:all .2s;background:none;}
    .gh-btn:hover,.gh-btn.on{color:var(--gold);border-color:var(--gold-dim);}

    .tgrid{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;}
    .tbtn{background:var(--void);border:1px solid var(--dim);color:var(--text-dim);font-family:var(--mono);font-size:8px;padding:7px 4px;cursor:pointer;text-align:center;letter-spacing:.05em;transition:all .25s;display:flex;flex-direction:column;align-items:center;gap:3px;}
    .tbtn:hover{border-color:var(--dim3);color:var(--text);}
    .tbtn.active{border-color:var(--gold-dim);color:var(--gold);background:var(--gold-glow);}
    .tbtn.firing{animation:toolFire .4s ease-out;}
    .thz{font-size:7px;color:var(--text-ghost);}
    .tbtn.active .thz{color:var(--gold-dim);}
    .tfx{font-size:7px;color:var(--text-ghost);}

    .rlist{display:grid;gap:5px;}
    .ritem{display:flex;align-items:stretch;border:1px solid var(--dim);font-size:9px;letter-spacing:.07em;transition:border-color .3s,background .3s;overflow:hidden;cursor:pointer;}
    .ritem:hover{border-color:var(--dim2);}
    .ritem.firing{border-color:var(--gold-dim);background:rgba(200,169,81,.04);animation:ruleFlash .6s ease-out;}
    .ritem.blocked{border-color:rgba(255,59,48,.3);background:var(--red-dim);}
    .rcond{padding:7px 9px;color:var(--text-dim);background:var(--dim);min-width:110px;display:flex;align-items:center;font-size:8px;letter-spacing:.09em;}
    .rarr{padding:7px 5px;color:var(--text-ghost);display:flex;align-items:center;}
    .ract{padding:7px 9px;color:var(--text);flex:1;display:flex;align-items:center;justify-content:space-between;}
    .rdot{width:5px;height:5px;border-radius:50%;background:var(--text-ghost);transition:background .3s;flex-shrink:0;margin-left:8px;}
    .ritem.firing .rdot{background:var(--gold);}
    .ritem.blocked .rdot{background:var(--red);}

    .cout{height:148px;overflow-y:auto;font-size:10px;line-height:1.7;color:var(--text-dim);margin-bottom:8px;scrollbar-width:thin;scrollbar-color:var(--dim2) transparent;}
    .cout::-webkit-scrollbar{width:3px;}
    .cout::-webkit-scrollbar-thumb{background:var(--dim2);}
    .ll{display:flex;gap:8px;align-items:baseline;}
    .lt{color:var(--text-ghost);flex-shrink:0;font-size:9px;}
    .lok{color:var(--green);}.lwn{color:var(--orange);}.ler{color:var(--red);}.lsy{color:var(--gold);}.lin{color:var(--text-dim);}.lms{color:var(--text);}
    .crow{display:flex;align-items:center;border:1px solid var(--dim);background:var(--void);transition:border-color .3s;}
    .crow:focus-within{border-color:var(--gold-dim);}
    .cprompt{padding:0 9px;font-size:10px;color:var(--gold);flex-shrink:0;}
    .cinp{flex:1;background:transparent;border:none;outline:none;color:var(--text);font-family:var(--mono);font-size:10px;padding:7px 0;letter-spacing:.05em;}
    .cinp::placeholder{color:var(--text-ghost);}
    .crun{background:none;border:none;border-left:1px solid var(--dim);color:var(--text-dim);font-family:var(--mono);font-size:9px;padding:7px 11px;cursor:pointer;letter-spacing:.1em;transition:color .2s,background .2s;}
    .crun:hover{color:var(--gold);background:var(--gold-glow);}

    .xlog{display:grid;gap:5px;}
    .xentry{display:grid;grid-template-columns:52px 1fr auto;gap:8px;align-items:center;padding:7px 9px;border:1px solid var(--dim);font-size:9px;letter-spacing:.06em;animation:entrySlide .3s ease-out;}
    .xt{color:var(--text-ghost);}
    .xd{color:var(--text);}
    .xr{font-size:8px;padding:2px 6px;border:1px solid;letter-spacing:.1em;}
    .xr.ok{color:var(--green);border-color:rgba(52,199,89,.3);background:var(--green-dim);}
    .xr.warn{color:var(--orange);border-color:rgba(255,140,0,.3);background:rgba(255,140,0,.05);}
    .xr.fail{color:var(--red);border-color:rgba(255,59,48,.3);background:var(--red-dim);}
    .xr.api{color:var(--blue);border-color:rgba(58,143,255,.3);background:rgba(58,143,255,.05);}

    .footer{margin-top:14px;padding-top:10px;border-top:1px solid var(--dim);display:flex;justify-content:space-between;font-size:8px;color:var(--text-ghost);letter-spacing:.1em;}

    @keyframes blink{0%,49%{opacity:1}50%,100%{opacity:.3}}
    @keyframes pulsePanel{0%,100%{box-shadow:0 0 0 rgba(255,59,48,0)}50%{box-shadow:0 0 18px rgba(255,59,48,.12)}}
    @keyframes ruleFlash{0%{background:rgba(200,169,81,.15)}100%{background:rgba(200,169,81,.04)}}
    @keyframes entrySlide{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
    @keyframes toolFire{0%{background:rgba(200,169,81,.25)}100%{background:var(--gold-glow)}}
  `;

  const badgeClass = ntiStyle(nti).cls;
  const ntiData = ntiStyle(nti);
  const mihmPercent = (mihm * 100).toFixed(1);
  const sensorPercent = (sensorIn * 100).toFixed(1);
  const ntiPercent = (nti * 100).toFixed(1);

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <div className="header">
          <div className="hl">
            <div className="tag">SF-CORE · ANCHOR v1.0 · MÓDULO DE EXPANSIÓN</div>
            <div className="title">ANCHOR</div>
            <div className="sub">Motor de Reglas · Ejecutor Real · Estado Vivo · Backend ScoreFriction</div>
          </div>
          <div className="hr">
            <div className={`badge ${badgeClass}`}>
              <div className="dot"></div>
              <span>{ntiData.lbl}</span>
            </div>
            <div className={`be ${backendOk ? 'on' : 'err'}`}>
              {backendOk ? '● backend: conectado' : '● backend: offline'}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-ghost)' }}>{clock}</div>
          </div>
        </div>

        {/* Row 1: NTI + Backend state */}
        <div className="g2">
          <div className={`panel ${nti > 0.6 ? 'alert-state' : ''}`} id="nti-panel">
            <div className="plabel">
              NTI · TENSIÓN TEMPORAL ANCHOR
              <span className="pr">ciclo {cycle}</span>
            </div>
            <div className="nti-big" style={{ color: ntiData.col }}>{nti.toFixed(4)}</div>
            <div className="nti-lbl" style={{ color: ntiData.col }}>{ntiData.lbl}</div>
            <div className="btrack">
              <div className="bfill" style={{ width: `${ntiPercent}%`, background: `linear-gradient(90deg, var(--gold) 0%, ${ntiData.col} 100%)` }}></div>
              <div className="thresh" style={{ left: '20%' }}></div>
              <div className="thresh" style={{ left: '40%' }}></div>
              <div className="thresh" style={{ left: '60%' }}></div>
              <div className="thresh" style={{ left: '80%' }}></div>
            </div>
            <div className="blabels"><span>0.0</span><span style={{ color: 'rgba(230,255,0,.4)' }}>0.6 BIFURC.</span><span>1.0</span></div>
          </div>
          <div className="panel live-state">
            <div className="plabel">
              BACKEND · MIHM ESTADO VIVO
              <span className="pr">{ts()}</span>
            </div>
            {renderGauges()}
          </div>
        </div>

        {/* SENSORS */}
        <div className="panel mb10">
          <div className="plabel">
            SENSOR_IN · MÉTRICAS DE ACTIVIDAD
            <button className={`gh-btn ${ghOn ? 'on' : ''}`} onClick={() => setGhOn(!ghOn)}>
              GITHUB: {ghOn ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="g2">
            <div>
              <div className="si">
                <div className="slbl">COMMITS HOY <span>{commits}</span> / 8</div>
                <input type="range" min="0" max="8" value={commits} onChange={(e) => setCommits(parseInt(e.target.value))} />
                <div className="ssub">norm: {(commits / 8).toFixed(3)}</div>
              </div>
              <div className="si">
                <div className="slbl">MINUTOS FOCO <span>{focusMin}</span> / 240</div>
                <input type="range" min="0" max="240" value={focusMin} onChange={(e) => setFocusMin(parseInt(e.target.value))} />
                <div className="ssub">norm: {(focusMin / 240).toFixed(3)}</div>
              </div>
            </div>
            <div>
              <div className="mrow"><span>MIHM TIEMPO</span><span style={{ color: 'var(--gold)' }}>{mihm.toFixed(3)}</span></div>
              <div className="btrack" style={{ marginBottom: '10px' }}><div className="bfill" style={{ width: `${mihmPercent}%`, background: 'var(--gold)' }}></div></div>
              <div className="mrow"><span>SENSOR_IN</span><span>{sensorIn.toFixed(3)}</span></div>
              <div className="btrack"><div className="bfill" style={{ width: `${sensorPercent}%`, background: ntiData.col, opacity: 0.6 }}></div></div>
              <div style={{ marginTop: '8px', fontSize: '8px', color: 'var(--text-ghost)' }}>δ = {Math.abs(mihm - sensorIn).toFixed(3)}</div>
            </div>
          </div>
        </div>

        {/* TOOLS */}
        <div className="panel mb10">
          <div className="plabel">HERRAMIENTAS · DISPARO DIRECTO → BACKEND</div>
          <div className="tgrid">
            {TOOLS.map(tool => (
              <button
                key={tool.id}
                className={`tbtn ${activeTool === tool.id ? 'active' : ''}`}
                onClick={() => activateTool(tool.id)}
              >
                <span>{tool.label}</span>
                <span className="thz">{tool.hz}Hz</span>
                <span className="tfx">{tool.fx}</span>
              </button>
            ))}
          </div>
        </div>

        {/* RULES + CONSOLE */}
        <div className="g2 mb10" style={{ alignItems: 'start' }}>
          <div className="panel">
            <div className="plabel">MOTOR DE REGLAS · DISPARO REAL</div>
            <div className="rlist">
              {RULES.map(rule => {
                const active = prevFired.current.has(rule.id);
                return (
                  <div key={rule.id} className={`ritem ${active ? 'firing' : ''}`}>
                    <div className="rcond">{rule.cond}</div>
                    <div className="rarr">→</div>
                    <div className="ract">
                      <span>{rule.action}</span>
                      <div className="rdot"></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="panel">
            <div className="plabel">CONSOLA DE ACCIONES</div>
            <div className="cout">
              {consoleLogs.map((log, idx) => (
                <div key={idx} className="ll">
                  <span className="lt">{log.time}</span>
                  <span className={`${log.level === 'ok' ? 'lok' : log.level === 'er' ? 'ler' : log.level === 'sy' ? 'lsy' : log.level === 'in' ? 'lin' : 'lwn'}`}>
                    [{log.level.toUpperCase()}]
                  </span>
                  <span className="lms">{log.message}</span>
                </div>
              ))}
            </div>
            <div className="crow">
              <span className="cprompt">anchor &gt;</span>
              <input
                ref={cmdInputRef}
                className="cinp"
                placeholder="estado · tick · commit · reset · ayuda"
                autoComplete="off"
                spellCheck="false"
                onKeyDown={handleKeyDown}
              />
              <button className="crun" onClick={runCmd}>RUN</button>
            </div>
          </div>
        </div>

        {/* EXEC LOG */}
        <div className="panel">
          <div className="plabel">
            LOG DE EJECUCIÓN · CONSECUENCIAS REALES
            <span className="pr" style={{ cursor: 'pointer' }} onClick={() => setExecLog([])}>LIMPIAR</span>
          </div>
          <div className="xlog">
            {execLog.length === 0 ? (
              <div style={{ fontSize: '9px', color: 'var(--text-ghost)', padding: '6px 0' }}>— sin acciones ejecutadas —</div>
            ) : (
              execLog.map((entry, idx) => (
                <div key={idx} className="xentry">
                  <span className="xt">{entry.time}</span>
                  <span className="xd">[{entry.type}] {entry.desc}</span>
                  <span className={`xr ${entry.result}`}>{entry.result.toUpperCase()}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="footer">
          <span>SF-CORE.ANCHOR v1.0</span>
          <span>NTI-ANCHOR: {nti.toFixed(4)}</span>
          <span>backend: {backend ? `IHG:${backend.ihg?.toFixed(3)} J:${backend.cost_j?.toFixed(3)}` : '—'}</span>
        </div>
      </div>
    </>
  );
};

export default AnchorPanel;