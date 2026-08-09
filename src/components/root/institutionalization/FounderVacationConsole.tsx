'use client';

import { useState } from 'react';

type Row = Record<string, unknown>;

const RECOMMENDATIONS = [
  ['OBSERVE_MORE', 'Seguir observando'],
  ['GENERATE', 'Sí debería generarse'],
  ['DO_NOT_GENERATE', 'No debería generarse'],
  ['ESCALATE', 'Escalar al fundador'],
] as const;

export function FounderVacationConsole({ actorLabel, accessMode }: {
  actorLabel: string;
  accessMode: 'sovereign' | 'observer';
}) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (running) return;
    setRunning(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const recommendation = String(form.get('recommendation') || 'OBSERVE_MORE');
    const rationale = String(form.get('rationale') || '').trim();
    const observerAction = String(form.get('observerAction') || '').trim();
    const evidenceRefs = String(form.get('evidenceRefs') || '')
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    const payload: Row = {
      action: 'capture',
      situation: form.get('situation'),
      inputAvailable: form.get('inputAvailable'),
      failure: form.get('blocker'),
      founderIntervention: 'FOUNDER_ABSENT · no founder intervention occurred during this observation window.',
      founderPresent: false,
      decision: observerAction || `Observer recommendation: ${recommendation}`,
      extractedRule: rationale ? `OBSERVER HYPOTHESIS · ${recommendation} · ${rationale}` : `OBSERVER HYPOTHESIS · ${recommendation}`,
      claimLimit: 'Founder on Vacations records an observer-side operational event. The recommendation is not a founder decision, verification, institutionalization or canonical rule.',
      authority: 'OPERATIONAL',
      transferClass: 'EXPERIMENTAL',
      institutionalDimensions: ['CONTINUITY', 'ROLES', 'AUTHORITY', 'REPRODUCIBILITY'],
      evidenceRefs,
      observerNote: `FOUNDER_ON_VACATIONS · observer=${actorLabel} · recommendation=${recommendation}${rationale ? ` · rationale=${rationale}` : ''}`,
    };

    try {
      const response = await fetch('/api/root/institutionalization', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null) as Row | null;
      if (!response.ok || !body || body.ok !== true) {
        throw new Error(typeof body?.error === 'string' ? body.error : `HTTP ${response.status}`);
      }
      setMessage('Observación persistida como FDRE experimental. No se promovió ninguna recomendación.');
      setOpen(false);
      window.setTimeout(() => window.location.reload(), 450);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible persistir la observación.');
    } finally {
      setRunning(false);
    }
  }

  return <section className="fv-root">
    <div className="fv-copy">
      <span>FEP-01 · MODO EXPERIMENTAL</span>
      <h2>FOUNDER ON VACATIONS?</h2>
      <p>Prueba qué puede sostener SFI cuando el fundador no interviene. El observador registra el evento, su propia acción, el bloqueo y una recomendación. ROOT soberano conserva la decisión final.</p>
      <small>{actorLabel} · {accessMode.toUpperCase()} · cada captura entra como EXPERIMENTAL / CANDIDATE</small>
    </div>
    <div className="fv-actions">
      <div><b>OBSERVER LOG</b><span>situación → acción → bloqueo → recomendación → evidencia → replay</span></div>
      <button type="button" onClick={() => setOpen(true)}>{accessMode === 'observer' ? 'REGISTRAR OBSERVACIÓN' : 'SIMULAR AUSENCIA DEL FUNDADOR'}</button>
    </div>
    {message ? <p className="fv-message">{message}</p> : null}

    {open ? <div className="fv-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <form onSubmit={submit}>
        <header><div><span>FOUNDER ON VACATIONS</span><strong>Bitácora del observador</strong></div><button type="button" onClick={() => setOpen(false)}>×</button></header>
        <p className="fv-boundary">Aquí no se suplanta autoridad. Se observa qué hace el sistema cuando el fundador no resuelve el evento.</p>
        <label>QUÉ OCURRIÓ<textarea name="situation" required placeholder="Describe el evento concreto, no una opinión general." /></label>
        <label>QUÉ INFORMACIÓN ESTABA DISPONIBLE<textarea name="inputAvailable" placeholder="Datos, señales, documentación, estado del sistema." /></label>
        <label>QUÉ HICISTE / DECIDISTE SIN EL FUNDADOR<textarea name="observerAction" required placeholder="Acción concreta tomada por el observador o por el sistema." /></label>
        <label>QUÉ QUEDÓ BLOQUEADO<textarea name="blocker" placeholder="Si nada quedó bloqueado, dilo explícitamente." /></label>
        <label>RECOMENDACIÓN DEL OBSERVADOR<select name="recommendation" defaultValue="OBSERVE_MORE">{RECOMMENDATIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>POR QUÉ<textarea name="rationale" placeholder="Razón de la recomendación; seguirá siendo hipótesis hasta revisión." /></label>
        <label>EVIDENCE REFS<textarea name="evidenceRefs" placeholder="Una referencia por línea. Déjalo vacío si todavía no existe evidencia enlazable." /></label>
        <div className="fv-form-actions"><button type="button" onClick={() => setOpen(false)}>CANCELAR</button><button disabled={running}>{running ? 'PERSISTIENDO…' : 'REGISTRAR EN FDRE'}</button></div>
      </form>
    </div> : null}

    <style jsx>{`
      .fv-root{margin:18px 5vw 0;border:1px solid rgba(200,169,81,.2);background:linear-gradient(105deg,rgba(200,169,81,.055),rgba(6,6,5,.2));padding:18px;display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr);gap:20px;color:#c8c0ad;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.fv-copy span{font-size:8px;letter-spacing:.16em;color:#8d7b4f}.fv-copy h2{margin:7px 0 8px;color:#dec986;font:400 25px Georgia,serif}.fv-copy p{margin:0;color:#8f8778;font:13px/1.65 Georgia,serif;max-width:900px}.fv-copy small{display:block;margin-top:10px;color:#5e584c;font-size:8px}.fv-actions{display:flex;flex-direction:column;justify-content:center;gap:14px;border-left:1px solid rgba(200,169,81,.1);padding-left:18px}.fv-actions div{display:grid;gap:5px}.fv-actions b{color:#a78e51;font-size:9px;letter-spacing:.1em}.fv-actions span{color:#6e675a;font-size:8px;line-height:1.5}.fv-actions button,.fv-form-actions button{border:1px solid rgba(200,169,81,.35);background:transparent;color:#d0b569;padding:10px 12px;font:9px inherit;cursor:pointer}.fv-message{grid-column:1/-1;margin:0;color:#b69d61;font-size:9px}.fv-modal{position:fixed;z-index:160;inset:0;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:24px}.fv-modal form{width:min(760px,96vw);max-height:92vh;overflow:auto;background:#080807;border:1px solid rgba(200,169,81,.28);padding:20px;display:grid;gap:12px}.fv-modal header{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid rgba(200,169,81,.1);padding-bottom:13px}.fv-modal header div{display:grid;gap:5px}.fv-modal header span{color:#8d7b4f;font-size:8px;letter-spacing:.14em}.fv-modal header strong{color:#dfc982;font:400 20px Georgia,serif}.fv-modal header button{border:0;background:none;color:#7c7468;font-size:20px}.fv-boundary{margin:0;color:#a0876d;font:italic 12px/1.6 Georgia,serif}.fv-modal label{display:grid;gap:6px;color:#786c4d;font-size:8px;letter-spacing:.1em}.fv-modal textarea,.fv-modal select{background:#0c0c0a;border:1px solid rgba(200,169,81,.16);color:#cfc4aa;padding:9px;font:11px ui-monospace,monospace}.fv-modal textarea{min-height:65px;resize:vertical}.fv-form-actions{display:flex;justify-content:flex-end;gap:8px;padding-top:4px}.fv-form-actions button:disabled{opacity:.4}@media(max-width:820px){.fv-root{grid-template-columns:1fr;margin:14px}.fv-actions{border-left:0;border-top:1px solid rgba(200,169,81,.1);padding:14px 0 0}}
    `}</style>
  </section>;
}
