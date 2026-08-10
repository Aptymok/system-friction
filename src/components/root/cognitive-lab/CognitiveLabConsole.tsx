'use client';

import { useEffect, useMemo, useState } from 'react';

type Row = Record<string, unknown>;
type Message = { role: 'user' | 'assistant'; content: string };

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function CognitiveLabConsole() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Row | null>(null);
  const [condition, setCondition] = useState('FOUNDER_TWIN');
  const [title, setTitle] = useState('RELATIONAL COUPLING CASE');
  const [objective, setObjective] = useState('Observe qué proviene del fundador, qué proviene de la tecnología y qué emerge únicamente del acoplamiento.');
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState('');
  const [founderReading, setFounderReading] = useState('');
  const [lastBlind, setLastBlind] = useState<string | null>(null);
  const [lastContrast, setLastContrast] = useState<string | null>(null);

  const sessionId = text(session?.id);
  const sessionKey = text(session?.session_key);
  const status = text(session?.status, 'INACTIVE');
  const modelCondition = ['FOUNDER_MODEL', 'FOUNDER_TWIN'].includes(text(session?.condition, condition));

  useEffect(() => {
    const stored = window.localStorage.getItem('sfi:cognitive-lab-session');
    if (!stored) return;
    void loadSession(stored);
  }, []);

  async function loadSession(id: string) {
    try {
      const response = await fetch(`/api/root/cognitive-lab/sessions/${encodeURIComponent(id)}`, { cache: 'no-store', credentials: 'include' });
      const body = await response.json().catch(() => null) as Row | null;
      if (!response.ok || !body || body.ok !== true) return;
      const nextSession = body.session && typeof body.session === 'object' ? body.session as Row : null;
      if (nextSession) setSession(nextSession);
    } catch {
      // The launcher remains usable even when a previously stored session no longer exists.
    }
  }

  async function activate() {
    if (busy || !title.trim() || !objective.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/root/cognitive-lab/sessions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          objective: objective.trim(),
          condition,
          technologyNodes: condition === 'FOUNDER_TWIN' ? ['COGNITIVE_TWIN', 'LLM_ROUTER'] : condition === 'FOUNDER_MODEL' ? ['LLM_ROUTER'] : [],
          humanNodes: ['FOUNDER'],
          metadata: { activationSurface: 'ROOT_COGNITIVE_LAB_CONSOLE', protocol: 'CRL-v1' },
        }),
      });
      const body = await response.json().catch(() => null) as Row | null;
      if (!response.ok || !body || body.ok !== true) throw new Error(text(body?.details ?? body?.error, `HTTP ${response.status}`));
      const nextSession = body.session && typeof body.session === 'object' ? body.session as Row : null;
      if (!nextSession) throw new Error('LAB_SESSION_MISSING');
      setSession(nextSession);
      setMessages([]);
      setFounderReading('');
      setLastBlind(null);
      setLastContrast(null);
      window.localStorage.setItem('sfi:cognitive-lab-session', text(nextSession.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible activar el laboratorio.');
    } finally {
      setBusy(false);
    }
  }

  async function interact() {
    const content = prompt.trim();
    if (!sessionId || !content || busy || !modelCondition) return;
    const nextHistory = [...messages, { role: 'user' as const, content }];
    setMessages(nextHistory);
    setPrompt('');
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/root/cognitive-lab/sessions/${encodeURIComponent(sessionId)}/interact`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: content, history: nextHistory.slice(-10) }),
      });
      const body = await response.json().catch(() => null) as Row | null;
      if (!body || (body.ok !== true && !body.answer)) throw new Error(text(body?.details ?? body?.error, `HTTP ${response.status}`));
      setMessages((current) => [...current, { role: 'assistant', content: text(body.answer, 'MISSING · no model output') }]);
      await loadSession(sessionId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible ejecutar la interacción.');
    } finally {
      setBusy(false);
    }
  }

  async function recordAuthorization() {
    if (!sessionId || busy) return;
    const latest = [...messages].reverse().find((message) => message.role === 'assistant');
    if (!latest) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/root/cognitive-lab/sessions/${encodeURIComponent(sessionId)}/events`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventKind: 'FOUNDER_DECISION',
          provenance: 'FOUNDER_AUTHORIZATION',
          actorKey: 'FOUNDER',
          relationFrom: 'FOUNDER',
          relationTo: text(session?.condition) === 'FOUNDER_TWIN' ? 'COGNITIVE_TWIN' : 'MODEL',
          payload: { decision: 'EXECUTE', targetModelOutput: latest.content, meaning: 'Authorization to proceed; not evidence that the founder originated the proposed operation.' },
          sourceRef: `root-cognitive-lab:${sessionId}`,
        }),
      });
      const body = await response.json().catch(() => null) as Row | null;
      if (!response.ok || !body || body.ok !== true) throw new Error(text(body?.details ?? body?.error, `HTTP ${response.status}`));
      await loadSession(sessionId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible registrar la autorización.');
    } finally {
      setBusy(false);
    }
  }

  async function runBlind() {
    if (!sessionId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/root/cognitive-lab/sessions/${encodeURIComponent(sessionId)}/blind`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      const body = await response.json().catch(() => null) as Row | null;
      const analysis = body?.analysis && typeof body.analysis === 'object' ? body.analysis as Row : {};
      const output = analysis.output && typeof analysis.output === 'object' ? analysis.output as Row : {};
      if (!body || (body.ok !== true && !output.answer)) throw new Error(text(body?.details ?? body?.error, `HTTP ${response.status}`));
      setLastBlind(text(output.answer, 'Blind analysis persisted without readable answer.'));
      await loadSession(sessionId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible ejecutar el análisis ciego.');
    } finally {
      setBusy(false);
    }
  }

  async function runContrast() {
    if (!sessionId || busy || !founderReading.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/root/cognitive-lab/sessions/${encodeURIComponent(sessionId)}/contrast`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ founderReading: founderReading.trim() }),
      });
      const body = await response.json().catch(() => null) as Row | null;
      const divergence = body?.divergence && typeof body.divergence === 'object' ? body.divergence as Row : {};
      const output = divergence.output && typeof divergence.output === 'object' ? divergence.output as Row : {};
      if (!body || (body.ok !== true && !output.answer)) throw new Error(text(body?.details ?? body?.error, `HTTP ${response.status}`));
      setLastContrast(text(output.answer, 'Contrast persisted without readable answer.'));
      await loadSession(sessionId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible contrastar el caso.');
    } finally {
      setBusy(false);
    }
  }

  const phase = useMemo(() => {
    if (!session) return 'NO SESSION';
    if (status === 'CLOSED') return 'CONTRAST COMPLETE';
    if (status === 'BLIND_COMPLETE') return 'FOUNDER CONTRAST';
    if (status === 'READY_FOR_BLIND') return 'CAPTURE / BLIND READY';
    return status;
  }, [session, status]);

  return <>
    <button className="crl-launch" type="button" onClick={() => setOpen(true)}>
      <span>CRL</span><b>{sessionId ? 'ACTIVE' : 'OFF'}</b>
    </button>

    {open ? <div className="crl-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="crl-panel" role="dialog" aria-modal="true" aria-labelledby="crl-title">
        <header><div><span>ROOT · EXPERIMENTAL</span><h2 id="crl-title">COGNITIVE RELATIONAL LAB</h2><p>Provenance → interacción → Twin ciego → contraste → aprendizaje candidato.</p></div><button type="button" onClick={() => setOpen(false)}>×</button></header>

        {!sessionId ? <div className="crl-activate">
          <label>TÍTULO<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>CONDICIÓN<select value={condition} onChange={(event) => setCondition(event.target.value)}><option value="FOUNDER_TWIN">FOUNDER + COGNITIVE TWIN</option><option value="FOUNDER_MODEL">FOUNDER + MODEL</option><option value="FOUNDER_SOLO">FOUNDER SOLO</option><option value="FOUNDER_HUMAN_TECH">FOUNDER + HUMAN + TECH</option></select></label>
          <label>OBJETIVO<textarea value={objective} onChange={(event) => setObjective(event.target.value)} /></label>
          <button type="button" disabled={busy || !title.trim() || !objective.trim()} onClick={() => void activate()}>{busy ? 'ACTIVANDO…' : 'ACTIVAR SESIÓN'}</button>
        </div> : <>
          <div className="crl-status"><span>{sessionKey}</span><b>{phase}</b><em>{text(session?.condition)}</em></div>

          {modelCondition ? <div className="crl-chat">
            <div className="crl-log">{!messages.length ? <p>Esta conversación queda dentro de la condición experimental. El modelo no convierte automáticamente tus autorizaciones en operaciones originadas por ti.</p> : messages.map((message, index) => <article key={`${message.role}-${index}`} data-role={message.role}><span>{message.role === 'user' ? 'FOUNDER' : 'MODEL'}</span><p>{message.content}</p></article>)}</div>
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ejecuta una tarea real dentro de esta condición…" />
            <div className="crl-actions"><button type="button" onClick={() => void interact()} disabled={busy || !prompt.trim()}>ENVIAR</button><button type="button" onClick={() => void recordAuthorization()} disabled={busy || !messages.some((message) => message.role === 'assistant')}>REGISTRAR “EJECUTA”</button></div>
          </div> : <div className="crl-manual"><p>Esta condición no ejecuta un modelo. Registra los eventos mediante el endpoint de eventos o cambia a una condición FOUNDER + MODEL / TWIN para interacción controlada.</p></div>}

          <div className="crl-gate"><button type="button" onClick={() => void runBlind()} disabled={busy || status === 'OPEN' || status === 'CLOSED'}>EJECUTAR TWIN CIEGO</button><small>No usa memoria CANDIDATE ni tu lectura final del caso.</small></div>

          {lastBlind || status === 'BLIND_COMPLETE' ? <div className="crl-contrast"><h3>CONTRASTE DEL FUNDADOR</h3>{lastBlind ? <details><summary>LECTURA CIEGA</summary><pre>{lastBlind}</pre></details> : null}<textarea value={founderReading} onChange={(event) => setFounderReading(event.target.value)} placeholder="Tu lectura del caso. No expliques lo que crees que el Twin quería decir: describe qué ocurrió, quién introdujo qué y dónde consideras que falló/acertó." /><button type="button" onClick={() => void runContrast()} disabled={busy || !founderReading.trim()}>CONTRASTAR Y GENERAR CANDIDATO</button></div> : null}

          {lastContrast ? <details className="crl-result" open><summary>DIVERGENCIA / LEARNING CANDIDATE</summary><pre>{lastContrast}</pre></details> : null}
        </>}

        {error ? <div className="crl-error">{error}</div> : null}
      </section>
    </div> : null}

    <style jsx>{`
      .crl-launch{position:fixed;z-index:90;right:18px;bottom:18px;display:flex;gap:8px;align-items:center;border:1px solid rgba(186,151,75,.36);background:#080704;color:#c4aa69;padding:8px 11px;font:8px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.1em;cursor:pointer;box-shadow:0 12px 35px rgba(0,0,0,.45)}.crl-launch span{border:1px solid rgba(186,151,75,.28);padding:3px 4px}.crl-launch b{font-weight:400;color:${sessionId ? '#b8cf95' : '#755f37'}}.crl-backdrop{position:fixed;z-index:190;inset:0;background:rgba(0,0,0,.84);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)}.crl-panel{width:min(1080px,97vw);height:min(900px,95vh);overflow:auto;background:#060604;border:1px solid rgba(186,151,75,.28);color:#c8c2b6;box-shadow:0 35px 120px rgba(0,0,0,.84);font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.crl-panel>header{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;gap:20px;padding:16px 20px;background:#080704;border-bottom:1px solid rgba(186,151,75,.14)}.crl-panel>header span{font-size:7px;letter-spacing:.16em;color:#7e6b43}.crl-panel h2{margin:4px 0;color:#d0b878;font:400 20px/1.2 ui-monospace,monospace}.crl-panel header p{margin:4px 0;color:#777166;font:11px Georgia,serif}.crl-panel header button{border:0;background:transparent;color:#877655;font-size:24px}.crl-activate,.crl-chat,.crl-contrast,.crl-manual{padding:18px 20px}.crl-activate{display:grid;gap:12px}.crl-activate label{display:grid;gap:6px;font-size:7px;letter-spacing:.12em;color:#806f4d}.crl-activate input,.crl-activate select,.crl-activate textarea,.crl-chat textarea,.crl-contrast textarea{width:100%;box-sizing:border-box;border:1px solid rgba(186,151,75,.16);background:#090805;color:#c8c2b6;padding:10px;font:12px/1.5 ui-monospace,monospace}.crl-activate textarea,.crl-contrast textarea{min-height:100px}.crl-activate button,.crl-actions button,.crl-gate button,.crl-contrast button{border:1px solid rgba(186,151,75,.26);background:#0d0b06;color:#c4aa69;padding:9px 12px;font:8px ui-monospace,monospace;letter-spacing:.1em;cursor:pointer}.crl-activate button:disabled,.crl-actions button:disabled,.crl-gate button:disabled,.crl-contrast button:disabled{opacity:.35;cursor:not-allowed}.crl-status{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:9px 20px;border-bottom:1px solid rgba(186,151,75,.1);font-size:8px}.crl-status span{color:#7d6c48}.crl-status b{font-weight:400;color:#aebd88}.crl-status em{font-style:normal;color:#777166}.crl-log{max-height:310px;overflow:auto;border:1px solid rgba(186,151,75,.1);padding:12px;margin-bottom:10px}.crl-log>p{color:#777166;font:12px/1.6 Georgia,serif}.crl-log article{padding:9px 10px;margin-bottom:8px;background:#090805;border-left:2px solid #574826}.crl-log article[data-role=assistant]{border-left-color:#52694c}.crl-log article span{font-size:7px;color:#8c7950}.crl-log article p{white-space:pre-wrap;margin:5px 0 0;color:#bdb6a8;font:12px/1.55 Georgia,serif}.crl-actions{display:flex;gap:8px;margin-top:8px}.crl-gate{display:flex;align-items:center;gap:10px;padding:14px 20px;border-top:1px solid rgba(186,151,75,.1);border-bottom:1px solid rgba(186,151,75,.1)}.crl-gate small{color:#666155;font:10px Georgia,serif}.crl-contrast h3{font-size:9px;letter-spacing:.14em;color:#9d8758}.crl-contrast details,.crl-result{margin-bottom:12px;border:1px solid rgba(186,151,75,.1);padding:8px}.crl-contrast summary,.crl-result summary{cursor:pointer;color:#8d794e;font-size:8px}.crl-contrast pre,.crl-result pre{white-space:pre-wrap;color:#aaa397;font:11px/1.55 Georgia,serif}.crl-contrast button{margin-top:8px}.crl-result{margin:0 20px 18px}.crl-error{margin:0 20px 18px;border:1px solid rgba(170,76,64,.3);background:#120907;color:#c28a7e;padding:10px;font-size:9px}.crl-manual p{color:#777166;font:12px/1.6 Georgia,serif}@media(max-width:720px){.crl-backdrop{padding:8px}.crl-panel{height:97vh}.crl-actions,.crl-gate{align-items:stretch;flex-direction:column}}
    `}</style>
  </>;
}
