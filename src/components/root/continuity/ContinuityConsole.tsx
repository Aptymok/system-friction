'use client';

import { useEffect, useMemo, useState } from 'react';
import { HumanReadableRecord } from '@/components/shared/HumanReadableRecord';

type Dashboard = {
  state: any;
  runs: any[];
  checks: any[];
  incidents: any[];
  decisions: any[];
  reports: any[];
  errors: string[];
};

const MODE_LABEL: Record<string, string> = {
  NORMAL: 'Operación normal',
  FOUNDER_ABSENT_PREP: 'Preparando ausencia del fundador',
  FOUNDER_ABSENT_ACTIVE: 'Ausencia del fundador activa',
  DEGRADED_SAFE: 'Operación degradada y segura',
  EMERGENCY_HALT: 'Paro de emergencia',
  RECOVERY: 'Recuperación supervisada',
  UNAVAILABLE: 'Continuidad no disponible',
};

const STATUS_LABEL: Record<string, string> = {
  OPERATIONAL: 'Operativa',
  DEGRADED: 'Degradada',
  FAILED: 'Fallida',
  BLOCKED: 'Bloqueada',
  MISSING: 'Sin evidencia suficiente',
  COMPLETED: 'Completado',
};

function reportLines(content: unknown) {
  if (typeof content !== 'string') return [];
  return content.split('\n').map((line) => line.trim()).filter(Boolean);
}

export function ContinuityConsole({ initial }: { initial: Dashboard }) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function refresh() {
    const response = await fetch('/api/root/readiness', { cache: 'no-store' });
    const payload = await response.json();
    if (payload.ok) setData(payload);
  }

  useEffect(() => {
    const id = window.setInterval(() => void refresh(), 30000);
    return () => window.clearInterval(id);
  }, []);

  async function command(body: Record<string, unknown>) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/root/readiness', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'continuity_command_failed');
      setMessage('La acción fue ejecutada y quedó registrada en la auditoría.');
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const latestByCapability = useMemo(() => {
    const map = new Map<string, any>();
    for (const check of data.checks) if (!map.has(check.capability_id)) map.set(check.capability_id, check);
    return [...map.values()];
  }, [data.checks]);

  const latestRun = data.runs[0];
  const mode = data.state?.mode ?? 'UNAVAILABLE';

  return (
    <main className="continuity-shell">
      <header className="continuity-header">
        <div><span>SYSTEM FRICTION INSTITUTE</span><h1>CONTINUIDAD INSTITUCIONAL</h1><p>Qué sigue funcionando, qué se degradó, qué requiere autoridad y qué evidencia existe.</p></div>
        <div className="continuity-mode"><small>MODO ACTUAL</small><strong>{MODE_LABEL[mode] ?? mode}</strong><em>Último heartbeat: {data.state?.last_heartbeat_at ?? 'todavía no existe'}</em></div>
      </header>

      <section className="continuity-actions">
        <button disabled={busy} onClick={() => command({ action: 'heartbeat' })}>EJECUTAR VERIFICACIÓN AHORA</button>
        {mode === 'NORMAL' && <button disabled={busy} onClick={() => command({ action: 'set_mode', mode: 'FOUNDER_ABSENT_PREP', reason: 'Preparar prueba de autonomía' })}>PREPARAR AUSENCIA</button>}
        {mode === 'FOUNDER_ABSENT_PREP' && <button disabled={busy} onClick={() => command({ action: 'set_mode', mode: 'FOUNDER_ABSENT_ACTIVE', reason: 'Iniciar prueba controlada' })}>ACTIVAR AUSENCIA</button>}
        {['FOUNDER_ABSENT_ACTIVE','DEGRADED_SAFE'].includes(mode) && <button disabled={busy} onClick={() => command({ action: 'set_mode', mode: 'RECOVERY', reason: 'Iniciar recuperación supervisada' })}>INICIAR RECUPERACIÓN</button>}
        {mode === 'RECOVERY' && <button disabled={busy} onClick={() => command({ action: 'set_mode', mode: 'NORMAL', reason: 'Recuperación verificada' })}>VOLVER A NORMAL</button>}
        {mode !== 'EMERGENCY_HALT' && <button className="danger" disabled={busy} onClick={() => command({ action: 'emergency_halt', reason: 'Paro manual desde ROOT' })}>PARO DE EMERGENCIA</button>}
        {message && <output>{message}</output>}
      </section>

      {data.errors.length ? <section className="continuity-warning"><strong>Hay problemas para leer parte del estado institucional.</strong>{data.errors.map((item, index) => <p key={index}>{item}</p>)}</section> : null}

      <section className="continuity-grid summary">
        <article><small>ÚLTIMO CICLO</small><strong>{STATUS_LABEL[latestRun?.status] ?? latestRun?.status ?? 'Sin ciclos'}</strong><span>{latestRun?.started_at ?? 'Todavía no se ejecuta'}</span></article>
        <article><small>CAPACIDADES SANAS</small><strong>{latestRun?.healthy_count ?? 0}/{latestRun?.capability_count ?? 0}</strong><span>fallidas {latestRun?.failed_count ?? 0}</span></article>
        <article><small>INCIDENTES ABIERTOS</small><strong>{data.incidents.length}</strong><span>{data.incidents.length ? 'requieren contención o seguimiento' : 'sin incidentes pendientes'}</span></article>
        <article><small>DECISIONES RESERVADAS</small><strong>{data.decisions.length}</strong><span>{data.decisions.length ? 'esperan autoridad constitutiva' : 'ninguna decisión pendiente'}</span></article>
      </section>

      <section className="continuity-panel">
        <h2>CAPACIDADES OBSERVADAS</h2>
        <p className="continuity-explainer">Una capacidad aparece como operativa sólo a partir del resultado persistido de su probe. La presencia de una ruta o un componente no basta.</p>
        <div className="continuity-table">
          <div className="row head"><span>CAPACIDAD</span><span>NIVEL</span><span>ESTADO</span><span>LATENCIA</span><span>ÚLTIMA EVIDENCIA / ERROR</span></div>
          {latestByCapability.map((check) => <div className="row" key={check.capability_id}><span>{check.capability_id}</span><span>{check.autonomy_level}</span><span data-status={check.status}>{STATUS_LABEL[check.status] ?? check.status}</span><span>{check.latency_ms === null || check.latency_ms === undefined ? '—' : `${check.latency_ms} ms`}</span><span>{check.error_code ? `Error: ${check.error_code}` : `Verificada: ${check.checked_at}`}</span></div>)}
          {!latestByCapability.length && <p>Sin probes registrados. El sistema no inventará un estado hasta que exista una verificación persistida.</p>}
        </div>
      </section>

      <section className="continuity-grid detail">
        <article><h2>INCIDENTES</h2>{data.incidents.length ? data.incidents.map((item) => <div className="continuity-item" key={item.id}><b>{item.severity} · {item.title}</b><span>{item.error_code ? `Código: ${item.error_code}` : `Estado: ${item.status}`}</span><HumanReadableRecord value={item} title="Qué sabemos del incidente" maxFields={10} /></div>) : <p>Sin incidentes abiertos.</p>}</article>
        <article><h2>DECISIONES PARA EL FUNDADOR</h2>{data.decisions.length ? data.decisions.map((item) => <div className="continuity-item" key={item.id}><b>{item.category} · {item.title}</b><span>{item.safe_default ? `Mientras no decidas: ${item.safe_default}` : `Estado: ${item.status}`}</span><HumanReadableRecord value={item} title="Por qué llegó a tu cola" maxFields={10} /></div>) : <p>Sin decisiones reservadas.</p>}</article>
        <article><h2>REPORTES DIARIOS</h2>{data.reports.length ? data.reports.map((item) => <div className="continuity-report" key={item.id}><strong>{item.period_end ?? item.created_at ?? 'Reporte de continuidad'}</strong><ul>{reportLines(item.content).map((line, index) => <li key={index}>{line}</li>)}</ul><HumanReadableRecord value={item.summary ?? item} title="Datos del reporte" maxFields={12} /></div>) : <p>Sin reportes diarios.</p>}</article>
      </section>

      <style jsx>{`
        .continuity-shell{min-height:100vh;background:#070706;color:#eee7d7;padding:28px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.continuity-header{display:flex;justify-content:space-between;gap:24px;border-bottom:1px solid #6c5a2d;padding-bottom:20px}.continuity-header span,.continuity-header small{color:#bba365;font-size:11px;letter-spacing:.15em}.continuity-header h1{font-size:28px;margin:5px 0}.continuity-header p{color:#8f8878;margin:0}.continuity-mode{border:1px solid #6c5a2d;padding:14px 18px;min-width:300px;display:grid;gap:6px}.continuity-mode strong{font-size:15px}.continuity-mode em{font-size:10px;color:#8f8878}.continuity-actions{display:flex;flex-wrap:wrap;gap:8px;padding:18px 0}.continuity-actions button{background:#15130e;color:#d8c488;border:1px solid #6c5a2d;padding:10px 13px;font:inherit;font-size:11px}.continuity-actions button:disabled{opacity:.45}.continuity-actions .danger{border-color:#7f2f2f;color:#e89b9b}.continuity-actions output{width:100%;color:#bba365}.continuity-warning{border:1px solid #764b33;background:#160f0b;padding:14px;margin-bottom:12px}.continuity-warning p{font-size:11px;color:#cda98c}.continuity-grid{display:grid;gap:12px}.summary{grid-template-columns:repeat(4,minmax(0,1fr))}.continuity-grid article,.continuity-panel{border:1px solid #29251b;background:#0d0c09;padding:16px}.summary article{display:grid;gap:8px}.summary small{color:#8f8878}.summary strong{font-size:22px;color:#d8c488}.summary span{font-size:11px;color:#777064}.continuity-panel{margin-top:12px}.continuity-panel h2,.detail h2{font-size:12px;letter-spacing:.15em;color:#bba365}.continuity-explainer{font-size:11px;line-height:1.6;color:#8f8878;max-width:900px}.continuity-table .row{display:grid;grid-template-columns:1.4fr .5fr .9fr .6fr 1.8fr;gap:10px;padding:9px 0;border-top:1px solid #211e17;font-size:11px}.continuity-table .head{color:#777064}.row [data-status=OPERATIONAL]{color:#84b58c}.row [data-status=FAILED]{color:#df7474}.row [data-status=DEGRADED],.row [data-status=BLOCKED]{color:#d8b768}.detail{grid-template-columns:1fr 1fr 1fr;margin-top:12px}.detail>article>p{font-size:11px}.continuity-item,.continuity-report{display:grid;gap:8px;border-top:1px solid #211e17;padding:12px 0;font-size:11px}.continuity-item>span{color:#8f8878}.continuity-report>strong{color:#d8c488}.continuity-report ul{margin:0;padding-left:18px;display:grid;gap:5px;color:#a8a08f}@media(max-width:900px){.summary,.detail{grid-template-columns:1fr}.continuity-header{display:grid}.continuity-table{overflow:auto}.continuity-table .row{min-width:760px}}
      `}</style>
    </main>
  );
}
