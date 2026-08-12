'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, Clock3, Orbit, Plus } from 'lucide-react';

type ParticipantWindow = {
  id: string;
  status: 'ACTIVE' | 'CLOSED';
  watched_thoughts: string[];
  started_at: string;
  mark_count: number;
};

type ParticipantMark = {
  id: string;
  moment_at: string;
  trigger_text: string | null;
  activity: string | null;
  location_context: string | null;
  thought_after: string | null;
  feeling_after: string | null;
  action_after: string | null;
  intensity: number | null;
  note: string | null;
};

type WindowState = {
  window: ParticipantWindow;
  marks: ParticipantMark[];
  canClose: boolean;
  hoursRemaining: number | null;
};

type MarkForm = {
  triggerText: string;
  intensity: number;
  activity: string;
  locationContext: string;
  thoughtAfter: string;
  feelingAfter: string;
  actionAfter: string;
  note: string;
};

type ReflectionForm = {
  whatChanged: string;
  whatNoticed: string;
  whatAvoided: string;
  whatWasMine: string;
  whatWasNotMine: string;
  neededToday: string;
};

const EMPTY_MARK: MarkForm = { triggerText: '', intensity: 3, activity: '', locationContext: '', thoughtAfter: '', feelingAfter: '', actionAfter: '', note: '' };
const EMPTY_REFLECTION: ReflectionForm = { whatChanged: '', whatNoticed: '', whatAvoided: '', whatWasMine: '', whatWasNotMine: '', neededToday: '' };
const inputClass = 'w-full border border-[#312b1d] bg-[#050504] px-4 py-3 text-sm leading-6 text-[#eee4cb] outline-none placeholder:text-[#5d574a] focus:border-[#c9aa54]';
const labelClass = 'font-mono text-[9px] uppercase tracking-[0.18em] text-[#a49572]';
const buttonClass = 'inline-flex items-center justify-center gap-2 border border-[#c8a95166] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951] disabled:cursor-not-allowed disabled:opacity-35';

function dayFromStart(startedAt: string) {
  const hours = (Date.now() - new Date(startedAt).getTime()) / 3_600_000;
  return hours < 24 ? 1 : hours < 48 ? 2 : 3;
}

function readableError(value: string) {
  const dictionary: Record<string, string> = {
    TRIGGER_TEXT_REQUIRED: 'Describe brevemente qué apareció.',
    CALIBRATION_WINDOW_NOT_COMPLETE: 'La ventana de observación todavía no ha concluido.',
    PARTICIPANT_WINDOW_NOT_ACTIVE: 'Esta ventana ya no está activa.',
  };
  return dictionary[value] ?? 'No fue posible guardar el registro. Inténtalo de nuevo.';
}

function ContextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="grid gap-2"><span className={labelClass}>{label}</span><textarea rows={2} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${inputClass} resize-y`} /></label>;
}

export function ParticipantWindowConsole({ authenticated }: { authenticated: boolean }) {
  const [loading, setLoading] = useState(authenticated);
  const [windows, setWindows] = useState<ParticipantWindow[]>([]);
  const [activeState, setActiveState] = useState<WindowState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [mark, setMark] = useState<MarkForm>(EMPTY_MARK);
  const [reflection, setReflection] = useState<ReflectionForm>(EMPTY_REFLECTION);

  async function refreshActive(windowId: string) {
    const response = await fetch(`/api/field/participant/windows/${windowId}`);
    const body = await response.json();
    if (!response.ok || !body.ok) throw new Error(body.details || body.error || 'WINDOW_READ_FAILED');
    setActiveState(body as WindowState);
  }

  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/field/participant/windows');
        const body = await response.json();
        if (!response.ok || !body.ok) throw new Error(body.details || body.error || 'WINDOW_LIST_FAILED');
        if (cancelled) return;
        const items = body.windows as ParticipantWindow[];
        setWindows(items);
        const active = items.find((item) => item.status === 'ACTIVE');
        if (active) await refreshActive(active.id);
      } catch (nextError) {
        if (!cancelled) setError(readableError(nextError instanceof Error ? nextError.message : 'NETWORK_ERROR'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authenticated]);

  const remaining = useMemo(() => {
    if (!activeState || activeState.hoursRemaining === null) return null;
    const totalMinutes = Math.max(0, Math.ceil(activeState.hoursRemaining * 60));
    return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60, progress: Math.max(0, Math.min(100, ((72 - activeState.hoursRemaining) / 72) * 100)) };
  }, [activeState]);

  async function addMark() {
    if (!activeState || !mark.triggerText.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/field/participant/windows/${activeState.window.id}/marks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...mark, socialContext: null, dayNumber: dayFromStart(activeState.window.started_at) }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.details || body.error || 'MARK_CREATE_FAILED');
      setMark(EMPTY_MARK);
      setShowContext(false);
      await refreshActive(activeState.window.id);
    } catch (nextError) {
      setError(readableError(nextError instanceof Error ? nextError.message : 'MARK_CREATE_FAILED'));
    } finally {
      setSubmitting(false);
    }
  }

  const reflectionComplete = Object.values(reflection).every((value) => value.trim().length > 0);

  async function closeWindow() {
    if (!activeState || !activeState.canClose || !reflectionComplete) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/field/participant/windows/${activeState.window.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reflection) });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.details || body.error || 'WINDOW_CLOSE_FAILED');
      window.location.assign(body.nextPath || '/field');
    } catch (nextError) {
      setError(readableError(nextError instanceof Error ? nextError.message : 'WINDOW_CLOSE_FAILED'));
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="min-h-screen bg-[#050504] px-5 py-8 text-[#d8d2c2] md:px-10">
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="border border-[#302b20] bg-[#0a0a08] p-6 md:p-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#c8a951]">SFI · campo de observación</p>
        <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight text-[#f5eedc] md:text-5xl">Deja que las cosas aparezcan antes de decidir qué significan.</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[#9f9788]">Registra una marca cuando algo se repita, cambie la dirección o aumente la tensión. Una marca no es un diagnóstico: conserva el momento para que la trayectoria pueda observarse después.</p>
      </header>

      {!authenticated ? <section className="border border-[#302b20] bg-[#0a0a08] p-6"><p>Esta observación es privada y requiere una cuenta.</p><Link href="/login?next=%2Ffield%2Fparticipant" className={`mt-4 ${buttonClass}`}>Iniciar sesión <ArrowRight className="h-4 w-4" /></Link></section> : null}
      {authenticated && loading ? <section className="border border-[#302b20] bg-[#0a0a08] p-6 text-[#9f9788]">Recuperando tu ventana de observación…</section> : null}
      {error ? <section className="border border-[#6b352a] bg-[#160d0a] p-4 text-sm text-[#d89685]">{error}</section> : null}

      {authenticated && !loading && !activeState ? <section className="border border-[#302b20] bg-[#0a0a08] p-8 text-center"><Orbit className="mx-auto h-8 w-8 text-[#c8a951]" /><h2 className="mt-4 text-2xl text-[#f5eedc]">No hay una observación activa.</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#918979]">Inicia una trayectoria o abre tu observatorio si ya existe un recorrido.</p><div className="mt-6 flex justify-center gap-3"><Link href="/field" className={buttonClass}>Iniciar trayectoria</Link>{windows.some((item) => item.status === 'CLOSED') ? <Link href="/field" className={buttonClass}>Mi observatorio</Link> : null}</div></section> : null}

      {activeState ? <>
        <section className="border border-[#302b20] bg-[#0a0a08] p-5 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4"><div><div className={labelClass}>Ventana activa</div><div className="mt-2 text-3xl text-[#f5eedc]">{activeState.window.mark_count} apariciones conservadas</div></div><div className="flex items-center gap-2 border border-[#493d22] bg-[#100e08] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951]"><Clock3 className="h-4 w-4" />{remaining ? `${remaining.hours}h ${remaining.minutes}m para el primer corte` : 'Tiempo no disponible'}</div></div>
          <div className="mt-5 h-1 overflow-hidden bg-[#211d14]"><div className="h-full bg-[#c8a951]" style={{ width: `${remaining?.progress ?? 0}%` }} /></div>
          <div className="mt-5 grid gap-2 md:grid-cols-3">{activeState.window.watched_thoughts.map((prompt) => <div key={prompt} className="border border-[#282319] bg-[#070706] p-3 text-xs leading-5 text-[#9f9788]">{prompt}</div>)}</div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="border border-[#302b20] bg-[#0a0a08] p-5 md:p-7">
            <div className="flex items-center gap-3"><Plus className="h-5 w-5 text-[#c8a951]" /><div><div className={labelClass}>Nueva marca</div><h2 className="mt-2 text-2xl text-[#f5eedc]">¿Qué apareció?</h2></div></div>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#918979]">Puede ser un pensamiento, un evento, una sensación, una conversación o un cambio de dirección. Descríbelo sin explicarlo todavía.</p>
            <textarea rows={5} value={mark.triggerText} onChange={(event) => setMark((current) => ({ ...current, triggerText: event.target.value }))} placeholder="Ejemplo: volvió la misma duda justo antes de enviar la propuesta." className={`mt-5 ${inputClass} resize-y`} />
            <label className="mt-5 grid gap-2"><span className={labelClass}>Intensidad percibida · {mark.intensity}/5</span><input type="range" min={1} max={5} value={mark.intensity} onChange={(event) => setMark((current) => ({ ...current, intensity: Number(event.target.value) }))} /></label>
            <button type="button" onClick={() => setShowContext((value) => !value)} className={`mt-5 ${buttonClass}`}>Agregar contexto opcional <ChevronDown className={`h-4 w-4 transition-transform ${showContext ? 'rotate-180' : ''}`} /></button>
            {showContext ? <div className="mt-5 grid gap-5 md:grid-cols-2"><ContextField label="Qué estabas haciendo" value={mark.activity} onChange={(value) => setMark((current) => ({ ...current, activity: value }))} placeholder="Actividad concreta." /><ContextField label="Dónde ocurrió" value={mark.locationContext} onChange={(value) => setMark((current) => ({ ...current, locationContext: value }))} placeholder="Lugar o entorno." /><ContextField label="Qué pensaste después" value={mark.thoughtAfter} onChange={(value) => setMark((current) => ({ ...current, thoughtAfter: value }))} placeholder="Sólo si lo recuerdas." /><ContextField label="Qué sentiste después" value={mark.feelingAfter} onChange={(value) => setMark((current) => ({ ...current, feelingAfter: value }))} placeholder="Sólo si fue claro." /><ContextField label="Qué hiciste después" value={mark.actionAfter} onChange={(value) => setMark((current) => ({ ...current, actionAfter: value }))} placeholder="Respuesta observable." /><ContextField label="Nota adicional" value={mark.note} onChange={(value) => setMark((current) => ({ ...current, note: value }))} placeholder="Cualquier dato útil." /></div> : null}
            <button type="button" onClick={() => void addMark()} disabled={submitting || !mark.triggerText.trim()} className={`mt-6 bg-[#c8a951] text-[#050504] ${buttonClass}`}>{submitting ? 'Guardando…' : 'Conservar esta aparición'}</button>
          </div>

          <aside className="border border-[#302b20] bg-[#0a0a08] p-5"><div className={labelClass}>Trayectoria hasta ahora</div><div className="mt-4 space-y-3">{activeState.marks.length ? activeState.marks.slice().reverse().map((item) => <article key={item.id} className="border border-[#282319] bg-[#070706] p-4"><time className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#7d7465]">{new Date(item.moment_at).toLocaleString('es-MX')}</time><p className="mt-2 text-sm leading-6 text-[#d4cbb7]">{item.trigger_text}</p><div className="mt-2 text-xs text-[#8e8576]">Intensidad {item.intensity ?? 'sin medida'}/5</div></article>) : <p className="text-sm leading-7 text-[#918979]">La trayectoria comenzará con la primera aparición conservada.</p>}</div></aside>
        </section>

        {activeState.canClose ? <section className="border border-[#4b4025] bg-[#0d0c08] p-6"><div className={labelClass}>Primer corte longitudinal</div><h2 className="mt-3 text-2xl text-[#f5eedc]">Observa el conjunto, no una marca aislada.</h2><p className="mt-3 text-sm leading-7 text-[#918979]">Estas preguntas no buscan una respuesta correcta. Ayudan a separar repetición, contexto, agencia y condiciones externas antes de proponer una perturbación mínima.</p><div className="mt-6 grid gap-5 md:grid-cols-2"><ContextField label="Qué cambió" value={reflection.whatChanged} onChange={(value) => setReflection((current) => ({ ...current, whatChanged: value }))} placeholder="Cambio observable." /><ContextField label="Qué comenzó a repetirse" value={reflection.whatNoticed} onChange={(value) => setReflection((current) => ({ ...current, whatNoticed: value }))} placeholder="Señales persistentes." /><ContextField label="Qué evitaste o postergaste" value={reflection.whatAvoided} onChange={(value) => setReflection((current) => ({ ...current, whatAvoided: value }))} placeholder="Sólo si ocurrió." /><ContextField label="Qué dependía de ti" value={reflection.whatWasMine} onChange={(value) => setReflection((current) => ({ ...current, whatWasMine: value }))} placeholder="Parte propia del campo." /><ContextField label="Qué no dependía de ti" value={reflection.whatWasNotMine} onChange={(value) => setReflection((current) => ({ ...current, whatWasNotMine: value }))} placeholder="Condiciones externas." /><ContextField label="Qué condición mínima necesitas ahora" value={reflection.neededToday} onChange={(value) => setReflection((current) => ({ ...current, neededToday: value }))} placeholder="No una solución completa." /></div><button type="button" onClick={() => void closeWindow()} disabled={submitting || !reflectionComplete} className={`mt-6 bg-[#c8a951] text-[#050504] ${buttonClass}`}>Cerrar el primer corte y abrir observatorio</button></section> : null}
      </> : null}
    </div>
  </main>;
}
