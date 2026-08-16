'use client';

import { useMemo, useState } from 'react';
import type { MethodLabState } from '@/lib/method-lab/readModel';

const STATUS: Record<string, string> = {
  OPERATIONAL: 'EJECUCIÓN OBSERVADA',
  GATED: 'DISPONIBLE · AÚN SIN RUN OBSERVADO',
  AVAILABLE: 'DISPONIBLE',
  REGISTERED: 'REGISTRADO · SIN EJECUTOR COMPLETO',
  DEGRADED: 'DEPENDENCIA DEGRADADA',
};

type LabRunResponse = {
  ok?: boolean;
  error?: string;
  details?: string;
  labAnalysisId?: string;
  run?: { resultHash?: string; validationLevel?: string; protocolId?: string };
};

export function MethodLabConsole({ state: initial }: { state: MethodLabState }) {
  const [state, setState] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [running, setRunning] = useState(false);
  const [protocol, setProtocol] = useState<'sociotechnical_simulation' | 'economic_simulation'>('sociotechnical_simulation');
  const [evidenceInput, setEvidenceInput] = useState('');
  const [runResult, setRunResult] = useState<LabRunResponse | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const configuredProviders = useMemo(() => state.llmProviders.filter((provider) => provider.available), [state.llmProviders]);

  async function refresh() {
    setRefreshing(true);
    try {
      const response = await fetch('/api/root/method-lab', { credentials: 'include', cache: 'no-store' });
      const body = await response.json().catch(() => null) as { ok?: boolean; lab?: MethodLabState } | null;
      if (response.ok && body?.ok && body.lab) setState(body.lab);
    } finally {
      setRefreshing(false);
    }
  }

  async function runSimulation() {
    const evidenceIds = [...new Set(evidenceInput.split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean))];
    if (!evidenceIds.length || running) return;
    setRunning(true);
    setRunError(null);
    setRunResult(null);
    try {
      const response = await fetch('/api/root/method-lab/simulate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocolId: protocol, evidenceIds }),
      });
      const body = await response.json().catch(() => null) as LabRunResponse | null;
      if (!response.ok || !body?.ok) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      setRunResult(body);
      await refresh();
    } catch (error) {
      setRunError(error instanceof Error ? error.message : 'METHOD_LAB_RUN_FAILED');
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="ml-root">
      <header className="ml-header">
        <div>
          <span>SYSTEM FRICTION INSTITUTE · METHOD LAB</span>
          <h1>Un laboratorio. Múltiples protocolos.</h1>
          <p>Prueba métodos y modelos sin confundir simulación con realidad. Todo resultado conserva procedencia, nivel de validación y límites; ninguna ejecución se autopromueve.</p>
        </div>
        <nav>
          <a href="/pipeline">PIPELINE SFI</a>
          <a href="/root/readiness">READINESS</a>
          <button type="button" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? 'ACTUALIZANDO' : 'ACTUALIZAR'}</button>
        </nav>
      </header>

      <section className="ml-statusbar">
        <div><small>CONTRATO</small><strong>{state.contractVersion}</strong></div>
        <div><small>ESTADO</small><strong>{state.status}</strong></div>
        <div><small>PERSISTENCIA</small><strong>{state.sharedPersistence}</strong></div>
        <div><small>IA CONFIGURADA</small><strong>{configuredProviders.length}/{state.llmProviders.length}</strong></div>
      </section>

      <section className="ml-rule-grid">
        <article><span>REGLA EPISTÉMICA</span><p>{state.epistemicRule}</p></article>
        <article><span>AUTORIDAD</span><p>{state.promotionRule}</p></article>
      </section>

      <section className="ml-ai">
        <header><div><span>MODEL SUBSTRATE</span><h2>Proveedores de IA</h2></div><small>CONFIGURACIÓN ≠ EJECUCIÓN OBSERVADA</small></header>
        <div className="ml-ai-grid">
          {state.llmProviders.map((provider) => (
            <article key={provider.id} data-available={provider.available}>
              <div><strong>{provider.id.toUpperCase()}</strong><b>{provider.available ? 'CONFIGURADO' : 'NO CONFIGURADO'}</b></div>
              <p>{provider.model}</p>
              <small>{provider.role}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="ml-bench">
        <div className="ml-bench-copy">
          <span>BANCO DE PRUEBA</span>
          <h2>Ejecutar sobre evidencia existente.</h2>
          <p>Introduce IDs de evidencia ya persistidos. El laboratorio valida las referencias y ejecuta el protocolo real; no crea evidencia para conseguir un resultado.</p>
        </div>
        <div className="ml-bench-form">
          <label>PROTOCOLO
            <select value={protocol} onChange={(event) => setProtocol(event.target.value as typeof protocol)}>
              <option value="sociotechnical_simulation">SIMULACIÓN SOCIOTÉCNICA</option>
              <option value="economic_simulation">SIMULACIÓN ECONÓMICA</option>
            </select>
          </label>
          <label>EVIDENCE IDS
            <textarea value={evidenceInput} onChange={(event) => setEvidenceInput(event.target.value)} placeholder="UUID-1, UUID-2…" />
          </label>
          <button type="button" onClick={() => void runSimulation()} disabled={running || !evidenceInput.trim()}>{running ? 'EJECUTANDO…' : 'EJECUTAR PROTOCOLO'}</button>
        </div>
        {runResult?.ok ? <div className="ml-run-result"><strong>RUN PERSISTIDO</strong><span>{runResult.labAnalysisId ?? 'ID NO DEVUELTO'}</span><small>{runResult.run?.resultHash ? `hash ${runResult.run.resultHash}` : 'sin hash reportado'}</small></div> : null}
        {runError ? <div className="ml-run-error">{runError}</div> : null}
      </section>

      {state.warnings.length ? <section className="ml-warning">{state.warnings.map((warning) => <p key={warning}>{warning}</p>)}</section> : null}

      <section className="ml-grid">
        {state.protocols.map((item) => (
          <article key={item.id} data-status={item.status}>
            <div className="ml-card-head"><span>{item.id}</span><strong>{STATUS[item.status] ?? item.status}</strong></div>
            <h2>{item.name}</h2>
            <p>{item.purpose}</p>
            <dl>
              <div><dt>VERSIÓN</dt><dd>{item.version}</dd></div>
              <div><dt>CLASE</dt><dd>{item.epistemicClass}</dd></div>
              <div><dt>RUNS OBSERVADOS</dt><dd>{item.runCount}</dd></div>
              <div><dt>ÚLTIMO RUN</dt><dd>{item.lastRunAt ?? 'NO OBSERVADO'}</dd></div>
              <div><dt>NIVEL MÁXIMO DISEÑADO</dt><dd>{item.maximumValidationLevel}</dd></div>
              <div><dt>ÚLTIMO NIVEL</dt><dd>{item.lastValidationLevel ?? 'NO OBSERVADO'}</dd></div>
            </dl>
            <div className="ml-dependencies">
              <b>DEPENDENCIAS</b>
              {item.dependencies.length ? item.dependencies.map((dependency) => <span key={dependency.table} data-ready={dependency.available}>{dependency.available ? 'READY' : 'MISSING'} · {dependency.table}</span>) : <span data-ready={true}>SIN DEPENDENCIAS PERSISTENTES</span>}
            </div>
            <div className="ml-actions">
              {item.id === 'cognitive_relational_lab' ? <span>CRL · CONTROL INTEGRADO EN ESTA VISTA</span> : null}
              {item.id === 'chronos_olympics' ? <span>CHRONOS · HARNESS SELLADO / LOCAL</span> : null}
              {item.id === 'ct_reentry' ? <span>REENTRY · EVALUACIÓN GOBERNADA</span> : null}
              {item.id === 'sociotechnical_simulation' ? <span>SIMULACIÓN SOCIOTÉCNICA</span> : null}
              {item.id === 'economic_simulation' ? <span>SIMULACIÓN ECONÓMICA</span> : null}
            </div>
            {item.warnings.length ? <details><summary>LÍMITES / WARNINGS</summary>{item.warnings.map((warning) => <p key={warning}>{warning}</p>)}</details> : null}
          </article>
        ))}
      </section>

      <style jsx>{`
        .ml-root{min-height:100vh;background:#09121a;color:#e8edf0;padding:30px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;box-sizing:border-box}.ml-header{display:flex;justify-content:space-between;gap:36px;align-items:flex-start;border-bottom:1px solid #33495c;padding-bottom:22px}.ml-header>div{max-width:930px}.ml-header span,.ml-rule-grid span,.ml-ai header span,.ml-bench-copy>span,.ml-card-head span,dt,.ml-dependencies>b{font-size:8px;letter-spacing:.17em;color:#c8aa6d}.ml-header h1{font:400 clamp(32px,4vw,54px)/1 Georgia,serif;letter-spacing:-.025em;color:#f4f6f7;margin:8px 0 12px}.ml-header p{font:14px/1.65 Georgia,serif;color:#91a0ac;margin:0}.ml-header nav{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.ml-header a,.ml-header button{border:1px solid #425a6d;background:#0d1923;color:#d5dde2;padding:9px 11px;text-decoration:none;font:8px ui-monospace,monospace;letter-spacing:.08em}.ml-header button{color:#ddc58d;cursor:pointer}.ml-statusbar{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#33495c;margin:18px 0}.ml-statusbar>div{background:#0c1822;padding:13px}.ml-statusbar small{display:block;color:#7f92a1;font-size:8px;letter-spacing:.12em}.ml-statusbar strong{display:block;margin-top:7px;color:#e7d3a1;font-size:11px;overflow-wrap:anywhere}.ml-rule-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}.ml-rule-grid article{border:1px solid #263a4a;background:#0c1720;padding:16px}.ml-rule-grid p{margin:7px 0 0;color:#9aa8b2;font:12px/1.6 Georgia,serif}.ml-ai,.ml-bench{border:1px solid #33495c;background:#0c1720;padding:18px;margin-bottom:14px}.ml-ai>header{display:flex;justify-content:space-between;gap:18px;align-items:end}.ml-ai h2,.ml-bench h2{margin:6px 0 0;color:#f0f3f5;font:400 24px Georgia,serif}.ml-ai header small{font-size:8px;color:#7e909e}.ml-ai-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:15px}.ml-ai-grid article{border:1px solid #263a4a;background:#09131b;padding:12px}.ml-ai-grid article[data-available=false]{opacity:.52}.ml-ai-grid article>div{display:flex;justify-content:space-between;gap:8px}.ml-ai-grid strong{font-size:9px;color:#edf1f3}.ml-ai-grid b{font-size:7px;color:#86a08e}.ml-ai-grid article[data-available=false] b{color:#8c8790}.ml-ai-grid p{margin:8px 0 4px;color:#d8c38e;font-size:10px}.ml-ai-grid small{color:#788a97;font-size:8px;line-height:1.5}.ml-bench{display:grid;grid-template-columns:minmax(260px,.8fr) minmax(360px,1.2fr);gap:22px}.ml-bench-copy p{color:#91a0ac;font:12px/1.6 Georgia,serif}.ml-bench-form{display:grid;gap:10px}.ml-bench label{display:grid;gap:5px;color:#8195a3;font-size:8px;letter-spacing:.1em}.ml-bench select,.ml-bench textarea{width:100%;box-sizing:border-box;border:1px solid #3a5265;background:#081119;color:#e7ecef;padding:10px;font:10px ui-monospace,monospace}.ml-bench textarea{min-height:82px;resize:vertical}.ml-bench button{border:1px solid #b69759;background:#c2a464;color:#081119;padding:10px 12px;font:700 9px ui-monospace,monospace;letter-spacing:.08em;cursor:pointer}.ml-bench button:disabled{opacity:.4}.ml-run-result,.ml-run-error{grid-column:1/-1;border-top:1px solid #33495c;padding-top:12px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;font-size:9px}.ml-run-result strong{color:#a9c5b3}.ml-run-result span{color:#edf1f3}.ml-run-result small{color:#8193a0}.ml-run-error{color:#d19380}.ml-warning{border-left:2px solid #9e7456;background:#151617;padding:8px 12px;margin-bottom:14px;color:#c18f77;font-size:9px}.ml-warning p{margin:4px 0}.ml-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:9px}.ml-grid>article{border:1px solid #2c4253;background:#0b161f;padding:17px}.ml-grid>article[data-status=OPERATIONAL]{border-top-color:#7d9c87}.ml-grid>article[data-status=DEGRADED]{border-top-color:#9f6e5d}.ml-card-head{display:flex;justify-content:space-between;gap:10px}.ml-card-head strong{font-size:8px;color:#8fa2b0}.ml-grid h2{font:400 20px Georgia,serif;color:#f0f3f5;margin:9px 0}.ml-grid>article>p{font:12px/1.55 Georgia,serif;color:#8e9eaa}.ml-grid dl{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:15px 0}.ml-grid dl div{border-top:1px solid #253948;padding-top:7px}.ml-grid dd{margin:5px 0 0;font-size:9px;color:#c1cbd1;overflow-wrap:anywhere}.ml-dependencies{border-top:1px solid #304657;padding-top:10px;display:grid;gap:4px}.ml-dependencies span{font-size:8px;color:#b98778}.ml-dependencies span[data-ready=true]{color:#819f8a}.ml-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.ml-actions span{border:1px solid #3b5264;padding:7px 8px;color:#d2bb84;font-size:8px}.ml-grid details{margin-top:12px;border-top:1px solid #2b4050;padding-top:9px}.ml-grid summary{color:#879aa8;font-size:8px;cursor:pointer}.ml-grid details p{font-size:8px;line-height:1.5;color:#9b887f}@media(max-width:900px){.ml-header{display:grid}.ml-header nav{justify-content:flex-start}.ml-statusbar{grid-template-columns:1fr 1fr}.ml-ai-grid{grid-template-columns:1fr 1fr}.ml-bench{grid-template-columns:1fr}}@media(max-width:560px){.ml-root{padding:18px}.ml-rule-grid,.ml-statusbar,.ml-ai-grid,.ml-grid dl{grid-template-columns:1fr}}
      `}</style>
    </main>
  );
}
