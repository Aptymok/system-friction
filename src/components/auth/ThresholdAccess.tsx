'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { loginAction } from '@/lib/auth/actions';
import { translateRootAccess } from '@/lib/root/rootGovernanceTranslator';

const steps = [
  'VALIDANDO TOPOLOGIA',
  'SINCRONIZANDO VECTOR TEMPORAL',
  'REVISANDO RESIDUO DE DERIVA',
  'HIDRATANDO SESION',
  'ACCESO AUTORIZADO',
];

function safeDestination(value?: string | null) {
  if (!value) return '/terminal';
  if (!value.startsWith('/')) return '/terminal';
  if (value.startsWith('//')) return '/terminal';
  if (value.startsWith('/login')) return '/terminal';

  return value;
}

export default function ThresholdAccess({
  error,
  next = '/terminal',
}: {
  error?: string;
  next?: string;
}) {
  const startedAt = useRef(Date.now());
  const firstKeyAt = useRef<number | null>(null);
  const lastKeyAt = useRef<number | null>(null);
  const latencies = useRef<number[]>([]);

  const [backspaceCount, setBackspaceCount] = useState(0);
  const [fieldAbandonment, setFieldAbandonment] = useState(0);
  const [submitAttempts, setSubmitAttempts] = useState(0);
  const [stepIndex, setStepIndex] = useState(-1);
  const [message] = useState(error || '');

  const destination = safeDestination(next);
  const accessReading = message ? translateRootAccess({ error: message }) : null;

  function trackKey(event: React.KeyboardEvent<HTMLInputElement>) {
    const now = Date.now();

    if (!firstKeyAt.current) firstKeyAt.current = now;
    if (lastKeyAt.current) latencies.current.push(now - lastKeyAt.current);

    lastKeyAt.current = now;

    if (event.key === 'Backspace') {
      setBackspaceCount((value) => value + 1);
    }
  }

  function prepareSubmit() {
    setSubmitAttempts((value) => value + 1);
    setStepIndex(steps.length - 1);
  }

  const now = Date.now();

  const timeToFirstKey = firstKeyAt.current
    ? Number(((firstKeyAt.current - startedAt.current) / 1000).toFixed(3))
    : '';

  const typingLatency = latencies.current.length
    ? Number((latencies.current.reduce((sum, value) => sum + value, 0) / latencies.current.length).toFixed(2))
    : '';

  const totalSeconds = Number(((now - startedAt.current) / 1000).toFixed(3));

  return (
    <section className="mx-auto w-full max-w-xl border border-[rgba(200,169,81,0.12)] bg-[#060605] p-7 text-[#c8c4b8] shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
      <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#C8A951]">
        Umbral ROOT
      </p>

      <h1 className="mt-4 font-display text-lg uppercase tracking-[0.18em] text-[#C8A951]">
        Acceso operativo Aptymok
      </h1>

      <div className="mt-3 border border-[#c8a95114] bg-black/20 p-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#6b5820]">
        destino solicitado: <span className="text-[#C8A951]">{destination}</span>
      </div>

      <div className="mt-6 grid gap-2 border-y border-[rgba(200,169,81,0.08)] py-4 font-mono text-[10px] uppercase tracking-[0.22em] text-[#5c5c52]">
        <span>Acceso: pendiente de validacion</span>
        <span>Accion siguiente: iniciar sesion raiz</span>
      </div>

      <form action={loginAction} onSubmit={prepareSubmit} className="mt-7 space-y-5">
        <input type="hidden" name="next" value={destination} />
        <input type="hidden" name="time_to_first_key" value={timeToFirstKey} />
        <input type="hidden" name="typing_latency" value={typingLatency} />
        <input type="hidden" name="backspace_count" value={backspaceCount} />
        <input type="hidden" name="field_abandonment" value={fieldAbandonment} />
        <input type="hidden" name="submit_attempts" value={submitAttempts + 1} />
        <input type="hidden" name="total_seconds" value={totalSeconds} />

        <label className="block font-mono text-[10px] uppercase tracking-[0.24em] text-[#5c5c52]">
          IDENTIFICADOR
          <input
            required
            name="email"
            type="email"
            autoComplete="email"
            onBlur={(event) => event.currentTarget.value && setFieldAbandonment((value) => value + 1)}
            onKeyDown={trackKey}
            className="mt-2 w-full border-0 border-b border-[rgba(200,169,81,0.18)] bg-black/30 px-3 py-3 font-mono text-sm text-[#c8c4b8] outline-none focus:border-[#C8A951]"
          />
        </label>

        <label className="block font-mono text-[10px] uppercase tracking-[0.24em] text-[#5c5c52]">
          CLAVE DE INSTANCIA
          <input
            required
            name="password"
            type="password"
            autoComplete="current-password"
            onKeyDown={trackKey}
            className="mt-2 w-full border-0 border-b border-[rgba(200,169,81,0.18)] bg-black/30 px-3 py-3 font-mono text-sm text-[#c8c4b8] outline-none focus:border-[#C8A951]"
          />
        </label>

        <button
          type="submit"
          className="w-full border border-[rgba(200,169,81,0.4)] bg-[rgba(200,169,81,0.07)] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.24em] text-[#C8A951]"
        >
          INICIAR SESION RAIZ
        </button>
      </form>

      <div className="mt-5 flex justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[#5c5c52]">
        <Link href="/register" className="hover:text-[#C8A951]">
          REGISTRAR OBSERVADOR
        </Link>
        <Link href="/forgot" className="hover:text-[#C8A951]">
          RECUPERAR CLAVE
        </Link>
      </div>

      <div className="mt-6 space-y-2 font-mono text-[10px] uppercase tracking-[0.18em]">
        {steps.map((step, index) => (
          <div key={step} className={index <= stepIndex ? 'text-[#C8A951]' : 'text-[#2e2e2a]'}>
            {step}
          </div>
        ))}
      </div>

      {accessReading ? (
        <div className="mt-5 border-l border-[#b85050] bg-[#b85050]/10 p-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#b85050]">
          <p>{accessReading.state}</p>
          <p className="mt-2 text-[#c8c4b8]">{accessReading.reason}</p>
          <p className="mt-2 text-[#8a7568]">{accessReading.nextAction}</p>
        </div>
      ) : null}
    </section>
  );
}