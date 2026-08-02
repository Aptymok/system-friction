'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Clock3, MapPin, Orbit, Plus, UserRound } from 'lucide-react';

type ParticipantWindow = {
  id: string;
  case_id: string | null;
  attractor_id: string | null;
  status: 'ACTIVE' | 'CLOSED';
  watched_thoughts: string[];
  started_at: string;
  expected_close_at: string;
  closed_at: string | null;
  mark_count: number;
};

type ParticipantMark = {
  id: string;
  day_number: number;
  moment_at: string;
  trigger_text: string | null;
  activity: string | null;
  location_context: string | null;
  social_context: string | null;
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
  activity: string;
  locationContext: string;
  socialContext: string;
  thoughtAfter: string;
  feelingAfter: string;
  actionAfter: string;
  intensity: number;
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

const EMPTY_MARK: MarkForm = {
  triggerText: '',
  activity: '',
  locationContext: '',
  socialContext: '',
  thoughtAfter: '',
  feelingAfter: '',
  actionAfter: '',
  intensity: 3,
  note: '',
};

const EMPTY_REFLECTION: ReflectionForm = {
  whatChanged: '',
  whatNoticed: '',
  whatAvoided: '',
  whatWasMine: '',
  whatWasNotMine: '',
  neededToday: '',
};

const inputClass = 'w-full border border-[#312b1d] bg-[#050504] px-4 py-3 text-sm text-[#eee4cb] outline-none placeholder:text-[#5d574a] focus:border-[#c9aa54]';
const labelClass = 'font-mono text-[9px] uppercase tracking-[0.18em] text-[#a49572]';
const buttonClass = 'inline-flex items-center justify-center gap-2 border border-[#c8a95166] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951] disabled:cursor-not-allowed disabled:opacity-35';

function dayFromStart(startedAt: string) {
  const elapsedHours = (Date.now() - new Date(startedAt).getTime()) / 3_600_000;
  if (elapsedHours < 24) return 1;
  if (elapsedHours < 48) return 2;
  return 3;
}

function TextArea({ label, value, onChange, placeholder, rows = 2 }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="grid gap-2">
      <span className={labelClass}>{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`${inputClass} resize-y`}
      />
    </label>
  );
}

export function ParticipantWindowConsole({ authenticated }: { authenticated: boolean }) {
  const [loading, setLoading] = useState(authenticated);
  const [windows, setWindows] = useState<ParticipantWindow[]>([]);
  const [activeState, setActiveState] = useState<WindowState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
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
        if (!cancelled) setError(nextError instanceof Error ? nextError.message : 'NETWORK_ERROR');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authenticated]);

  const remaining = useMemo(() => {
    if (!activeState || activeState.hoursRemaining === null) return null;
    const totalMinutes = Math.max(0, Math.ceil(activeState.hoursRemaining * 60));
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
      progress: Math.max(0, Math.min(100, ((72 - activeState.hoursRemaining) / 72) * 100)),
    };
  }, [activeState]);

  const markComplete = mark.triggerText.trim()
    && mark.activity.trim()
    && mark.locationContext.trim()
    && mark.thoughtAfter.trim()
    && mark.feelingAfter.trim();

  async function addMark() {
    if (!activeState || !markComplete) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/field/participant/windows/${activeState.window.id}/marks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...mark, dayNumber: dayFromStart(activeState.window.started_at) }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.details || body.error || 'MARK_CREATE_FAILED');
      setMark(EMPTY_MARK);
      await refreshActive(activeState.window.id);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'MARK_CREATE_FAILED');
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
      const response = await fetch(`/api/field/participant/windows/${activeState.window.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reflection),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.details || body.error || 'WINDOW_CLOSE_FAILED');
      window.location.assign(body.nextPath || '/interface/observatory');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'WINDOW_CLOSE_FAILED');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050504] px-5 py-8 text-[#d8d2c2] md:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="border border-[#302b20] bg-[#0a0a08] p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#c8a951]">SFI / calibración inicial</p>
              <h1 className="mt-4 text-3xl font-semibold leading-tight text-[#f5eedc] md:text-5xl">Observa durante 72 horas. No corrijas todavía.</h1>
              <p className="mt-4 text-sm leading-7 text-[#9f9788]">
                Cada vez que aparezca el pensamiento, impulso o tensión central, registra una marca. La marca no interpreta: fija el contexto necesario para declarar después la dirección real del atractor.
              </p>
            </div>
            <Link href="/interface" className={buttonClass}>Volver a interfaz</Link>
          </div>
        </header>

        {!authenticated ? (
          <section className="border border-[#302b20] bg-[#0a0a08] p-6 text-sm leading-7 text-[#9f9788]">
            Esta ventana es privada y requiere cuenta.
            <Link href="/login?next=%2Ffield%2Fparticipant" className={`mt-4 ${buttonClass}`}>Iniciar sesión <ArrowRight className="h-4 w-4" /></Link>
          </section>
        ) : null}

        {authenticated && loading ? <section className="border border-[#302b20] bg-[#0a0a08] p-6 text-sm text-[#9f9788]">Cargando calibración…</section> : null}

        {error ? <section className="border border-[#6b352a] bg-[#160d0a] p-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[#d89685]">{error}</section> : null}

        {authenticated && !loading && !activeState ? (
          <section className="border border-[#302b20] bg-[#0a0a08] p-8 text-center">
            <Orbit className="mx-auto h-8 w-8 text-[#c8a951]" />
            <h2 className="mt-4 text-2xl text-[#f5eedc]">No hay una calibración activa.</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#918979]">La primera ventana se abre automáticamente al concluir el Mini MOP-H.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/interface" className={buttonClass}>Abrir Mini MOP-H</Link>
              {windows.some((item) => item.status === 'CLOSED') ? <Link href="/interface/observatory" className={buttonClass}>Mi observatorio</Link> : null}
            </div>
          </section>
        ) : null}

        {activeState ? (
          <>
            <section className="border border-[#302b20] bg-[#0a0a08] p-5 md:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className={labelClass}>Ventana activa</div>
                  <div className="mt-2 text-3xl text-[#f5eedc]">{activeState.window.mark_count} marcas</div>
                </div>
                <div className="flex items-center gap-2 border border-[#493d22] bg-[#100e08] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951]">
                  <Clock3 className="h-4 w-4" />
                  {remaining ? `${remaining.hours}h ${remaining.minutes}m restantes` : 'Tiempo no disponible'}
                </div>
              </div>
              <div className="mt-5 h-1 overflow-hidden bg-[#211d14]">
                <div className="h-full bg-[#c8a951] transition-all" style={{ width: `${remaining?.progress ?? 0}%` }} />
              </div>
              <div className="mt-5 grid gap-2 md:grid-cols-3">
                {activeState.window.watched_thoughts.map((prompt) => (
                  <div key={prompt} className="border border-[#282319] bg-[#070706] p-3 text-xs leading-5 text-[#9f9788]">{prompt}</div>
                ))}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="border border-[#302b20] bg-[#0a0a08] p-5 md:p-7">
                <div className="flex items-center gap-3">
                  <Plus className="h-5 w-5 text-[#c8a951]" />
                  <div>
                    <div className={labelClass}>Nueva marca</div>
                    <h2 className="mt-2 text-2xl text-[#f5eedc]">¿Qué ocurrió alrededor del pensamiento?</h2>
                  </div>
                </div>
                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <TextArea label="Qué apareció" value={mark.triggerText} onChange={(value) => setMark((current) => ({ ...current, triggerText: value }))} placeholder="Pensamiento, impulso, recuerdo, evento o tensión." rows={3} />
                  <TextArea label="Qué estabas haciendo" value={mark.activity} onChange={(value) => setMark((current) => ({ ...current, activity: value }))} placeholder="Actividad concreta en ese momento." rows={3} />
                  <TextArea label="Dónde estabas" value={mark.locationContext} onChange={(value) => setMark((current) => ({ ...current, locationContext: value }))} placeholder="Lugar o entorno." />
                  <TextArea label="Con quién / solo" value={mark.socialContext} onChange={(value) => setMark((current) => ({ ...current, socialContext: value }))} placeholder="Contexto social opcional." />
                  <TextArea label="Qué pensaste después" value={mark.thoughtAfter} onChange={(value) => setMark((current) => ({ ...current, thoughtAfter: value }))} />
                  <TextArea label="Qué sentiste después" value={mark.feelingAfter} onChange={(value) => setMark((current) => ({ ...current, feelingAfter: value }))} />
                  <TextArea label="Qué hiciste después" value={mark.actionAfter} onChange={(value) => setMark((current) => ({ ...current, actionAfter: value }))} placeholder="Opcional, pero útil." />
                  <TextArea label="Nota adicional" value={mark.note} onChange={(value) => setMark((current) => ({ ...current, note: value }))} placeholder="Dato que no encaje en los campos anteriores." />
                </div>
                <label className="mt-5 grid gap-2">
                  <span className={labelClass}>Intensidad: {mark.intensity}/5</span>
                  <input type="range" min={1} max={5} value={mark.intensity} onChange={(event) => setMark((current) => ({ ...current, intensity: Number(event.target.value) }))} />
                </label>
                <button type="button" onClick={() => void addMark()} disabled={submitting || !markComplete} className={`mt-6 bg-[#c8a951] text-[#050504] ${buttonClass}`}>
                  {submitting ? 'Registrando…' : `Registrar marca · día ${dayFromStart(activeState.window.started_at)}`}
                </button>
              </div>

              <aside className="border border-[#302b20] bg-[#0a0a08] p-5">
                <div className={labelClass}>Marcas registradas</div>
                <div className="mt-4 space-y-3">
                  {activeState.marks.length ? activeState.marks.slice().reverse().map((item) => (
                    <article key={item.id} className="border border-[#282319] bg-[#070706] p-3">
                      <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-[#716a5e]">
                        <span>Día {item.day_number}</span><span>{item.intensity ?? 0}/5</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#d5cdbd]">{item.trigger_text || item.note}</p>
                      <div className="mt-3 space-y-1 text-[11px] text-[#81796b]">
                        <div className="flex gap-2"><MapPin className="mt-0.5 h-3 w-3" />{item.location_context}</div>
                        {item.social_context ? <div className="flex gap-2"><UserRound className="mt-0.5 h-3 w-3" />{item.social_context}</div> : null}
                      </div>
                    </article>
                  )) : <p className="text-sm leading-6 text-[#81796b]">Aún no existen marcas. Registra sólo cuando el patrón aparezca.</p>}
                </div>
              </aside>
            </section>

            <section className={`border p-5 md:p-7 ${activeState.canClose ? 'border-[#5e6d42] bg-[#0b1208]' : 'border-[#302b20] bg-[#0a0a08]'}`}>
              <div className="flex items-center gap-3">
                {activeState.canClose ? <Check className="h-5 w-5 text-[#9cb57d]" /> : <Clock3 className="h-5 w-5 text-[#766b50]" />}
                <div>
                  <div className={labelClass}>Cierre de calibración</div>
                  <h2 className="mt-2 text-2xl text-[#f5eedc]">{activeState.canClose ? 'La ventana terminó. Declara qué observaste.' : 'El retorno se habilita al cumplir 72 horas.'}</h2>
                </div>
              </div>
              {activeState.canClose ? (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <TextArea label="Qué piensas ahora" value={reflection.whatChanged} onChange={(value) => setReflection((current) => ({ ...current, whatChanged: value }))} />
                  <TextArea label="Qué sentiste durante estos días" value={reflection.whatNoticed} onChange={(value) => setReflection((current) => ({ ...current, whatNoticed: value }))} />
                  <TextArea label="Qué evitaste ver o hacer" value={reflection.whatAvoided} onChange={(value) => setReflection((current) => ({ ...current, whatAvoided: value }))} />
                  <TextArea label="Qué parte fue tuya" value={reflection.whatWasMine} onChange={(value) => setReflection((current) => ({ ...current, whatWasMine: value }))} />
                  <TextArea label="Qué parte no fue tuya" value={reflection.whatWasNotMine} onChange={(value) => setReflection((current) => ({ ...current, whatWasNotMine: value }))} />
                  <TextArea label="Qué necesitas ahora" value={reflection.neededToday} onChange={(value) => setReflection((current) => ({ ...current, neededToday: value }))} />
                </div>
              ) : null}
              <button type="button" onClick={() => void closeWindow()} disabled={submitting || !activeState.canClose || !reflectionComplete} className={`mt-6 ${buttonClass}`}>
                Declarar atractor y abrir observatorio <ArrowRight className="h-4 w-4" />
              </button>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
