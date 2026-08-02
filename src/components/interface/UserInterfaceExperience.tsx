'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Check,
  CircleDollarSign,
  Clock3,
  LockKeyhole,
  Orbit,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import type { PhenotypeProfile } from '@/lib/user-interface/phenotype';

type MophResult = {
  friction_reading: string;
  conversion_break: string;
  minimal_perturbation: string;
  next_action: string;
  risk: 'low' | 'medium' | 'high';
  sfi_dr01_fit: 'low' | 'medium' | 'high';
  confidence: number;
  user_friendly_explanation: string;
};

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
  entitlement: {
    tier: string;
    status: string;
    active: boolean;
  };
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
  ['01', 'Ingreso', 'Identidad mínima y sesión persistente.'],
  ['02', 'Mini MOP-H', 'Declaración del sistema atorado y evidencia disponible.'],
  ['03', 'Fenotipo', 'Perfil operativo derivado de la lectura inicial.'],
  ['04', 'Desbloqueo', 'Pago y habilitación de perturbaciones mínimas.'],
  ['05', 'Campo', 'Interacción, retorno y observación longitudinal.'],
  ['06', 'MIHM', 'Evidencia sostenida, atractores y proyección de escenarios.'],
] as const;

function Field({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="grid gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8f8878]">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="resize-y border border-[#302b20] bg-[#060605] px-4 py-3 text-sm leading-6 text-[#f2ead8] outline-none transition focus:border-[#c8a951]"
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-[#302b20] bg-[#080807] p-4">
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#777063]">{label}</div>
      <div className="mt-2 text-lg text-[#f2ead8]">{value}</div>
    </div>
  );
}

function dateLabel(value: string | null) {
  if (!value) return 'Sin registro';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function UserInterfaceExperience({
  authenticated,
  userEmail,
  entitlement,
  snapshot,
  paymentStatus,
}: Props) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [status, setStatus] = useState<'idle' | 'running' | 'checkout' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MophResult | null>(null);
  const [phenotype, setPhenotype] = useState<PhenotypeProfile | null>(snapshot.latestPhenotype);
  const [caseId, setCaseId] = useState<string | null>(snapshot.latestCaseId);

  const activeStep = useMemo(() => {
    if (!authenticated) return 0;
    if (!phenotype) return 1;
    if (!entitlement.active) return 3;
    if (!snapshot.latestInterventionAt) return 4;
    return 5;
  }, [authenticated, entitlement.active, phenotype, snapshot.latestInterventionAt]);

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
      if (!response.ok || payload.ok === false) throw new Error(payload.error || 'mini_moph_failed');
      setResult(payload.result as MophResult);
      setPhenotype(payload.phenotype as PhenotypeProfile);
      setCaseId(String(payload.caseId));
      setStatus('idle');
    } catch (nextError) {
      setStatus('error');
      setError(nextError instanceof Error ? nextError.message : 'mini_moph_failed');
    }
  }

  async function startCheckout() {
    setStatus('checkout');
    setError(null);
    try {
      const response = await fetch('/api/interface/checkout', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error(payload.error || 'checkout_failed');
      window.location.assign(payload.url);
    } catch (nextError) {
      setStatus('error');
      setError(nextError instanceof Error ? nextError.message : 'checkout_failed');
    }
  }

  return (
    <main className="min-h-screen bg-[#050504] text-[#d8d1c0]">
      <header className="border-b border-[#302b20] px-5 py-6 md:px-10">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#c8a951]">SFI / User Interface</div>
            <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-[-0.03em] text-[#f4eddd] md:text-5xl">
              De una fricción declarada a una intervención observable.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#938b7b]">
              La interfaz reduce la complejidad interna de SFI a una secuencia verificable: cuenta, lectura, fenotipo, acceso, perturbación mínima y retorno longitudinal.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em]">
            <span className="border border-[#302b20] px-3 py-2 text-[#8f8878]">{authenticated ? userEmail : 'Sesión no iniciada'}</span>
            <span className={`border px-3 py-2 ${entitlement.active ? 'border-[#6f8a58] text-[#9fbd83]' : 'border-[#6b5830] text-[#c8a951]'}`}>
              {entitlement.active ? entitlement.tier : 'Preview'}
            </span>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1500px] px-5 py-6 md:px-10">
        {paymentStatus === 'success' ? (
          <div className="mb-6 border border-[#547044] bg-[#0b1309] px-4 py-3 text-sm text-[#a9c795]">
            Pago recibido. El webhook actualizará el nivel de acceso; recarga esta vista si el estado aún aparece como preview.
          </div>
        ) : null}
        {paymentStatus === 'cancelled' ? (
          <div className="mb-6 border border-[#6b5830] bg-[#151108] px-4 py-3 text-sm text-[#c8a951]">El proceso de pago fue cancelado. El caso y el perfil permanecen guardados.</div>
        ) : null}

        <div className="grid gap-px border border-[#302b20] bg-[#302b20] md:grid-cols-3 xl:grid-cols-6">
          {journey.map(([number, title, description], index) => (
            <div key={number} className={`min-h-36 bg-[#080807] p-4 ${index <= activeStep ? 'opacity-100' : 'opacity-45'}`}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#c8a951]">{number}</span>
                {index < activeStep ? <Check className="h-4 w-4 text-[#8da673]" /> : index === activeStep ? <Orbit className="h-4 w-4 text-[#c8a951]" /> : <LockKeyhole className="h-4 w-4 text-[#5d574c]" />}
              </div>
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
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#938b7b]">
              La cuenta vincula cada lectura con un caso propio. Sin identidad no existe continuidad, retorno ni perfil longitudinal.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/login?next=%2Finterface" className="inline-flex items-center gap-2 bg-[#c8a951] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#050504]">
                Iniciar sesión <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/signup?next=%2Finterface" className="inline-flex items-center gap-2 border border-[#5c4c2c] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">
                Generar cuenta
              </Link>
            </div>
          </div>
          <div className="border border-[#302b20] bg-[#080807] p-7">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#777063]">Límite de privacidad</div>
            <div className="mt-5 space-y-4 text-sm leading-6 text-[#a49b8a]">
              <p>Los casos nacen privados y ligados al dueño de la cuenta.</p>
              <p>Una perturbación no se ejecuta automáticamente: se propone, se observa y requiere decisión humana.</p>
              <p>La evidencia longitudinal no se publica sin un acto separado de autorización.</p>
            </div>
          </div>
        </section>
      ) : (
        <section className="mx-auto grid max-w-[1500px] gap-6 px-5 pb-12 md:px-10 xl:grid-cols-[minmax(0,1fr)_460px]">
          <div className="space-y-6">
            <section className="border border-[#302b20] bg-[#0a0a08] p-5 md:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#c8a951]">Mini MOP-H / Intake</div>
                  <h2 className="mt-3 text-2xl text-[#f4eddd]">Describe un sistema que no está convirtiendo intención en movimiento.</h2>
                </div>
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
                <label className="flex items-start gap-3 border border-[#302b20] bg-[#070706] p-4 text-xs leading-5 text-[#918979]">
                  <input
                    type="checkbox"
                    checked={form.consent}
                    onChange={(event) => patch('consent', event.target.checked)}
                    className="mt-1"
                  />
                  Autorizo que esta lectura se guarde como caso privado y se utilice para construir mi observación longitudinal dentro de SFI.
                </label>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void runMiniMoph()}
                  disabled={status === 'running' || !form.consent || form.stuckSystem.trim().length < 12}
                  className="inline-flex items-center gap-2 bg-[#c8a951] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#050504] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {status === 'running' ? <Clock3 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Ejecutar lectura
                </button>
                {caseId ? <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#6f685d]">case={caseId}</span> : null}
              </div>
              {error ? <div className="mt-5 border border-[#713c32] bg-[#170d0b] p-3 text-sm text-[#d89b8d]">{error}</div> : null}
            </section>

            {result ? (
              <section className="border border-[#302b20] bg-[#0a0a08] p-5 md:p-7">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#c8a951]">Análisis generado</div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Metric label="Riesgo" value={result.risk.toUpperCase()} />
                  <Metric label="Confianza" value={`${Math.round(result.confidence * 100)}%`} />
                </div>
                <div className="mt-4 space-y-3 text-sm leading-7 text-[#b9af9c]">
                  <p><strong className="text-[#eee6d4]">Lectura:</strong> {result.friction_reading}</p>
                  <p><strong className="text-[#eee6d4]">Ruptura de conversión:</strong> {result.conversion_break}</p>
                  <p><strong className="text-[#eee6d4]">Perturbación mínima:</strong> {result.minimal_perturbation}</p>
                </div>
              </section>
            ) : null}

            <section className="border border-[#302b20] bg-[#0a0a08] p-5 md:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#c8a951]">Acceso de campo</div>
                  <h2 className="mt-3 text-2xl text-[#f4eddd]">Perturbación mínima + observación longitudinal</h2>
                </div>
                {entitlement.active ? <ShieldCheck className="h-6 w-6 text-[#8da673]" /> : <LockKeyhole className="h-6 w-6 text-[#c8a951]" />}
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#938b7b]">
                El nivel de pago habilita el ciclo de 72 horas, retornos, evidencia, análisis de atractor, escenarios y lectura MIHM. La ejecución permanece gobernada; no se automatizan acciones externas sin aprobación.
              </p>

              {entitlement.active ? (
                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  <Link href={caseId ? `/field?case=${encodeURIComponent(caseId)}` : '/field'} className="inline-flex items-center justify-between border border-[#607649] bg-[#0c1409] px-5 py-4 font-mono text-[10px] uppercase tracking-[0.16em] text-[#a8c58c]">
                    Abrir FIELD operativo <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/repository" className="inline-flex items-center justify-between border border-[#302b20] px-5 py-4 font-mono text-[10px] uppercase tracking-[0.16em] text-[#a9a08f]">
                    Marco y evidencia <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void startCheckout()}
                  disabled={!phenotype || status === 'checkout'}
                  className="mt-6 inline-flex items-center gap-2 bg-[#c8a951] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#050504] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CircleDollarSign className="h-4 w-4" />
                  {status === 'checkout' ? 'Conectando pago' : 'Desbloquear observación'}
                </button>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="border border-[#302b20] bg-[#0a0a08] p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#c8a951]">Perfil de fenotipo</div>
              {phenotype ? (
                <div className="mt-5">
                  <div className="text-2xl text-[#f4eddd]">{phenotype.label}</div>
                  <p className="mt-3 text-sm leading-7 text-[#9c9382]">{phenotype.summary}</p>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <Metric label="Evidencia" value={`${phenotype.dimensions.evidenceDensity}%`} />
                    <Metric label="Cambio" value={`${phenotype.dimensions.changeCapacity}%`} />
                    <Metric label="Riesgo de campo" value={`${phenotype.dimensions.fieldRisk}%`} />
                    <Metric label="Preparación longitudinal" value={`${phenotype.dimensions.longitudinalReadiness}%`} />
                  </div>
                </div>
              ) : (
                <p className="mt-5 text-sm leading-6 text-[#777063]">El perfil se genera después de la primera lectura Mini MOP-H.</p>
              )}
            </section>

            <section className="border border-[#302b20] bg-[#0a0a08] p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#c8a951]">Continuidad observacional</div>
              <div className="mt-5 space-y-4 text-xs leading-5">
                <div className="flex items-start justify-between gap-4 border-b border-[#242118] pb-3"><span className="text-[#777063]">Casos privados</span><span className="text-[#eee6d4]">{snapshot.caseCount}</span></div>
                <div className="border-b border-[#242118] pb-3"><div className="text-[#777063]">Último MOP-H</div><div className="mt-1 text-[#b8ae9b]">{dateLabel(snapshot.latestMophAt)}</div></div>
                <div className="border-b border-[#242118] pb-3"><div className="text-[#777063]">Última lectura MIHM</div><div className="mt-1 text-[#b8ae9b]">{dateLabel(snapshot.latestMihmAt)}</div></div>
                <div className="border-b border-[#242118] pb-3"><div className="text-[#777063]">Última perturbación</div><div className="mt-1 text-[#b8ae9b]">{dateLabel(snapshot.latestInterventionAt)}</div></div>
                <div><div className="text-[#777063]">Próximo retorno</div><div className="mt-1 text-[#b8ae9b]">{dateLabel(snapshot.nextReturnAt)}</div></div>
              </div>
            </section>

            <section className="border border-[#302b20] bg-[#080807] p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#777063]">Capacidades posteriores</div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-[#9a9180]">
                <p>• MOP-H completo y contraste de evidencia.</p>
                <p>• Identificación de atractor y ruptura de conversión.</p>
                <p>• Proyección de escenarios y riesgo.</p>
                <p>• Perturbaciones mínimas sucesivas.</p>
                <p>• MIHM longitudinal con retornos verificables.</p>
              </div>
            </section>
          </aside>
        </section>
      )}
    </main>
  );
}
