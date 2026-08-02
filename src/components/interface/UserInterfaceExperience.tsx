'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Activity, ArrowRight, Check, Clock3, LockKeyhole, Orbit, Sparkles, UserRound } from 'lucide-react';
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

const initialForm: FormState = {
  stuckSystem: '',
  objective: '',
  attempts: '',
  evidence: '',
  consequence: '',
  consent: false,
};

const journey = [
  ['01', 'Ingreso', 'Cuenta privada y continuidad.'],
  ['02', 'Mini MOP-H', 'Lectura inicial y atractor interno.'],
  ['03', '72 horas', 'Marcas contextuales sin intervención.'],
  ['04', 'Atractor', 'Dirección final declarada al retorno.'],
  ['05', 'Perturbación', 'Acción mínima real y reversible.'],
  ['06', 'Observatorio', 'Grafo, evidencia, MIHM y aprendizaje.'],
] as const;

function Field({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return (
    <label className="grid gap-2">
      <span className="font-mono text-[9px] uppercase tracking-[0.17em] text-[#8f8878]">{label}</span>
      <textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} className="resize-y border border-[#302b20] bg-[#060605] px-4 py-3 text-sm leading-6 text-[#f2ead8] outline-none focus:border-[#c8a951]" />
    </label>
  );
}

export default function UserInterfaceExperience({ authenticated, userEmail, entitlement, snapshot, paymentStatus }: Props) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [status, setStatus] = useState<'idle' | 'running' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

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
      if (!response.ok || payload.ok === false) throw new Error(payload.error || 'mini_moph_failed');
      window.location.assign(payload.nextPath || '/field/participant');
    } catch (nextError) {
      setStatus('error');
      setError(nextError instanceof Error ? nextError.message : 'mini_moph_failed');
    }
  }

  return (
    <main className="min-h-screen bg-[#050504] text-[#d8d1c0]">
      <header className="border-b border-[#302b20] px-5 py-6 md:px-10">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#c8a951]">SFI / acceso al campo</div>
            <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-[-0.03em] text-[#f4eddd] md:text-5xl">De una fricción declarada a una trayectoria observable.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#938b7b]">La primera lectura no produce una intervención inmediata. SFI define un atractor inicial internamente y abre una calibración obligatoria de 72 horas.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[0.15em]">
            <span className="border border-[#302b20] px-3 py-2 text-[#8f8878]">{authenticated ? userEmail : 'Sesión no iniciada'}</span>
            <span className="border border-[#5b4d2d] px-3 py-2 text-[#c8a951]">{entitlement.active ? entitlement.tier : 'calibración'}</span>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1500px] px-5 py-6 md:px-10">
        {paymentStatus === 'success' ? <div className="mb-5 border border-[#547044] bg-[#0b1309] p-3 text-sm text-[#a9c795]">Pago recibido. El acceso se reflejará en Mi Observatorio.</div> : null}
        <div className="grid gap-px border border-[#302b20] bg-[#302b20] md:grid-cols-3 xl:grid-cols-6">
          {journey.map(([number, title, description], index) => (
            <div key={number} className={`min-h-36 bg-[#080807] p-4 ${index <= (authenticated ? 1 : 0) ? 'opacity-100' : 'opacity-45'}`}>
              <div className="flex items-center justify-between"><span className="font-mono text-[10px] text-[#c8a951]">{number}</span>{index === (authenticated ? 1 : 0) ? <Orbit className="h-4 w-4 text-[#c8a951]" /> : index < (authenticated ? 1 : 0) ? <Check className="h-4 w-4 text-[#8da673]" /> : <LockKeyhole className="h-4 w-4 text-[#5d574c]" />}</div>
              <h2 className="mt-5 text-lg text-[#eee6d4]">{title}</h2>
              <p className="mt-2 text-xs leading-5 text-[#817a6c]">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {!authenticated ? (
        <section className="mx-auto grid max-w-[1500px] gap-6 px-5 pb-12 md:px-10 lg:grid-cols-[1fr_0.8fr]">
          <div className="border border-[#302b20] bg-[#0a0a08] p-7 md:p-10">
            <UserRound className="h-6 w-6 text-[#c8a951]" />
            <h2 className="mt-6 text-3xl text-[#f4eddd]">Inicia una observación privada.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#938b7b]">La cuenta enlaza cada lectura, marca, evidencia y retorno con un caso propio. Sin sesión no existe memoria longitudinal.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/login?next=%2Finterface" className="inline-flex items-center gap-2 bg-[#c8a951] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#050504]">Iniciar sesión <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/signup?next=%2Finterface" className="inline-flex items-center gap-2 border border-[#5c4c2c] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Generar cuenta</Link>
            </div>
          </div>
          <div className="border border-[#302b20] bg-[#080807] p-7">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#777063]">Secuencia</div>
            <div className="mt-5 space-y-4 text-sm leading-7 text-[#a49b8a]"><p>1. Declara el sistema atorado.</p><p>2. Observa 72 horas sin modificarlo.</p><p>3. Regresa y declara qué cambió.</p><p>4. SFI consolida el atractor y abre el grafo.</p></div>
          </div>
        </section>
      ) : (
        <section className="mx-auto grid max-w-[1500px] gap-6 px-5 pb-12 md:px-10 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="border border-[#302b20] bg-[#0a0a08] p-5 md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#c8a951]">Mini MOP-H / primera interacción</div><h2 className="mt-3 text-2xl text-[#f4eddd]">Describe el sistema que no está convirtiendo intención en movimiento.</h2></div>
              <Activity className="h-5 w-5 text-[#c8a951]" />
            </div>
            <div className="mt-7 grid gap-5">
              <Field label="Sistema atorado" value={form.stuckSystem} onChange={(value) => patch('stuckSystem', value)} rows={4} />
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Objetivo observable" value={form.objective} onChange={(value) => patch('objective', value)} />
                <Field label="Intentos previos" value={form.attempts} onChange={(value) => patch('attempts', value)} />
                <Field label="Evidencia disponible" value={form.evidence} onChange={(value) => patch('evidence', value)} />
                <Field label="Consecuencia de no moverlo" value={form.consequence} onChange={(value) => patch('consequence', value)} />
              </div>
              <label className="flex items-start gap-3 border border-[#302b20] bg-[#070706] p-4 text-xs leading-5 text-[#918979]"><input type="checkbox" checked={form.consent} onChange={(event) => patch('consent', event.target.checked)} className="mt-1" />Autorizo que la lectura y las marcas posteriores se guarden como caso privado para observación longitudinal.</label>
            </div>
            <button type="button" onClick={() => void runMiniMoph()} disabled={status === 'running' || !form.consent || form.stuckSystem.trim().length < 12} className="mt-6 inline-flex items-center gap-2 bg-[#c8a951] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#050504] disabled:cursor-not-allowed disabled:opacity-40">{status === 'running' ? <Clock3 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Ejecutar lectura y abrir 72 horas</button>
            {error ? <div className="mt-5 border border-[#713c32] bg-[#170d0b] p-3 text-sm text-[#d89b8d]">{error}</div> : null}
          </section>

          <aside className="space-y-5">
            <section className="border border-[#302b20] bg-[#080807] p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Estado anterior</div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-[#918979]"><p>Casos privados: <strong className="text-[#eee6d4]">{snapshot.caseCount}</strong></p><p>Último MOP-H: <strong className="text-[#eee6d4]">{snapshot.latestMophAt ? new Date(snapshot.latestMophAt).toLocaleDateString('es-MX') : 'sin registro'}</strong></p><p>El atractor inicial no se muestra antes de la calibración para no condicionar las marcas.</p></div>
            </section>
            <section className="border border-[#302b20] bg-[#080807] p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Regla de calibración</div>
              <p className="mt-4 text-sm leading-7 text-[#918979]">Durante 72 horas no se propone una acción. Sólo se registra qué apareció, qué hacías, dónde estabas, qué pensaste y qué sentiste después.</p>
            </section>
          </aside>
        </section>
      )}
    </main>
  );
}
