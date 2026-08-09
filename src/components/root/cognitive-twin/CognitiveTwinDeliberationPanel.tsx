'use client';

import { useState } from 'react';

type Row = Record<string, unknown>;

const QUICK_QUESTIONS = [
  '¿Qué debería cerrar SFI antes de abrir otra cosa?',
  '¿Dónde depende SFI todavía del fundador?',
  '¿Qué contradicción institucional requiere atención?',
  '¿Qué oportunidad tiene evidencia suficiente para avanzar?',
] as const;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function text(value: unknown, fallback = '—') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function CognitiveTwinDeliberationPanel() {
  const [question, setQuestion] = useState<string>(QUICK_QUESTIONS[0]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function deliberate() {
    if (!question.trim() || running) return;
    setRunning(true);
    setError(null);
    try {
      const response = await fetch('/api/root/cognitive-twin/deliberate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
      });
      const body = await response.json().catch(() => null) as Row | null;
      if (!response.ok || !body || body.ok !== true) {
        throw new Error(text(body?.details ?? body?.error, `HTTP ${response.status}`));
      }
      setResult(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible ejecutar la deliberación.');
    } finally {
      setRunning(false);
    }
  }

  const envelope = record(result?.envelope);
  const payload = record(envelope.result);
  const authority = record(payload.authority);
  const corpus = record(payload.corpus);

  return <section className="ctd-root">
    <header>
      <div><span>MODEL EXECUTION LAYER</span><h2>LLM ↔ COGNITIVE TWIN</h2></div>
      <strong>PROPOSE ONLY</strong>
    </header>
    <p className="ctd-boundary">El modelo lee memoria y decisiones institucionales; no contiene al Twin. Cada ejecución queda persistida como propuesta y no puede aprobarse a sí misma.</p>

    <div className="ctd-quick">{QUICK_QUESTIONS.map((item) => <button key={item} type="button" className={question === item ? 'active' : ''} onClick={() => setQuestion(item)}>{item}</button>)}</div>
    <label>PREGUNTA AL COGNITIVE TWIN<textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Pregunta institucional delimitada" /></label>
    <div className="ctd-actions"><button type="button" onClick={() => void deliberate()} disabled={running || !question.trim()}>{running ? 'DELIBERANDO…' : 'EJECUTAR DELIBERACIÓN'}</button><small>Lee corpus aprobado + memoria; persiste run; no muta canon ni ejecuta acciones irreversibles.</small></div>

    {error ? <p className="ctd-error">{error}</p> : null}
    {result ? <article className="ctd-result">
      <div className="ctd-meta">
        <span>PROVIDER <b>{text(payload.provider)}</b></span>
        <span>MODEL <b>{text(payload.model)}</b></span>
        <span>AUTHORITY <b>{text(authority.decision)}</b></span>
        <span>CORPUS <b>{text(corpus.approvedDecisions, '0')} decisions · {text(corpus.memoryRecords, '0')} memories</b></span>
      </div>
      <div className="ctd-answer">{text(payload.answer, 'MISSING · el run no devolvió una respuesta legible.')}</div>
      <details><summary>ENVELOPE / BOUNDARY</summary><pre>{JSON.stringify(envelope, null, 2)}</pre></details>
    </article> : null}

    <style jsx>{`
      .ctd-root{border:1px solid #3a3120;background:#0b0a08;padding:18px;margin-top:12px;color:#d8d0bf;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.ctd-root header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;border-bottom:1px solid #2a251a;padding-bottom:13px}.ctd-root header span{font-size:8px;letter-spacing:.16em;color:#8d7b4f}.ctd-root h2{margin:5px 0 0;font:400 22px Georgia,serif;color:#d9c37e}.ctd-root header strong{font-size:8px;color:#c59068;border:1px solid #5c4931;padding:6px 8px}.ctd-boundary{color:#918878;font:12px/1.65 Georgia,serif;max-width:1000px}.ctd-quick{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0}.ctd-quick button{border:1px solid #29251b;background:transparent;color:#837b6e;padding:7px 9px;font:8px inherit;cursor:pointer}.ctd-quick button.active{border-color:#8d7748;color:#d5bd79;background:rgba(200,169,81,.04)}.ctd-root label{display:grid;gap:7px;color:#786c4d;font-size:8px;letter-spacing:.12em}.ctd-root textarea{min-height:86px;background:#070706;border:1px solid #2f2a1e;color:#d4c8ad;padding:10px;font:12px/1.55 ui-monospace,monospace;resize:vertical}.ctd-actions{display:flex;gap:14px;align-items:center;margin-top:10px}.ctd-actions button{border:1px solid #6b5930;background:transparent;color:#d2b66c;padding:10px 13px;font:9px inherit}.ctd-actions button:disabled{opacity:.4}.ctd-actions small{color:#625c51;font-size:8px}.ctd-error{color:#c68c71;font-size:9px}.ctd-result{margin-top:16px;border-top:1px solid #2a251a;padding-top:16px}.ctd-meta{display:flex;flex-wrap:wrap;gap:10px}.ctd-meta span{font-size:7px;color:#655f53;border:1px solid #242119;padding:6px 8px}.ctd-meta b{color:#a89a74}.ctd-answer{margin-top:16px;white-space:pre-wrap;color:#c2b9a8;font:14px/1.72 Georgia,serif}.ctd-result details{margin-top:15px;border-top:1px solid #211e17;padding-top:10px}.ctd-result summary{cursor:pointer;color:#8d7b4f;font-size:8px;letter-spacing:.12em}.ctd-result pre{white-space:pre-wrap;overflow-wrap:anywhere;color:#746d62;font-size:8px;line-height:1.5}@media(max-width:720px){.ctd-actions{display:grid}.ctd-meta{display:grid}}
    `}</style>
  </section>;
}