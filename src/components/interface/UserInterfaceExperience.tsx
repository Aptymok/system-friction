'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleDot, Clock3, Compass, Eye, LockKeyhole, Orbit, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import type { PhenotypeProfile } from '@/lib/user-interface/phenotype';

type InterfaceSnapshot = {
  caseCount: number;
  latestCaseId: string | null;
  latestMophAt: string | null;
  latestMihmAt: string | null;
  latestInterventionAt: string | null;
  nextReturnAt: string | null;
  latestPhenotype: PhenotypeProfile | null;
};

type Props = {
  authenticated: boolean;
  userEmail: string | null;
  entitlement: { tier: string; status: string; active: boolean };
  snapshot: InterfaceSnapshot;
  paymentStatus?: string;
};

type FormState = {
  stuckSystem: string;
  objective: string;
  attempts: string;
  evidence: string;
  consequence: string;
  consent: boolean;
};

type StepId = 'situation' | 'objective' | 'history' | 'evidence' | 'boundary' | 'review';

const initialForm: FormState = {
  stuckSystem: '',
  objective: '',
  attempts: '',
  evidence: '',
  consequence: '',
  consent: false,
};

const steps: Array<{
  id: StepId;
  number: string;
  title: string;
  prompt: string;
  explanation: string;
  field: keyof Omit<FormState, 'consent'> | null;
  placeholder?: string;
}> = [
  {
    id: 'situation',
    number: '01',
    title: 'Qué está detenido',
    prompt: 'Describe la situación que no está convirtiendo intención en movimiento.',
    explanation: 'No buscamos una historia perfecta. Buscamos reconocer el sistema, las personas o condiciones involucradas y el punto donde el movimiento se detiene.',
    field: 'stuckSystem',
    placeholder: 'Ejemplo: Tenemos una decisión tomada, pero cada semana aparece una nueva condición y nadie ejecuta el siguiente paso.',
  },
  {
    id: 'objective',
    number: '02',
    title: 'Qué debería ser distinto',
    prompt: '¿Qué cambio concreto permitiría afirmar que la situación comenzó a moverse?',
    explanation: 'El objetivo debe poder observarse. No necesita ser grande; necesita ser reconocible cuando ocurra.',
    field: 'objective',
    placeholder: 'Ejemplo: Que exista una decisión cerrada, una persona responsable y una primera acción ejecutada antes del viernes.',
  },
  {
    id: 'history',
    number: '03',
    title: 'Qué ya se intentó',
    prompt: '¿Qué acciones, conversaciones o decisiones ya ocurrieron?',
    explanation: 'Esto evita recomendar la misma acción con otro nombre y permite distinguir falta de esfuerzo de una fricción estructural.',
    field: 'attempts',
    placeholder: 'Incluye lo que sí funcionó parcialmente y lo que volvió a detenerse.',
  },
  {
    id: 'evidence',
    number: '04',
    title: 'Qué puede sostener la lectura',
    prompt: '¿Qué hechos, documentos, mensajes, fechas o resultados existen?',
    explanation: 'La evidencia no tiene que probarlo todo. Sirve para separar lo observado de lo supuesto y para que futuras lecturas puedan compararse.',
    field: 'evidence',
    placeholder: 'Ejemplo: correos, acuerdos, fechas, indicadores, capturas, decisiones registradas o cambios observados.',
  },
  {
    id: 'boundary',
    number: '05',
    title: 'Qué está en juego',
    prompt: '¿Qué ocurre si la situación permanece igual?',
    explanation: 'Esta respuesta define el nivel de cuidado, urgencia y reversibilidad que debe tener cualquier microejecución posterior.',
    field: 'consequence',
    placeholder: 'Describe la consecuencia real, no la más dramática.',
  },
  {
    id: 'review',
    number: '06',
    title: 'Abrir la observación',
    prompt: 'Revisa lo declarado antes de crear el caso privado.',
    explanation: 'SFI generará una primera lectura y abrirá una ventana de observación. Tú conservarás la responsabilidad de elegir y ejecutar cualquier acción posterior.',
    field: null,
  },
];

function complete(step: StepId, form: FormState) {
  if (step === 'situation') return form.stuckSystem.trim().length >= 12;
  if (step === 'objective') return form.objective.trim().length >= 8;
  if (step === 'history') return form.attempts.trim().length >= 4;
  if (step === 'evidence') return form.evidence.trim().length >= 4;
  if (step === 'boundary') return form.consequence.trim().length >= 4;
  return form.consent;
}

function formatDate(value: string | null) {
  if (!value) return 'Sin registro';
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? 'Sin registro' : new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(parsed);
}

export default function UserInterfaceExperience({ authenticated, userEmail, entitlement, snapshot, paymentStatus }: Props) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [stepIndex, setStepIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'running' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const step = steps[stepIndex];
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);
  const completedSteps = useMemo(() => steps.filter((item) => complete(item.id, form)).length, [form]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function runMiniMoph() {
    setStatus('running');
    setError(null);
    try {
      const response = await fetch('/api/interface/moph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (response.status === 409 && payload.nextPath) {
        window.location.assign(payload.nextPath);
        return;
      }
      if (!response.ok || payload.ok === false) throw new Error(payload.error || 'No fue posible abrir la observación.');
      window.location.assign(payload.nextPath || '/field/participant');
    } catch (nextError) {
      setStatus('error');
      setError(nextError instanceof Error ? nextError.message : 'No fue posible abrir la observación.');
    }
  }

  return (
    <main className="min-h-screen bg-[#050504] text-[#d8d1c0]">
      <header className="border-b border-[#302b20] px-5 py-6 md:px-10">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#c8a951]">SFI · FIELD</div>
            <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-[-0.03em] text-[#f4eddd] md:text-5xl">Construye una trayectoria observable, una decisión pequeña a la vez.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#938b7b]">FIELD no diagnostica tu vida ni decide por ti. Organiza una situación, distingue evidencia de interpretación y propone microejecuciones reversibles para que explores qué cambia realmente.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[0.15em]">
            <span className="border border-[#302b20] px-3 py-2 text-[#8f8878]">{authenticated ? userEmail : 'Sesión no iniciada'}</span>
            <span className="border border-[#5b4d2d] px-3 py-2 text-[#c8a951]">{entitlement.active ? entitlement.tier : 'observación inicial'}</span>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1500px] px-5 py-6 md:px-10">
        {paymentStatus === 'success' ? <div className="mb-5 border border-[#547044] bg-[#0b1309] p-3 text-sm text-[#a9c795]">Pago recibido. El acceso se reflejará en tu observatorio.</div> : null}
        <div className="grid gap-px border border-[#302b20] bg-[#302b20] lg:grid-cols-4">
          <article className="bg-[#090908] p-5"><ShieldCheck className="h-5 w-5 text-[#c8a951]" /><h2 className="mt-4 text-base text-[#eee6d4]">Privado por diseño</h2><p className="mt-2 text-xs leading-5 text-[#817a6c]">Tu caso se conserva como observación privada y longitudinal.</p></article>
          <article className="bg-[#090908] p-5"><Eye className="h-5 w-5 text-[#c8a951]" /><h2 className="mt-4 text-base text-[#eee6d4]">Lectura explícita</h2><p className="mt-2 text-xs leading-5 text-[#817a6c]">Verás qué fue observado, qué fue inferido y qué evidencia falta.</p></article>
          <article className="bg-[#090908] p-5"><Compass className="h-5 w-5 text-[#c8a951]" /><h2 className="mt-4 text-base text-[#eee6d4]">Trayectoria propia</h2><p className="mt-2 text-xs leading-5 text-[#817a6c]">SFI propone rutas; tú decides qué microejecución asumir.</p></article>
          <article className="bg-[#090908] p-5"><Orbit className="h-5 w-5 text-[#c8a951]" /><h2 className="mt-4 text-base text-[#eee6d4]">Aprendizaje por retorno</h2><p className="mt-2 text-xs leading-5 text-[#817a6c]">El sistema aprende de cambios observados y evidencia, no de respuestas correctas.</p></article>
        </div>
      </section>

      {!authenticated ? (
        <section className="mx-auto grid max-w-[1500px] gap-6 px-5 pb-12 md:px-10 lg:grid-cols-[1fr_0.8fr]">
          <div className="border border-[#302b20] bg-[#0a0a08] p-7 md:p-10">
            <UserRound className="h-6 w-6 text-[#c8a951]" />
            <h2 className="mt-6 text-3xl text-[#f4eddd]">Inicia una observación privada.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#938b7b]">La cuenta enlaza objetivos, evidencia, microejecuciones y retornos con una trayectoria propia. Sin sesión no existe continuidad longitudinal.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/login?next=%2Finterface" className="inline-flex items-center gap-2 bg-[#c8a951] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#050504]">Iniciar sesión <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/signup?next=%2Finterface" className="inline-flex items-center gap-2 border border-[#5c4c2c] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Generar cuenta</Link>
            </div>
          </div>
          <div className="border border-[#302b20] bg-[#080807] p-7">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#777063]">Cómo funciona</div>
            <div className="mt-5 space-y-4 text-sm leading-7 text-[#a49b8a]"><p>1. Defines una situación y un objetivo observable.</p><p>2. SFI organiza tensiones, evidencia y límites.</p><p>3. Exploras una microejecución reversible.</p><p>4. Registras qué cambió y construyes tu trayectoria.</p></div>
          </div>
        </section>
      ) : (
        <section className="mx-auto grid max-w-[1500px] gap-6 px-5 pb-12 md:px-10 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="border border-[#302b20] bg-[#0a0a08]">
            <div className="border-b border-[#302b20] p-5 md:p-7">
              <div className="flex items-center justify-between gap-4">
                <div><div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#c8a951]">Definición guiada · {step.number}</div><h2 className="mt-3 text-2xl text-[#f4eddd]">{step.title}</h2></div>
                <div className="text-right"><strong className="block text-xl font-normal text-[#c8a951]">{progress}%</strong><span className="font-mono text-[8px] uppercase tracking-[0.13em] text-[#777063]">trayectoria definida</span></div>
              </div>
              <div className="mt-5 h-px bg-[#262219]"><div className="h-px bg-[#c8a951] transition-all" style={{ width: `${progress}%` }} /></div>
            </div>

            <div className="p-5 md:p-8">
              <p className="max-w-3xl text-xl leading-8 text-[#eee6d4]">{step.prompt}</p>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#918979]">{step.explanation}</p>

              {step.field ? (
                <textarea
                  autoFocus
                  rows={8}
                  value={form[step.field]}
                  placeholder={step.placeholder}
                  onChange={(event) => patch(step.field as keyof FormState, event.target.value as never)}
                  className="mt-7 w-full resize-y border border-[#302b20] bg-[#060605] px-5 py-4 text-base leading-7 text-[#f2ead8] outline-none placeholder:text-[#575145] focus:border-[#c8a951]"
                />
              ) : (
                <div className="mt-7 grid gap-3">
                  {steps.filter((item) => item.field).map((item) => <article key={item.id} className="border border-[#302b20] bg-[#070706] p-4"><span className="font-mono text-[8px] uppercase tracking-[0.15em] text-[#83775f]">{item.title}</span><p className="mt-2 text-sm leading-6 text-[#d8d1c0]">{item.field ? form[item.field] || 'Sin respuesta' : ''}</p></article>)}
                  <label className="flex items-start gap-3 border border-[#5b4d2d] bg-[#0c0a07] p-4 text-xs leading-6 text-[#aaa08e]"><input type="checkbox" checked={form.consent} onChange={(event) => patch('consent', event.target.checked)} className="mt-1" /><span>Autorizo que esta lectura, su evidencia y los retornos posteriores se conserven como caso privado. Comprendo que SFI puede proponer microejecuciones, pero no sustituye mi criterio ni ejecuta decisiones por mí.</span></label>
                </div>
              )}

              <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={() => setStepIndex((value) => Math.max(0, value - 1))} disabled={stepIndex === 0} className="inline-flex items-center gap-2 border border-[#302b20] px-4 py-3 font-mono text-[9px] uppercase tracking-[0.16em] text-[#8f8878] disabled:opacity-30"><ArrowLeft className="h-4 w-4" /> Anterior</button>
                {step.id !== 'review' ? (
                  <button type="button" onClick={() => setStepIndex((value) => Math.min(steps.length - 1, value + 1))} disabled={!complete(step.id, form)} className="inline-flex items-center gap-2 bg-[#c8a951] px-5 py-3 font-mono text-[9px] uppercase tracking-[0.16em] text-[#050504] disabled:cursor-not-allowed disabled:opacity-35">Continuar <ArrowRight className="h-4 w-4" /></button>
                ) : (
                  <button type="button" onClick={() => void runMiniMoph()} disabled={status === 'running' || !form.consent} className="inline-flex items-center gap-2 bg-[#c8a951] px-5 py-3 font-mono text-[9px] uppercase tracking-[0.16em] text-[#050504] disabled:cursor-not-allowed disabled:opacity-35">{status === 'running' ? <Clock3 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Abrir observación</button>
                )}
              </div>
              {error ? <div className="mt-5 border border-[#713c32] bg-[#170d0b] p-3 text-sm text-[#d89b8d]">{error}</div> : null}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="border border-[#302b20] bg-[#080807] p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Tu recorrido</div>
              <div className="mt-5 space-y-4">
                {steps.map((item, index) => <button type="button" key={item.id} onClick={() => setStepIndex(index)} className="flex w-full items-start gap-3 text-left"><span className={`mt-0.5 grid h-5 w-5 place-items-center rounded-full border ${index === stepIndex ? 'border-[#c8a951] text-[#c8a951]' : complete(item.id, form) ? 'border-[#71825e] text-[#9eb486]' : 'border-[#3b362d] text-[#625c50]'}`}>{complete(item.id, form) ? <Check className="h-3 w-3" /> : <CircleDot className="h-3 w-3" />}</span><span><strong className="block text-xs font-normal text-[#ddd4c2]">{item.title}</strong><small className="mt-1 block text-[10px] leading-4 text-[#756e61]">{item.number}</small></span></button>)}
              </div>
              <div className="mt-5 border-t border-[#302b20] pt-4 text-xs text-[#817a6c]">{completedSteps} de {steps.length} etapas completas.</div>
            </section>

            <section className="border border-[#302b20] bg-[#080807] p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Continuidad existente</div>
              <dl className="mt-4 space-y-3 text-sm text-[#918979]"><div className="flex justify-between gap-3"><dt>Casos privados</dt><dd className="text-[#eee6d4]">{snapshot.caseCount}</dd></div><div className="flex justify-between gap-3"><dt>Última lectura</dt><dd className="text-[#eee6d4]">{formatDate(snapshot.latestMophAt)}</dd></div><div className="flex justify-between gap-3"><dt>Próximo retorno</dt><dd className="text-[#eee6d4]">{formatDate(snapshot.nextReturnAt)}</dd></div></dl>
            </section>

            <section className="border border-[#302b20] bg-[#080807] p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Después de abrir el caso</div>
              <div className="mt-4 space-y-4 text-xs leading-6 text-[#918979]"><p>SFI mostrará una lectura inicial con evidencia, incertidumbre y una dirección provisional.</p><p>No tendrás que llenar formularios repetitivos. Registrarás microeventos: qué hiciste, qué cambió y qué apareció.</p><p>La trayectoria se construirá con esos retornos, no con una calificación sobre tus respuestas.</p></div>
            </section>
          </aside>
        </section>
      )}
    </main>
  );
}
