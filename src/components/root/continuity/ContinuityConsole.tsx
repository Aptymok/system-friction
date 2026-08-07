'use client';

import { useEffect, useMemo, useState } from 'react';

type Dashboard = {
  state: any;
  runs: any[];
  checks: any[];
  incidents: any[];
  decisions: any[];
  reports: any[];
  errors: string[];
};

export function ContinuityConsole({ initial }: { initial: Dashboard }) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function refresh() {
    const response = await fetch('/api/root/continuity', { cache: 'no-store' });
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
      const response = await fetch('/api/root/continuity', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'continuity_command_failed');
      setMessage('Comando ejecutado y auditado.');
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
        <div><span>SYSTEM FRICTION INSTITUTE</span><h1>CONTINUITY RUNTIME</h1><p>Autonomía limitada, trazable y reversible.</p></div>
        <div className="continuity-mode"><small>MODE</small><strong>{mode}</strong><em>{data.state?.last_heartbeat_at ?? 'SIN HEARTBEAT'}</em></div>
      </header>

      <section className="continuity-actions">
        <button disabled={busy} onClick={() => command({ action: 'heartbeat' })}>EJECUTAR HEARTBEAT</button>
        {mode === 'NORMAL' && <button disabled={busy} onClick={() => command({ action: 'set_mode', mode: 'FOUNDER_ABSENT_PREP', reason: 'Preparar prueba de autonomía' })}>PREPARAR AUSENCIA</button>}
        {mode === 'FOUNDER_ABSENT_PREP' && <button disabled={busy} onClick={() => command({ action: 'set_mode', mode: 'FOUNDER_ABSENT_ACTIVE', reason: 'Iniciar prueba controlada' })}>ACTIVAR AUSENCIA</button>}
        {['FOUNDER_ABSENT_ACTIVE','DEGRADED_SAFE'].includes(mode) && <button disabled={busy} onClick={() => command({ action: 'set_mode', mode: 'RECOVERY', reason: 'Iniciar recuperación supervisada' })}>INICIAR RECUPERACIÓN</button>}
        {mode === 'RECOVERY' && <button disabled={busy} onClick={() => command({ action: 'set_mode', mode: 'NORMAL', reason: 'Recuperación verificada' })}>VOLVER A NORMAL</button>}
        {mode !== 'EMERGENCY_HALT' && <button className="danger" disabled={busy} onClick={() => command({ action: 'emergency_halt', reason: 'Paro manual desde ROOT' })}>EMERGENCY HALT</button>}
        {message && <output>{message}</output>}
      </section>

      <section className="continuity-grid summary">
        <article><small>ÚLTIMO CICLO</small><strong>{latestRun?.status ?? 'SIN CICLOS'}</strong><span>{latestRun?.started_at ?? '—'}</span></article>
        <article><small>CAPACIDADES SANAS</small><strong>{latestRun?.healthy_count ?? 0}/{latestRun?.capability_count ?? 0}</strong><span>fallidas {latestRun?.failed_count ?? 0}</span></article>
        <article><small>INCIDENTES ABIERTOS</small><strong>{data.incidents.length}</strong><span>requieren contención</span></article>
        <article><small>DECISIONES RESERVADAS</small><strong>{data.decisions.length}</strong><span>esperan autoridad</span></article>
      </section>

      <section className="continuity-panel">
        <h2>CAPABILITY PROBES</h2>
        <div className="continuity-table">
          <div className="row head"><span>CAPACIDAD</span><span>NIVEL</span><span>ESTADO</span><span>LATENCIA</span><span>EVIDENCIA</span></div>
          {latestByCapability.map((check) => <div className="row" key={check.capability_id}><span>{check.capability_id}</span><span>{check.autonomy_level}</span><span data-status={check.status}>{check.status}</span><span>{check.latency_ms ?? '—'} ms</span><span>{check.error_code ?? check.checked_at}</span></div>)}
          {!latestByCapability.length && <p>Sin probes registrados. Ejecute el primer heartbeat después de aplicar la migración.</p>}
        </div>
      </section>

      <section className="continuity-grid detail">
        <article><h2>INCIDENTES</h2>{data.incidents.length ? data.incidents.map((item) => <p key={item.id}><b>{item.severity}</b> · {item.title}<small>{item.error_code ?? item.status}</small></p>) : <p>Sin incidentes abiertos.</p>}</article>
        <article><h2>DECISION QUEUE</h2>{data.decisions.length ? data.decisions.map((item) => <p key={item.id}><b>{item.category}</b> · {item.title}<small>{item.safe_default ?? item.status}</small></p>) : <p>Sin decisiones reservadas.</p>}</article>
        <article><h2>REPORTES</h2>{data.reports.length ? data.reports.map((item) => <pre key={item.id}>{item.content}</pre>) : <p>Sin reportes diarios.</p>}</article>
      </section>

      <style jsx>{`
        .continuity-shell{min-height:100vh;background:#070706;color:#eee7d7;padding:28px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.continuity-header{display:flex;justify-content:space-between;gap:24px;border-bottom:1px solid #6c5a2d;padding-bottom:20px}.continuity-header span,.continuity-header small{color:#bba365;font-size:11px;letter-spacing:.15em}.continuity-header h1{font-size:28px;margin:5px 0}.continuity-header p{color:#8f8878;margin:0}.continuity-mode{border:1px solid #6c5a2d;padding:14px 18px;min-width:260px;display:grid;gap:6px}.continuity-mode strong{font-size:17px}.continuity-mode em{font-size:10px;color:#8f8878}.continuity-actions{display:flex;flex-wrap:wrap;gap:8px;padding:18px 0}.continuity-actions button{background:#15130e;color:#d8c488;border:1px solid #6c5a2d;padding:10px 13px;font:inherit;font-size:11px}.continuity-actions button:disabled{opacity:.45}.continuity-actions .danger{border-color:#7f2f2f;color:#e89b9b}.continuity-actions output{width:100%;color:#bba365}.continuity-grid{display:grid;gap:12px}.summary{grid-template-columns:repeat(4,minmax(0,1fr))}.continuity-grid article,.continuity-panel{border:1px solid #29251b;background:#0d0c09;padding:16px}.summary article{display:grid;gap:8px}.summary small{color:#8f8878}.summary strong{font-size:24px;color:#d8c488}.summary span{font-size:11px;color:#777064}.continuity-panel{margin-top:12px}.continuity-panel h2,.detail h2{font-size:12px;letter-spacing:.15em;color:#bba365}.continuity-table .row{display:grid;grid-template-columns:1.4fr .5fr .8fr .6fr 1.8fr;gap:10px;padding:9px 0;border-top:1px solid #211e17;font-size:11px}.continuity-table .head{color:#777064}.row [data-status=OPERATIONAL]{color:#84b58c}.row [data-status=FAILED]{color:#df7474}.row [data-status=DEGRADED],.row [data-status=BLOCKED]{color:#d8b768}.detail{grid-template-columns:1fr 1fr 1fr;margin-top:12px}.detail p{display:grid;gap:5px;border-top:1px solid #211e17;padding-top:9px;font-size:11px}.detail small{color:#777064}.detail pre{white-space:pre-wrap;font-size:10px;border-top:1px solid #211e17;padding-top:9px;color:#a8a08f}@media(max-width:900px){.summary,.detail{grid-template-columns:1fr}.continuity-header{display:grid}.continuity-table{overflow:auto}.continuity-table .row{min-width:760px}}
      `}</style>
    </main>
  );
}
