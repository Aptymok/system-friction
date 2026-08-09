'use client';

import { useEffect, useMemo, useState } from 'react';

type Row = Record<string, unknown>;
type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  model?: string;
  runId?: string;
  evidenceRefs?: string[];
};

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function FriccionautaConsole({ launcher = true }: { launcher?: boolean }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [findingFor, setFindingFor] = useState<string | null>(null);
  const [findingDraft, setFindingDraft] = useState('');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    const openFromRoot = () => setOpen(true);
    window.addEventListener('sfi:open-friccionauta', openFromRoot);
    return () => window.removeEventListener('sfi:open-friccionauta', openFromRoot);
  }, []);

  const lastAssistant = useMemo(() => [...messages].reverse().find((message) => message.role === 'assistant') ?? null, [messages]);

  async function ask() {
    const question = input.trim();
    if (!question || busy) return;
    const userMessage: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: question };
    const history = [...messages, userMessage].slice(-8).map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setBusy(true);
    setError(null);
    setSaveMessage(null);
    try {
      const response = await fetch('/api/root/friccionauta', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ask', question, history }),
      });
      const body = await response.json().catch(() => null) as Row | null;
      if (!response.ok || !body || body.ok !== true) throw new Error(text(body?.details ?? body?.error, `HTTP ${response.status}`));
      const run = body.run && typeof body.run === 'object' && !Array.isArray(body.run) ? body.run as Row : {};
      const answer: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: text(body.answer, 'MISSING · el Friccionauta no devolvió texto.'),
        provider: text(body.provider, 'degraded'),
        model: text(body.model, 'unknown'),
        runId: text(run.id),
        evidenceRefs: strings(body.evidenceRefs),
      };
      setMessages((current) => [...current, answer]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible consultar al Friccionauta.');
    } finally {
      setBusy(false);
    }
  }

  function dictate() {
    if (listening) return;
    const speechWindow = window as typeof window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setError('DICTADO NO DISPONIBLE · este navegador no expone SpeechRecognition. El texto sigue disponible.');
      return;
    }
    const recognition = new Recognition();
    recognition.lang = 'es-MX';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript) setInput((current) => current ? `${current} ${transcript}` : transcript);
    };
    recognition.onerror = (event) => setError(`DICTADO · ${event.error}`);
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  function speak(content: string) {
    if (!('speechSynthesis' in window)) {
      setError('VOICE OUTPUT NO DISPONIBLE · el navegador no expone speechSynthesis.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = 'es-MX';
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  }

  function beginFinding(message: ChatMessage) {
    setFindingFor(message.id);
    setFindingDraft('');
    setSaveMessage(null);
  }

  async function saveFinding(message: ChatMessage) {
    const finding = findingDraft.trim();
    if (!finding) return;
    setSaveMessage(null);
    try {
      const response = await fetch('/api/root/friccionauta', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_finding',
          finding,
          question: [...messages].reverse().find((item) => item.role === 'user')?.content ?? null,
          sourceRunId: message.runId ?? null,
          evidenceRefs: message.evidenceRefs ?? [],
        }),
      });
      const body = await response.json().catch(() => null) as Row | null;
      if (!response.ok || !body || body.ok !== true) throw new Error(text(body?.details ?? body?.error, `HTTP ${response.status}`));
      setFindingFor(null);
      setFindingDraft('');
      setSaveMessage('HALLAZGO GUARDADO COMO CANDIDATO · no fue verificado ni canonizado.');
    } catch (caught) {
      setSaveMessage(caught instanceof Error ? caught.message : 'No fue posible guardar el hallazgo.');
    }
  }

  return <>
    {launcher ? <button className="fr-launch" type="button" onClick={() => setOpen(true)} aria-label="Platicar con el Friccionauta">
      <span className="fr-mini-avatar" aria-hidden="true"><i /><b /></span>
      <span>PLATICAR CON EL FRICCIONAUTA</span>
    </button> : null}

    {open ? <div className="fr-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="fr-panel" role="dialog" aria-modal="true" aria-labelledby="fr-title">
        <header>
          <div className="fr-identity"><div className="fr-avatar" aria-hidden="true"><span className="antenna"/><span className="head"><i className="eye left"/><i className="eye right"/><b/></span><span className="body"/></div><div><span>ROOT ONLY · COGNITIVE TWIN GATE</span><h2 id="fr-title">FRICCIONAUTA // 16-BIT OBSERVER</h2><p>Conoce el estado observable de SFI; interpreta y propone. No ejecuta.</p></div></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar">×</button>
        </header>

        <div className="fr-status"><span>LLM ROUTER <b>GROQ PREFERRED</b></span><span>MEMORY <b>COGNITIVE TWIN</b></span><span>AUTHORITY <b>READ / PROPOSE</b></span>{lastAssistant ? <span>LAST <b>{lastAssistant.provider?.toUpperCase()} · {lastAssistant.model}</b></span> : null}</div>

        <div className="fr-log">
          {!messages.length ? <div className="fr-empty"><strong>¿QUÉ QUIERES SABER?</strong><p>Pregunta por ROOT, evidencias, hipótesis, World Vector, atractores, agentes, divergencias, memoria, un caso o por qué algo no está funcionando. Si la respuesta no está observable en SFI, debe decir MISSING.</p></div> : null}
          {messages.map((message) => <article key={message.id} data-role={message.role}>
            <div><span>{message.role === 'user' ? 'APTYMOK' : 'FRICCIONAUTA'}</span>{message.provider ? <small>{message.provider.toUpperCase()} · {message.model}</small> : null}</div>
            <p>{message.content}</p>
            {message.role === 'assistant' ? <footer><button type="button" onClick={() => speak(message.content)}>ESCUCHAR</button><button type="button" onClick={() => beginFinding(message)}>GUARDAR HALLAZGO</button><span>{message.evidenceRefs?.length ?? 0} refs</span></footer> : null}
            {findingFor === message.id ? <div className="fr-finding"><label>QUÉ HALLAZGO EXACTO DEBE RECORDAR SFI<textarea value={findingDraft} onChange={(event) => setFindingDraft(event.target.value)} placeholder="No se guarda toda la respuesta automáticamente. Define aquí el hallazgo que merece memoria." /></label><div><button type="button" onClick={() => setFindingFor(null)}>CANCELAR</button><button type="button" disabled={!findingDraft.trim()} onClick={() => void saveFinding(message)}>GUARDAR COMO CANDIDATO</button></div></div> : null}
          </article>)}
          {busy ? <div className="fr-thinking"><span/><span/><span/> FRICCIONAUTA ESTÁ RECONSTRUYENDO EL ESTADO…</div> : null}
        </div>

        {error ? <div className="fr-error">{error}</div> : null}
        {saveMessage ? <div className="fr-save">{saveMessage}</div> : null}

        <div className="fr-input">
          <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void ask(); } }} placeholder="Pregunta cualquier cosa observable sobre SFI…" />
          <div><button type="button" onClick={dictate} disabled={listening}>{listening ? 'ESCUCHANDO…' : 'DICTAR'}</button><button type="button" onClick={() => void ask()} disabled={busy || !input.trim()}>{busy ? 'OBSERVANDO…' : 'ENVIAR'}</button></div>
        </div>
      </section>
    </div> : null}

    <style jsx>{`
      .fr-launch{position:fixed;z-index:88;right:18px;bottom:18px;display:flex;align-items:center;gap:9px;border:1px solid rgba(89,154,97,.45);background:#070b07;color:#8fca97;padding:9px 12px;font:8px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;cursor:pointer;box-shadow:0 10px 35px rgba(0,0,0,.45)}.fr-mini-avatar{position:relative;width:14px;height:14px;background:#223a25;box-shadow:inset 0 0 0 2px #6aa273;image-rendering:pixelated}.fr-mini-avatar i,.fr-mini-avatar b{position:absolute;top:4px;width:3px;height:3px;background:#b7d78f}.fr-mini-avatar i{left:3px}.fr-mini-avatar b{right:3px}.fr-backdrop{position:fixed;z-index:170;inset:0;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(3px)}.fr-panel{width:min(1050px,97vw);height:min(860px,94vh);background:#050705;border:1px solid rgba(91,159,100,.32);box-shadow:0 35px 120px rgba(0,0,0,.82);display:grid;grid-template-rows:auto auto 1fr auto auto auto;color:#cbd4c5;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.fr-panel>header{display:flex;justify-content:space-between;gap:18px;padding:16px 20px;border-bottom:1px solid rgba(91,159,100,.14);background:#070907}.fr-identity{display:flex;gap:15px;align-items:center}.fr-identity>div:last-child>span{font-size:7px;letter-spacing:.16em;color:#5e8d65}.fr-identity h2{margin:4px 0;color:#a7d3a8;font:400 20px/1.2 ui-monospace,monospace}.fr-identity p{margin:4px 0 0;color:#6c796b;font:11px Georgia,serif}.fr-panel>header>button{width:32px;height:32px;border:1px solid rgba(91,159,100,.14);background:transparent;color:#718071;font-size:20px}.fr-avatar{position:relative;width:54px;height:58px;image-rendering:pixelated}.fr-avatar .antenna{position:absolute;left:25px;top:0;width:4px;height:10px;background:#6ba374}.fr-avatar .antenna:before{content:'';position:absolute;left:-3px;top:-4px;width:10px;height:6px;background:#91c098}.fr-avatar .head{position:absolute;left:7px;top:11px;width:40px;height:30px;background:#24422a;border:4px solid #67956d}.fr-avatar .eye{position:absolute;top:7px;width:6px;height:6px;background:#d7e69c}.fr-avatar .eye.left{left:6px}.fr-avatar .eye.right{right:6px}.fr-avatar .head b{position:absolute;left:10px;bottom:5px;width:12px;height:3px;background:#83b489}.fr-avatar .body{position:absolute;left:13px;top:42px;width:28px;height:14px;background:#325b39;border:3px solid #67956d}.fr-status{display:flex;gap:7px;flex-wrap:wrap;padding:8px 20px;border-bottom:1px solid rgba(91,159,100,.1)}.fr-status span{font-size:7px;color:#536055;border:1px solid rgba(91,159,100,.09);padding:5px 7px}.fr-status b{color:#7ca984;font-weight:400}.fr-log{overflow:auto;padding:18px 20px;scrollbar-width:thin;scrollbar-color:rgba(91,159,100,.25) transparent}.fr-empty{max-width:760px;margin:80px auto;text-align:center}.fr-empty strong{font-size:11px;letter-spacing:.15em;color:#78a37e}.fr-empty p{color:#667267;font:14px/1.7 Georgia,serif}.fr-log article{max-width:88%;margin-bottom:14px;border:1px solid rgba(91,159,100,.08);background:#070907;padding:12px}.fr-log article[data-role=user]{margin-left:auto;border-color:rgba(200,169,81,.12);background:#0a0906}.fr-log article>div:first-child{display:flex;justify-content:space-between;gap:12px}.fr-log article>div:first-child span{font-size:7px;letter-spacing:.12em;color:#6d9b73}.fr-log article[data-role=user]>div:first-child span{color:#a58a52}.fr-log article small{font-size:7px;color:#485149}.fr-log article>p{white-space:pre-wrap;margin:9px 0 0;color:#bac5b8;font:13px/1.68 Georgia,serif}.fr-log article[data-role=user]>p{color:#c4b9a4}.fr-log article footer{display:flex;gap:7px;align-items:center;margin-top:10px}.fr-log article footer button,.fr-finding button,.fr-input button{border:1px solid rgba(91,159,100,.2);background:transparent;color:#78a37e;padding:6px 8px;font:7px ui-monospace,monospace;cursor:pointer}.fr-log article footer span{margin-left:auto;color:#4e5a50;font-size:7px}.fr-finding{margin-top:12px;border-top:1px solid rgba(91,159,100,.1);padding-top:10px}.fr-finding label{display:grid;gap:6px;color:#67806a;font-size:7px;letter-spacing:.1em}.fr-finding textarea{min-height:70px;background:#050705;border:1px solid rgba(91,159,100,.15);color:#c2cebf;padding:9px;font:10px/1.5 ui-monospace,monospace}.fr-finding>div{display:flex;justify-content:flex-end;gap:6px;margin-top:7px}.fr-thinking{color:#608066;font-size:8px;letter-spacing:.08em}.fr-thinking span{display:inline-block;width:5px;height:5px;background:#77a77d;margin-right:4px;animation:frblink 1s infinite}.fr-thinking span:nth-child(2){animation-delay:.2s}.fr-thinking span:nth-child(3){animation-delay:.4s}@keyframes frblink{0%,100%{opacity:.2}50%{opacity:1}}.fr-error,.fr-save{margin:0 20px 8px;padding:8px 10px;font-size:8px}.fr-error{border-left:2px solid #a45e4d;color:#bd806e;background:rgba(164,94,77,.06)}.fr-save{border-left:2px solid #5d9866;color:#7db486;background:rgba(93,152,102,.06)}.fr-input{display:grid;grid-template-columns:1fr auto;gap:8px;border-top:1px solid rgba(91,159,100,.12);padding:12px 20px;background:#060806}.fr-input textarea{min-height:64px;max-height:150px;resize:vertical;background:#030503;border:1px solid rgba(91,159,100,.18);color:#d1dccd;padding:10px;font:12px/1.5 ui-monospace,monospace}.fr-input>div{display:grid;gap:6px;width:112px}.fr-input button:disabled,.fr-finding button:disabled{opacity:.35}@media(max-width:680px){.fr-backdrop{padding:5px}.fr-panel{width:100%;height:98vh}.fr-identity{align-items:flex-start}.fr-avatar{display:none}.fr-status{display:grid;grid-template-columns:1fr 1fr}.fr-log{padding:12px}.fr-log article{max-width:96%}.fr-input{grid-template-columns:1fr}.fr-input>div{grid-template-columns:1fr 1fr;width:auto}}
    `}</style>
  </>;
}
