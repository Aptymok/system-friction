'use client';

import { useMemo, useState } from 'react';
import { Disc3, FileAudio, Instagram, Lock, Send, TimerReset } from 'lucide-react';

type ProjectState = 'continue' | 'finish_this_week' | 'publish' | 'sell_pitch' | 'collaborate' | 'revise' | 'archive' | 'kill' | 'decision_required';
type StudioKind = 'melody' | 'beat' | 'loop' | 'demo' | 'reference' | 'lyrics_fragment' | 'project_note' | 'instagram_signal' | 'client_note';

type StudioObject = {
  id: string;
  kind: StudioKind;
  title: string;
  note: string;
  evidence: boolean;
  evaluation: string;
  state: ProjectState;
};

const kinds: StudioKind[] = ['melody', 'beat', 'loop', 'demo', 'reference', 'lyrics_fragment', 'project_note', 'instagram_signal', 'client_note'];

function evaluate(kind: StudioKind, title: string, note: string) {
  const text = `${title} ${note}`.toLowerCase();
  const hook = /(hook|coro|melodia|riff|motivo)/.test(text) ? 'hook presente' : 'hook no probado';
  const mix = /(low|bass|808|kick|sub|bajo)/.test(text) ? 'riesgo de mezcla en low-end' : 'riesgo de mezcla no medido';
  const release = /(demo|bounce|export|master|final)/.test(text) ? 'puede avanzar a revision de release' : 'todavia requiere evidencia de avance';
  const rem = /(rem618|rem|618)/.test(text) ? 'conecta con continuidad REM618' : 'separado de continuidad REM618';
  return `Identidad: ${kind}. Direccion emocional: derivada de la nota, no medida por audio. Genero: requiere referencia. Intencion ritmica: no confirmada sin bounce. Claridad melodica: ${hook}. Riesgo de mezcla: ${mix}. Preparacion de salida: ${release}. Valor portfolio: requiere evidencia audible. Continuidad: ${rem}. Instagram: registrar senal manual si se publica. Cliente: preparar pitch solo con evidencia exportada.`;
}

function taskFor(object: StudioObject) {
  if (object.kind === 'instagram_signal') return 'Registrar resultado y definir siguiente post verificable.';
  if (object.kind === 'client_note') return 'Preparar pitch y adjuntar evidencia manual de envio.';
  if (object.kind === 'reference') return 'Comparar contra un demo propio y anotar decision.';
  return object.evidence ? 'Elegir: terminar, publicar, vender, colaborar, revisar, archivar o matar.' : 'Adjuntar evidencia: bounce, referencia, export, captura o nota verificable.';
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="border border-[#272219] bg-[#080806]/94">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951]">
        {title}<span>{open ? '-' : '+'}</span>
      </button>
      {open ? <div className="border-t border-[#272219] p-4">{children}</div> : null}
    </section>
  );
}

export default function StudioFieldClient() {
  const [kind, setKind] = useState<StudioKind>('demo');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [objects, setObjects] = useState<StudioObject[]>([]);
  const [message, setMessage] = useState('Studio persistence: local_only_draft. Blocker: no approved STUDIO event persistence contract for private music/project material in this pass.');

  const decisionRequired = useMemo(() => objects.filter((item) => !item.evidence || item.state === 'decision_required'), [objects]);

  function registerObject() {
    if (!title.trim()) {
      setMessage('Registro bloqueado: falta titulo.');
      return;
    }
    const next: StudioObject = {
      id: `studio-local-${Date.now()}`,
      kind,
      title: title.trim(),
      note: note.trim(),
      evidence: false,
      evaluation: evaluate(kind, title, note),
      state: 'decision_required',
    };
    setObjects((current) => [next, ...current]);
    setTitle('');
    setNote('');
    setMessage('Objeto registrado localmente. File persistence blocked: missing_studio_storage_contract.');
  }

  function attachEvidence(id: string) {
    setObjects((current) => current.map((item) => item.id === id ? { ...item, evidence: true, state: 'continue' } : item));
    setMessage('Evidencia marcada manualmente. Server persistence blocked: missing_studio_event_contract.');
  }

  function decide(id: string, state: ProjectState) {
    setObjects((current) => current.map((item) => {
      if (item.id !== id) return item;
      if (!item.evidence && !['archive', 'kill'].includes(state)) {
        setMessage('Decision bloqueada: esta idea requiere evidencia antes de avanzar.');
        return { ...item, state: 'decision_required' };
      }
      setMessage(`Decision local registrada: ${state}. Audit persistence blocked: missing_studio_event_contract.`);
      return { ...item, state };
    }));
  }

  return (
    <main className="min-h-screen bg-[#050504] text-[#d8d2c2]">
      <header className="sticky top-0 z-40 flex h-12 items-center border-b border-[#272219] bg-[#050504]/95 px-5 backdrop-blur">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#c8a951]"><Disc3 size={15} /> /studio</div>
        <div className="ml-auto font-mono text-[9px] uppercase tracking-[0.14em] text-[#8f8878]">private producer field</div>
      </header>

      <section className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="relative min-h-[680px] overflow-hidden border border-[#272219] bg-[radial-gradient(circle_at_52%_40%,rgba(105,148,190,0.18),transparent_34%),linear-gradient(180deg,#080806,#020201)]">
          <div className="absolute left-1/2 top-1/2 grid h-32 w-32 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[#6f9cc8] bg-[#071018] text-center">
            <div>
              <Disc3 className="mx-auto text-[#6f9cc8]" />
              <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#f1ead8]">REM618 / Producer</div>
            </div>
          </div>
          {objects.map((item, index) => (
            <article key={item.id} className="absolute w-64 border border-[#273241] bg-[#071018]/92 p-3" style={{ left: `${8 + (index % 3) * 30}%`, top: `${14 + Math.floor(index / 3) * 24}%` }}>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6f9cc8]"><FileAudio size={14} /> {item.kind}</div>
              <h3 className="mt-2 text-sm text-[#f1ead8]">{item.title}</h3>
              <p className="mt-2 text-xs text-[#8f8878]">{item.state}</p>
              <p className="mt-1 text-xs text-[#d08b63]">{item.evidence ? 'evidence attached' : 'sin evidencia, no cierra'}</p>
            </article>
          ))}
        </div>

        <aside className="grid content-start gap-3">
          <Panel title="Upload melodies / beats">
            <select value={kind} onChange={(event) => setKind(event.target.value as StudioKind)} className="w-full border border-[#272219] bg-[#050504] p-3 text-sm text-[#f1ead8]">
              {kinds.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titulo / proyecto / senal" className="mt-3 w-full border border-[#272219] bg-[#050504] p-3 text-sm text-[#f1ead8]" />
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Nota operativa. No sube archivo si no hay contrato seguro." className="mt-3 min-h-24 w-full border border-[#272219] bg-[#050504] p-3 text-sm text-[#f1ead8]" />
            <button type="button" onClick={registerObject} className="mt-3 border border-[#6f9cc8] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6f9cc8]">Registrar metadata</button>
          </Panel>

          <Panel title="Music evaluation">
            <div className="space-y-3">
              {objects.slice(0, 4).map((item) => (
                <article key={item.id} className="border border-[#272219] p-3">
                  <div className="text-sm text-[#f1ead8]">{item.title}</div>
                  <p className="mt-2 text-xs leading-5 text-[#9f9788]">{item.evaluation}</p>
                  <details className="mt-2 text-xs text-[#6f9cc8]"><summary>debug/details</summary><pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(item, null, 2)}</pre></details>
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Producer tasks / decision gates">
            <div className="space-y-3">
              {objects.map((item) => (
                <article key={item.id} className="border border-[#272219] p-3 text-sm">
                  <div className="text-[#f1ead8]">{taskFor(item)}</div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-[#8f8878]"><TimerReset size={14} /> deadline/degradation timer: 72h sin avance verificable</div>
                  <div className="mt-2 text-xs text-[#c8a951]">Success: evidencia audible o registro verificable. Failure: intencion sin prueba.</div>
                  <button type="button" onClick={() => attachEvidence(item.id)} className="mt-3 border border-[#2f2a1e] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6f9cc8]">Adjuntar evidencia manual</button>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(['finish_this_week', 'publish', 'sell_pitch', 'collaborate', 'revise', 'archive', 'kill'] as ProjectState[]).map((state) => (
                      <button key={state} type="button" onClick={() => decide(item.id, state)} className="border border-[#2f2a1e] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#c8a951]">{state}</button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Instagram signals / client acquisition">
            <p className="text-sm leading-6 text-[#9f9788]"><Instagram className="mr-2 inline text-[#6f9cc8]" size={16} /> Instagram tracking is manual only. No scraping, no automatic publishing.</p>
            <p className="mt-3 text-sm leading-6 text-[#9f9788]"><Send className="mr-2 inline text-[#6f9cc8]" size={16} /> Producer offers generate drafts only; external sending remains manual evidence.</p>
          </Panel>

          <Panel title="Music World State HUD">
            <p className="text-sm leading-6 text-[#9f9788]">Live cultural trend data is not claimed here. Recommendation mode is local heuristic/contextual until a safe music-world source is configured.</p>
            <p className="mt-2 text-sm text-[#d8d2c2]">Possible directions: short proof loops, clear hook, low-end reference, one reel, one pitch, one decision gate.</p>
          </Panel>

          <div className="border border-[#272219] bg-[#080806] p-3 text-xs leading-5 text-[#8f8878]">
            <Lock className="mb-2 text-[#6f9cc8]" size={16} /> {message}
            <div className="mt-2">Decision required: {decisionRequired.length}</div>
            <div>Studio agents: read/evaluate/propose only. No publish, no send, no delete, no ROOT mutation.</div>
          </div>
        </aside>
      </section>
    </main>
  );
}
