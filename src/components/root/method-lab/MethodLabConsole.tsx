'use client';

import { useState } from 'react';
import type { MethodLabState } from '@/lib/method-lab/readModel';
import { APEX_SOCIOTECHNICAL_PILOT } from '@/lib/method-lab/apexPilot';

const STATUS: Record<string, string> = {
  OPERATIONAL: 'EJECUCIÓN OBSERVADA',
  GATED: 'IMPLEMENTACIÓN DISPONIBLE · SIN RUN OBSERVADO',
  AVAILABLE: 'DISPONIBLE',
  REGISTERED: 'PROTOCOLO REGISTRADO · AÚN NO INTEGRADO',
  DEGRADED: 'DEGRADADO',
};

export function MethodLabConsole({ state: initial }: { state: MethodLabState }) {
  const [state, setState] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);

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

  return <main className="ml-root">
    <header>
      <div><span>SFI · ROOT · METHOD LAB</span><h1>Un laboratorio. Múltiples protocolos.</h1><p>Olympics/CHRONOS, Cognitive Relational Lab, reentrada del Cognitive Twin y simulaciones sociotécnicas/económicas usan el mismo contrato experimental. Registrar un protocolo no constituye ejecución; simulación no constituye observación; ningún protocolo se autopromueve.</p></div>
      <button type="button" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? 'ACTUALIZANDO' : 'ACTUALIZAR ESTADO'}</button>
    </header>

    <section className="ml-policy">
      <div><small>CONTRATO</small><strong>{state.contractVersion}</strong></div>
      <div><small>PERSISTENCIA COMPARTIDA</small><strong>{state.sharedPersistence}</strong></div>
      <div><small>SALUD</small><strong>{state.status}</strong></div>
      <div className="wide"><small>REGLA EPISTÉMICA</small><p>{state.epistemicRule}</p></div>
      <div className="wide"><small>GOBERNANZA</small><p>{state.promotionRule}</p></div>
    </section>

    <section className="ml-apex">
      <div className="ml-card-head"><span>PILOTO EXTERNO · {APEX_SOCIOTECHNICAL_PILOT.contractVersion}</span><strong>{APEX_SOCIOTECHNICAL_PILOT.status}</strong></div>
      <h2>{APEX_SOCIOTECHNICAL_PILOT.name}</h2>
      <p>{APEX_SOCIOTECHNICAL_PILOT.purpose}</p>
      <dl>
        <div><dt>CASA INSTITUCIONAL</dt><dd>{APEX_SOCIOTECHNICAL_PILOT.institutionalHome}</dd></div>
        <div><dt>PROTOCOLO PADRE</dt><dd>{APEX_SOCIOTECHNICAL_PILOT.parentProtocolId}</dd></div>
        <div><dt>PARTNER</dt><dd>{APEX_SOCIOTECHNICAL_PILOT.externalParty}</dd></div>
        <div><dt>LAB SEPARADO</dt><dd>{APEX_SOCIOTECHNICAL_PILOT.notASeparateLab ? 'NO' : 'SÍ'}</dd></div>
      </dl>
      <div className="ml-store"><b>TRACKS</b>{APEX_SOCIOTECHNICAL_PILOT.tracks.map((item) => <span key={item}>{item}</span>)}</div>
      <div className="ml-card-warning">SIN RUN OBSERVADO · requiere autorización humana de Apex para cualquier cambio operacional · no autoriza ejecución automática.</div>
    </section>

    {state.warnings.length ? <section className="ml-warning">{state.warnings.map((warning) => <p key={warning}>{warning}</p>)}</section> : null}

    <section className="ml-grid">
      {state.protocols.map((protocol) => <article key={protocol.id} data-status={protocol.status}>
        <div className="ml-card-head"><span>{protocol.id}</span><strong>{STATUS[protocol.status] ?? protocol.status}</strong></div>
        <h2>{protocol.name}</h2><p>{protocol.purpose}</p>
        <dl>
          <div><dt>VERSIÓN</dt><dd>{protocol.version}</dd></div>
          <div><dt>IMPLEMENTACIÓN</dt><dd>{protocol.implementationPath}</dd></div>
          <div><dt>SUPERFICIE</dt><dd>{protocol.executionSurface ?? 'SIN SUPERFICIE'}</dd></div>
          <div><dt>CLASE</dt><dd>{protocol.epistemicClass}</dd></div>
          <div><dt>VALIDACIÓN MÁXIMA DISEÑADA</dt><dd>{protocol.maximumValidationLevel}</dd></div>
          <div><dt>RUNS OBSERVADOS</dt><dd>{protocol.runCount}</dd></div>
          <div><dt>ÚLTIMO RUN</dt><dd>{protocol.lastRunAt ?? 'NO OBSERVADO'}</dd></div>
          <div><dt>ÚLTIMO NIVEL</dt><dd>{protocol.lastValidationLevel ?? 'NO OBSERVADO'}</dd></div>
        </dl>
        <div className="ml-store"><b>PERSISTE EN</b>{protocol.persistence.map((item) => <span key={item}>{item}</span>)}</div>
        <div className="ml-actions">
          {protocol.id === 'cognitive_relational_lab' ? <a href="/root/method-lab/crl">ABRIR CRL</a> : null}
          {protocol.id === 'chronos_olympics' ? <span>LOCAL / LOOPBACK · scripts/cognitive-olympics</span> : null}
          {protocol.id === 'ct_reentry' ? <span>REENTRADA · GATE DE EVALUACIÓN</span> : null}
          {protocol.id === 'sociotechnical_simulation' ? <span>SIMULACIÓN · AGENTES SFI · APEX PILOT ADSCRITO</span> : null}
          {protocol.id === 'economic_simulation' ? <span>SIMULACIÓN ECONÓMICA · AGENTE SFI</span> : null}
        </div>
        {protocol.warnings.length ? <div className="ml-card-warning">{protocol.warnings.join(' · ')}</div> : null}
      </article>)}
    </section>
    <style jsx>{`
      .ml-root{min-height:100vh;background:#060605;color:#c8c2b3;padding:28px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;box-sizing:border-box}.ml-root header{display:flex;justify-content:space-between;gap:28px;border-bottom:1px solid rgba(197,164,75,.18);padding-bottom:20px}.ml-root header>div{max-width:1000px}.ml-root header span,.ml-policy small,.ml-card-head span,dt{font-size:8px;letter-spacing:.15em;color:#88744a}.ml-root h1{font:400 34px Georgia,serif;color:#e0d0aa;margin:7px 0}.ml-root header p{font:14px/1.6 Georgia,serif;color:#81786a;margin:0}.ml-root button{height:max-content;border:1px solid #4a3f25;background:#0a0907;color:#c3a85d;padding:9px 11px;font:9px ui-monospace,monospace}.ml-policy{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:18px 0}.ml-policy>div{border:1px solid #252117;background:#0a0907;padding:12px}.ml-policy strong{display:block;color:#c8b16d;font-size:11px;margin-top:6px}.ml-policy .wide{grid-column:span 3}.ml-policy p{margin:6px 0 0;color:#8e8677;font-size:10px;line-height:1.5}.ml-warning{border-left:2px solid #9b5f46;background:#100b08;padding:8px 12px;color:#bb8067;font-size:9px}.ml-warning p{margin:4px 0}.ml-apex{border:1px solid rgba(197,164,75,.34);background:#0b0a08;padding:16px;margin:0 0 14px}.ml-apex h2{font:400 21px Georgia,serif;color:#dfc985;margin:9px 0}.ml-apex>p{font:12px/1.55 Georgia,serif;color:#8d8578}.ml-apex dl{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:15px 0}.ml-apex dl div{border-top:1px solid #29251b;padding-top:6px}.ml-apex dd{margin:5px 0 0;font-size:9px;color:#aaa18f;overflow-wrap:anywhere}.ml-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:10px}.ml-grid article{border:1px solid #29251b;background:#0b0a08;padding:16px}.ml-grid article[data-status=OPERATIONAL]{border-color:rgba(101,159,109,.36)}.ml-grid article[data-status=DEGRADED]{border-color:rgba(180,91,74,.4)}.ml-card-head{display:flex;justify-content:space-between;gap:10px}.ml-card-head strong{font-size:8px;color:#a68d50}.ml-grid h2{font:400 19px Georgia,serif;color:#d9c89e;margin:9px 0}.ml-grid article>p{font:12px/1.55 Georgia,serif;color:#8d8578}.ml-grid dl{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:15px 0}.ml-grid dl div{border-top:1px solid #211e17;padding-top:6px}.ml-grid dd{margin:5px 0 0;font-size:9px;color:#aaa18f;overflow-wrap:anywhere}.ml-store{border-top:1px solid #29251b;padding-top:9px;display:grid;gap:4px}.ml-store b{font-size:8px;color:#806d45}.ml-store span{font-size:8px;color:#777064}.ml-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-top:11px}.ml-actions a,.ml-actions span{border:1px solid #3b3321;background:#080807;padding:7px 8px;color:#9c8855;text-decoration:none;font-size:8px}.ml-actions a{color:#ceb46b;border-color:#5a4a27}.ml-card-warning{margin-top:10px;color:#b0775f;font-size:8px;line-height:1.5}@media(max-width:700px){.ml-root{padding:18px}.ml-root header{display:grid}.ml-policy{grid-template-columns:1fr}.ml-policy .wide{grid-column:auto}.ml-apex dl{grid-template-columns:1fr 1fr}.ml-grid{grid-template-columns:1fr}}
    `}</style>
  </main>;
}
