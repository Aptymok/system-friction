'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type Row = Record<string, unknown>;
type ReportType =
  | 'world_vector_internal'
  | 'world_vector_public'
  | 'ifnorm'
  | 'sfi_dr01'
  | 'neural_graph_evidence'
  | 'amv_recurrence'
  | 'calibration'
  | 'atlas_entry'
  | 'linkedin_draft'
  | 'contact_draft';

type ReportOption = {
  type: ReportType;
  label: string;
  question: string;
  description: string;
  requiresSubject: boolean;
  acceptsSubject: boolean;
  subjectLabel?: string;
  subjectPlaceholder?: string;
  inputExplanation: string;
  recommended?: boolean;
};

type OpportunityInput = {
  entityName: string;
  sector: string;
  source: string;
  publicSignal: string;
  notes: string;
};

const EMPTY_OPPORTUNITY: OpportunityInput = { entityName: '', sector: '', source: '', publicSignal: '', notes: '' };

const REPORT_OPTIONS: ReportOption[] = [
  {
    type: 'world_vector_internal',
    label: 'Estado institucional',
    question: '¿Qué está viendo SFI ahora?',
    description: 'Resume señales, tensiones, fuentes degradadas y lectura interna del World Vector sin convertirla en publicación.',
    requiresSubject: false,
    acceptsSubject: false,
    inputExplanation: 'Nada. SFI usa el estado institucional y la evidencia persistida disponible.',
    recommended: true,
  },
  {
    type: 'neural_graph_evidence',
    label: 'Evidencia y trazabilidad',
    question: '¿Qué está sustentado y qué no?',
    description: 'Lee el grafo para separar nodos con soporte, huecos de linaje, contradicciones y evidencia relacionada.',
    requiresSubject: false,
    acceptsSubject: true,
    subjectLabel: 'FOCO OPCIONAL',
    subjectPlaceholder: 'Ej. Governance, REM618, Caso 01, Cognitive Twin',
    inputExplanation: 'No necesitas escribir nada para una lectura global. Si quieres revisar un objeto concreto, escribe su nombre.',
    recommended: true,
  },
  {
    type: 'calibration',
    label: 'Calibración',
    question: '¿Dónde puede SFI estar sobreafirmando?',
    description: 'Busca desajustes entre evidencia, confianza, claims, ejecución y estado declarado.',
    requiresSubject: false,
    acceptsSubject: true,
    subjectLabel: 'FOCO OPCIONAL',
    subjectPlaceholder: 'Ej. continuidad institucional, MIHM, Studio',
    inputExplanation: 'Nada para calibración global; un foco sólo limita la lectura a un dominio concreto.',
    recommended: true,
  },
  {
    type: 'amv_recurrence',
    label: 'Recurrencias AMV',
    question: '¿Qué patrón está reapareciendo?',
    description: 'Busca recurrencias en memoria, evidencia y trayectoria para señalar patrones persistentes sin confundir recurrencia con causalidad.',
    requiresSubject: false,
    acceptsSubject: true,
    subjectLabel: 'FOCO OPCIONAL',
    subjectPlaceholder: 'Ej. latencia, cierre prematuro, señal cultural',
    inputExplanation: 'Nada para una búsqueda global; puedes dar un patrón o fenómeno para acotar la memoria consultada.',
    recommended: true,
  },
  {
    type: 'ifnorm',
    label: 'Cazador de posibilidades',
    question: '¿Qué empresa tiene una fricción que SFI puede convertir en propuesta?',
    description: 'Ejecuta ClientFinder + IFNORM para devolver empresa, origen de la señal, dolor observable, evidencia, oferta SFI y siguiente acción.',
    requiresSubject: false,
    acceptsSubject: false,
    inputExplanation: 'Indica empresa, origen y señal observada. SFI deriva el dolor como hipótesis, recomienda una oferta y conserva lo que aún falta verificar.',
    recommended: true,
  },
  {
    type: 'sfi_dr01',
    label: 'Expediente SFI-DR01',
    question: '¿Qué fricción muestra este caso?',
    description: 'Construye una lectura diagnóstica de un caso concreto usando evidencia disponible y límites explícitos.',
    requiresSubject: true,
    acceptsSubject: true,
    subjectLabel: 'CASO / SISTEMA',
    subjectPlaceholder: 'Ej. Caso 01 · Kavak',
    inputExplanation: 'Escribe el caso, sistema u objeto que quieres diagnosticar. El reporte no adivinará el foco.',
  },
  {
    type: 'atlas_entry',
    label: 'Entrada Atlas',
    question: '¿Qué fenómeno debe conservarse?',
    description: 'Prepara una entrada de memoria relacional para un fenómeno concreto, con procedencia y límites de interpretación.',
    requiresSubject: true,
    acceptsSubject: true,
    subjectLabel: 'FENÓMENO / OBJETO',
    subjectPlaceholder: 'Ej. REM618 · apertura de campo',
    inputExplanation: 'Nombra el fenómeno u objeto que debe convertirse en entrada Atlas.',
  },
  {
    type: 'world_vector_public',
    label: 'World Vector público',
    question: '¿Qué lectura podría hacerse pública?',
    description: 'Genera un borrador público desde el estado disponible. Sigue siendo borrador y requiere aprobación humana.',
    requiresSubject: false,
    acceptsSubject: false,
    inputExplanation: 'Nada. Parte del estado World Vector disponible y conserva la separación entre borrador y publicación.',
  },
  {
    type: 'linkedin_draft',
    label: 'Borrador LinkedIn',
    question: '¿Qué puede comunicarse sin sobreafirmar?',
    description: 'Produce un borrador editorial a partir de evidencia y estado persistidos. No publica automáticamente.',
    requiresSubject: false,
    acceptsSubject: true,
    subjectLabel: 'TEMA OPCIONAL',
    subjectPlaceholder: 'Ej. Caso 01 · latencia de ejecución',
    inputExplanation: 'Puedes dejarlo vacío para que SFI use el estado más relevante o indicar el tema que quieres convertir en borrador.',
  },
  {
    type: 'contact_draft',
    label: 'Borrador de contacto',
    question: '¿Qué mensaje se podría preparar?',
    description: 'Prepara un borrador de contacto para una entidad o persona. No envía nada y debe pasar por aprobación.',
    requiresSubject: true,
    acceptsSubject: true,
    subjectLabel: 'DESTINATARIO / FOCO',
    subjectPlaceholder: 'Ej. Empresa X · responsable de operaciones',
    inputExplanation: 'Indica para quién o para qué relación quieres preparar el mensaje.',
  },
];

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
function text(value: unknown, fallback = '—') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
function when(value: unknown) {
  if (typeof value !== 'string') return 'SIN FECHA';
  const date = new Date(value);
  return Number.isFinite(date.valueOf()) ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : value;
}

export function RootReportsConsole({ initialReports, canGenerate, actorLabel }: {
  initialReports: Row[];
  canGenerate: boolean;
  actorLabel: string;
}) {
  const [reports, setReports] = useState<Row[]>(initialReports);
  const [selectedId, setSelectedId] = useState<string | null>(() => text(initialReports[0]?.id, '') || null);
  const [type, setType] = useState<ReportType>('world_vector_internal');
  const [subject, setSubject] = useState('');
  const [opportunity, setOpportunity] = useState<OpportunityInput>(EMPTY_OPPORTUNITY);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const option = REPORT_OPTIONS.find((item) => item.type === type) ?? REPORT_OPTIONS[0];
  const selected = useMemo(
    () => reports.find((row) => text(row.id, '') === selectedId) ?? reports[0] ?? null,
    [reports, selectedId],
  );
  const output = record(selected?.output_envelope);
  const trace = record(output.trace);
  const inputSnapshot = record(selected?.input_snapshot);
  const persistedIfnorm = record(inputSnapshot.ifnorm);
  const evidence = strings(output.evidence).length ? strings(output.evidence) : strings(selected?.evidence_refs);
  const warnings = strings(output.warnings).length ? strings(output.warnings) : strings(selected?.limitations);
  const opportunityReady = Boolean(opportunity.entityName.trim() && opportunity.source.trim() && opportunity.publicSignal.trim());
  const canRunSelection = canGenerate && !running && (type === 'ifnorm' ? opportunityReady : (!option.requiresSubject || Boolean(subject.trim())));

  function choose(nextType: ReportType) {
    setType(nextType);
    setSubject('');
    setOpportunity(EMPTY_OPPORTUNITY);
    setMessage(null);
  }

  function setOpportunityField<K extends keyof OpportunityInput>(key: K, value: OpportunityInput[K]) {
    setOpportunity((current) => ({ ...current, [key]: value }));
  }

  async function generate() {
    if (!canRunSelection) return;
    setRunning(true);
    setMessage(null);
    try {
      let generatedIfnorm: Row | null = null;
      let reportSubject = option.acceptsSubject && subject.trim() ? subject.trim() : undefined;

      if (type === 'ifnorm') {
        const finderResponse = await fetch('/api/root/agentic/client-finder', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(opportunity),
        });
        const finderBody = await finderResponse.json().catch(() => null) as Row | null;
        if (!finderResponse.ok || !finderBody || finderBody.ok !== true) {
          throw new Error(text(finderBody?.details ?? finderBody?.error, `ClientFinder HTTP ${finderResponse.status}`));
        }
        generatedIfnorm = record(finderBody.ifnorm);
        reportSubject = opportunity.entityName.trim();
      }

      const response = await fetch('/api/root/agentic/report', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, subject: reportSubject, ifnorm: generatedIfnorm }),
      });
      const body = await response.json().catch(() => null) as Row | null;
      if (!response.ok || !body || body.ok !== true) throw new Error(text(body?.details ?? body?.error, `HTTP ${response.status}`));
      const run = record(body.reportRun);
      if (text(run.id, '')) {
        setReports((current) => [run, ...current.filter((row) => text(row.id, '') !== text(run.id, ''))]);
        setSelectedId(text(run.id, ''));
      }
      setMessage(type === 'ifnorm'
        ? 'ClientFinder + IFNORM ejecutados. El resultado quedó persistido como reporte para revisión; no se contactó a nadie.'
        : 'Reporte generado y persistido en Cognitive Twin Runs. Sigue siendo un output para lectura/revisión, no una verdad canónica.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible generar el reporte.');
    } finally {
      setRunning(false);
    }
  }

  return <main className="rr-root">
    <header className="rr-header">
      <div>
        <span>SFI · ROOT · REPORTES</span>
        <h1>¿Qué quieres que SFI te explique?</h1>
        <p>No necesitas conocer el nombre técnico del agente. Elige la pregunta que quieres resolver; ROOT selecciona el contrato de reporte correspondiente y usa evidencia persistida.</p>
      </div>
      <div className="rr-meta"><strong>{actorLabel}</strong><Link href="/root">VOLVER A ROOT</Link></div>
    </header>

    <section className="rr-question-zone">
      <div className="rr-zone-title"><span>PREGUNTAS RECOMENDADAS</span><small>empieza aquí si sólo quieres entender el estado de SFI</small></div>
      <div className="rr-question-grid">
        {REPORT_OPTIONS.filter((item) => item.recommended).map((item) => <button key={item.type} type="button" className={type === item.type ? 'active' : ''} onClick={() => choose(item.type)} disabled={!canGenerate || running}>
          <span>{item.label}</span><strong>{item.question}</strong><p>{item.description}</p>
        </button>)}
      </div>
      <details className="rr-more">
        <summary>OTROS REPORTES / BORRADORES</summary>
        <div className="rr-more-grid">{REPORT_OPTIONS.filter((item) => !item.recommended).map((item) => <button key={item.type} type="button" className={type === item.type ? 'active' : ''} onClick={() => choose(item.type)} disabled={!canGenerate || running}><span>{item.label}</span><strong>{item.question}</strong></button>)}</div>
      </details>
    </section>

    <section className="rr-compose">
      <div className="rr-selected-question">
        <span>VAS A GENERAR</span>
        <strong>{option.question}</strong>
        <p>{option.description}</p>
        <small>CONTRATO INTERNO · {option.type}</small>
      </div>
      <div className="rr-needed">
        <span>QUÉ NECESITA DE TI</span>
        <p>{option.inputExplanation}</p>
        {type === 'ifnorm' ? <div className="rr-opportunity-inputs">
          <label>EMPRESA / ENTIDAD <b>REQUERIDO</b><input value={opportunity.entityName} onChange={(event) => setOpportunityField('entityName', event.target.value)} placeholder="Ej. FEMSA" disabled={!canGenerate || running} /></label>
          <label>ORIGEN / FUENTE <b>REQUERIDO</b><input value={opportunity.source} onChange={(event) => setOpportunityField('source', event.target.value)} placeholder="Ej. comunicado, nota, sitio oficial, evidencia interna" disabled={!canGenerate || running} /></label>
          <label>SEÑAL / QUÉ ESTÁ PASANDO <b>REQUERIDO</b><textarea value={opportunity.publicSignal} onChange={(event) => setOpportunityField('publicSignal', event.target.value)} placeholder="Describe lo observable; SFI separará esto del dolor inferido." disabled={!canGenerate || running} /></label>
          <label>SECTOR <i>OPCIONAL</i><input value={opportunity.sector} onChange={(event) => setOpportunityField('sector', event.target.value)} placeholder="Ej. logística, retail, fintech" disabled={!canGenerate || running} /></label>
          <label>NOTAS <i>OPCIONAL</i><textarea value={opportunity.notes} onChange={(event) => setOpportunityField('notes', event.target.value)} placeholder="Contexto adicional, persona/rol o restricción." disabled={!canGenerate || running} /></label>
        </div> : option.acceptsSubject ? <label>{option.subjectLabel ?? 'FOCO'}{option.requiresSubject ? <b>REQUERIDO</b> : <i>OPCIONAL</i>}
          <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder={option.subjectPlaceholder} disabled={!canGenerate || running} />
        </label> : <div className="rr-no-input">SIN INPUT MANUAL · usa estado persistido</div>}
      </div>
      <div className="rr-generate">
        <button type="button" onClick={() => void generate()} disabled={!canRunSelection}>{running ? 'GENERANDO…' : canGenerate ? 'GENERAR ESTE REPORTE' : 'OBSERVER · SOLO LECTURA'}</button>
        {type === 'ifnorm' && !opportunityReady ? <small>Faltan empresa, origen y señal observable.</small> : option.requiresSubject && !subject.trim() ? <small>Falta indicar {option.subjectLabel?.toLowerCase() ?? 'el foco'}.</small> : <small>Generar no aprueba, publica ni ejecuta acciones externas.</small>}
      </div>
      {message ? <p className="rr-message">{message}</p> : null}
    </section>

    <section className="rr-workspace">
      <aside className="rr-list">
        <div className="rr-list-title"><span>HISTORIAL</span><b>{reports.length}</b></div>
        {reports.length ? reports.map((row) => {
          const envelope = record(row.output_envelope);
          const id = text(row.id, '');
          return <button key={id || text(row.task_id)} type="button" className={selectedId === id ? 'active' : ''} onClick={() => setSelectedId(id)}>
            <span>{text(envelope.title, text(row.objective, 'Reporte'))}</span>
            <small>{when(row.created_at)} · {text(row.status, 'UNKNOWN')}</small>
          </button>;
        }) : <div className="rr-empty"><strong>TODAVÍA NO HAY REPORTES.</strong><p>Elige una pregunta arriba. Para “¿Qué está viendo SFI ahora?” no tienes que escribir absolutamente nada.</p></div>}
      </aside>

      <article className="rr-reader">
        {selected ? <>
          <div className="rr-kicker">{text(output.type, 'report').replaceAll('_', ' ')} · {text(selected.status, 'UNKNOWN')}</div>
          <h2>{text(output.title, text(selected.objective, 'Reporte'))}</h2>
          <div className="rr-runmeta"><span>{when(selected.created_at)}</span><span>{text(selected.provider, text(output.provider, 'provider n/d'))}</span><span>{evidence.length} evidencias referenciadas</span></div>
          {Object.keys(persistedIfnorm).length ? <section className="rr-opportunity-result">
            <div><span>EMPRESA</span><strong>{text(persistedIfnorm.entity_name)}</strong></div>
            <div><span>ORIGEN</span><strong>{text(persistedIfnorm.source)}</strong></div>
            <div><span>QUÉ LE DUELE</span><strong>{text(persistedIfnorm.detected_pain)}</strong></div>
            <div><span>QUÉ PUEDE OFRECER SFI</span><strong>{text(persistedIfnorm.recommended_offer)}</strong></div>
            <div className="wide"><span>POR QUÉ ENCAJA</span><strong>{text(persistedIfnorm.why_sfi_fits)}</strong></div>
            <div className="wide"><span>SIGUIENTE ACCIÓN</span><strong>{text(persistedIfnorm.recommended_action)}</strong></div>
          </section> : null}
          <div className="rr-body">{text(output.body, 'MISSING · el run no contiene body legible.')}</div>
          <details open><summary>EVIDENCIA UTILIZADA · {evidence.length}</summary>{evidence.length ? <ul>{evidence.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>MISSING · no hay referencias de evidencia persistidas para este reporte.</p>}</details>
          <details><summary>PROVENANCE / TRACE</summary><pre>{Object.keys(trace).length ? JSON.stringify(trace, null, 2) : 'MISSING · no hay trace persistido.'}</pre></details>
          <details><summary>LIMITACIONES / WARNINGS · {warnings.length}</summary>{warnings.length ? <ul>{warnings.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>Sin warnings declarados en este run.</p>}</details>
          <details><summary>ESTADO DE APROBACIÓN</summary><pre>{JSON.stringify(record(output.approval_queue), null, 2)}</pre></details>
        </> : <div className="rr-empty-reader"><strong>NO HAY NADA QUE LEER TODAVÍA.</strong><p>Selecciona una pregunta en la parte superior y genera el primer reporte.</p></div>}
      </article>
    </section>

    <style jsx>{`
      .rr-root{min-height:100vh;background:#060605;color:#c8c4b8;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;padding:28px;box-sizing:border-box}.rr-header{display:flex;justify-content:space-between;gap:30px;border-bottom:1px solid rgba(200,169,81,.18);padding-bottom:22px}.rr-header span,.rr-kicker,.rr-zone-title span,.rr-selected-question>span,.rr-needed>span{font-size:9px;letter-spacing:.16em;color:#9d8654}.rr-header h1{margin:7px 0 8px;font:400 34px Georgia,serif;color:#e3d4b0}.rr-header p{margin:0;max-width:900px;color:#81796c;font:14px/1.6 Georgia,serif}.rr-meta{display:flex;align-items:flex-start;gap:10px;font-size:9px}.rr-meta strong,.rr-meta a{border:1px solid rgba(200,169,81,.24);padding:8px 10px;color:#baa665;text-decoration:none}
      .rr-question-zone{padding:20px 0;border-bottom:1px solid rgba(200,169,81,.1)}.rr-zone-title{display:flex;justify-content:space-between;gap:15px;margin-bottom:12px}.rr-zone-title small{font-size:8px;color:#5f594e}.rr-question-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:9px}.rr-question-grid button{min-height:150px;text-align:left;border:1px solid rgba(200,169,81,.12);background:#090908;padding:15px;color:#a69e90;cursor:pointer}.rr-question-grid button:hover,.rr-question-grid button.active,.rr-more-grid button.active{border-color:rgba(200,169,81,.52);background:rgba(200,169,81,.045)}.rr-question-grid button span,.rr-more-grid button span{display:block;font-size:8px;color:#89774d;letter-spacing:.08em}.rr-question-grid button strong,.rr-more-grid button strong{display:block;margin-top:8px;color:#dec88d;font:400 17px/1.25 Georgia,serif}.rr-question-grid button p{font:11px/1.55 Georgia,serif;color:#716b60}.rr-question-grid button:disabled,.rr-more-grid button:disabled{opacity:.45;cursor:not-allowed}.rr-more{margin-top:12px}.rr-more summary{cursor:pointer;color:#75684a;font-size:8px;letter-spacing:.12em}.rr-more-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px}.rr-more-grid button{text-align:left;border:1px solid rgba(200,169,81,.08);background:#080807;padding:11px;color:#999;cursor:pointer}.rr-more-grid button strong{font-size:14px}
      .rr-compose{display:grid;grid-template-columns:1.1fr 1.4fr 240px;gap:18px;align-items:stretch;padding:20px 0;border-bottom:1px solid rgba(200,169,81,.1)}.rr-selected-question,.rr-needed,.rr-generate{border:1px solid rgba(200,169,81,.08);padding:15px;background:#080807}.rr-selected-question strong{display:block;margin-top:8px;color:#e1cd95;font:400 21px/1.3 Georgia,serif}.rr-selected-question p,.rr-needed p{color:#827a6c;font:11px/1.6 Georgia,serif}.rr-selected-question small{font-size:7px;color:#4e4a42}.rr-needed label{display:grid;gap:7px;margin-top:12px;color:#766b50;font-size:8px;letter-spacing:.1em}.rr-needed label b,.rr-needed label i{font-size:7px;font-style:normal;color:#b67d63}.rr-needed label i{color:#6e675a}.rr-needed input,.rr-needed textarea{background:#0a0a09;border:1px solid rgba(200,169,81,.22);color:#d5c7a7;padding:10px;font:11px ui-monospace,monospace}.rr-needed textarea{min-height:70px;resize:vertical}.rr-opportunity-inputs{display:grid;grid-template-columns:1fr 1fr;gap:0 10px}.rr-opportunity-inputs label:nth-child(3),.rr-opportunity-inputs label:nth-child(5){grid-column:1/-1}.rr-no-input{margin-top:14px;border-left:2px solid rgba(91,151,101,.55);padding:10px;color:#7cad83;font-size:8px}.rr-generate{display:flex;flex-direction:column;justify-content:center}.rr-generate button{min-height:48px;border:1px solid rgba(200,169,81,.42);background:rgba(200,169,81,.03);color:#d3b96e;padding:0 15px;font:9px ui-monospace,monospace;letter-spacing:.08em}.rr-generate button:disabled{opacity:.35}.rr-generate small{margin-top:9px;color:#625c51;font-size:8px;line-height:1.5}.rr-message{grid-column:1/-1;margin:0;color:#ad9967;font-size:9px}
      .rr-workspace{display:grid;grid-template-columns:minmax(280px,360px) 1fr;min-height:520px}.rr-list{border-right:1px solid rgba(200,169,81,.1);padding:15px 14px 15px 0;max-height:720px;overflow:auto;scrollbar-width:thin;scrollbar-color:rgba(200,169,81,.24) transparent}.rr-list-title{display:flex;justify-content:space-between;padding:0 5px 10px;color:#6f644a;font-size:8px;letter-spacing:.15em}.rr-list button{width:100%;display:grid;gap:4px;text-align:left;background:transparent;border:0;border-bottom:1px solid rgba(200,169,81,.06);padding:11px 8px;color:#aaa399;font:10px ui-monospace,monospace;cursor:pointer}.rr-list button.active{background:rgba(200,169,81,.06);color:#e0c987;border-left:2px solid #a98b45}.rr-list button small{color:#5d584e;font-size:8px}.rr-reader{padding:30px 38px;max-height:720px;overflow:auto;scrollbar-width:thin;scrollbar-color:rgba(200,169,81,.24) transparent}.rr-reader h2{font:400 28px/1.2 Georgia,serif;color:#e7d8b4;margin:8px 0 12px}.rr-runmeta{display:flex;gap:14px;flex-wrap:wrap;color:#5e594f;font-size:8px;padding-bottom:22px}.rr-opportunity-result{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0 0 24px}.rr-opportunity-result>div{border:1px solid rgba(93,151,103,.16);background:rgba(63,118,72,.035);padding:11px}.rr-opportunity-result .wide{grid-column:span 2}.rr-opportunity-result span{display:block;color:#638069;font-size:7px;letter-spacing:.1em}.rr-opportunity-result strong{display:block;margin-top:6px;color:#b8c9b9;font:12px/1.45 Georgia,serif}.rr-body{white-space:pre-wrap;font:15px/1.72 Georgia,serif;color:#bbb3a5;max-width:1050px;padding:0 0 25px}.rr-reader details{border-top:1px solid rgba(200,169,81,.08);padding:13px 0}.rr-reader summary{cursor:pointer;color:#8d7b50;font-size:8px;letter-spacing:.12em}.rr-reader ul,.rr-reader p,.rr-reader pre{color:#827b70;font-size:10px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}.rr-empty,.rr-empty-reader{color:#70685b;font:13px/1.6 Georgia,serif;padding:30px 10px}.rr-empty strong,.rr-empty-reader strong{color:#9b8756;font:9px ui-monospace,monospace;letter-spacing:.1em}.rr-empty p,.rr-empty-reader p{margin-top:8px}.rr-empty-reader{padding:80px 20px;text-align:center}
      @media(max-width:1250px){.rr-question-grid{grid-template-columns:repeat(3,1fr)}.rr-compose{grid-template-columns:1fr 1fr}.rr-generate{grid-column:1/-1}.rr-more-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:760px){.rr-root{padding:18px}.rr-header{display:grid}.rr-question-grid,.rr-more-grid,.rr-compose,.rr-workspace,.rr-opportunity-inputs,.rr-opportunity-result{grid-template-columns:1fr}.rr-opportunity-inputs label:nth-child(3),.rr-opportunity-inputs label:nth-child(5),.rr-opportunity-result .wide{grid-column:auto}.rr-list{border-right:0;border-bottom:1px solid rgba(200,169,81,.1);max-height:240px;padding-right:0}.rr-reader{max-height:none;padding:25px 4px}}
    `}</style>
  </main>;
}