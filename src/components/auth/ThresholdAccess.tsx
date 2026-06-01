'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/runtime/supabase/client';

const steps = [
  'VALIDANDO TOPOLOGIA',
  'SINCRONIZANDO VECTOR TEMPORAL',
  'REVISANDO RESIDUO DE DERIVA',
  'HIDRATANDO SESION',
  'ACCESO AUTORIZADO',
];

async function sha256(input: string) {
  const data = new TextEncoder().encode(input.toLowerCase().trim());
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function isRootIdentity(role?: string | null, email?: string | null) {
  return role === 'root' || role === 'system' || email?.toLowerCase() === 'aptymok@gmail.com';
}

function withTimeout<T>(operation: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(() => reject(new Error(label)), ms);
    Promise.resolve(operation)
      .then((value) => resolve(value))
      .catch((error) => reject(error))
      .finally(() => globalThis.clearTimeout(timer));
  });
}

async function resolvePathFromUser(
  supabase: NonNullable<ReturnType<typeof createBrowserSupabaseClient>>,
  userId?: string | null,
  email?: string | null,
) {
  if (!userId) return email?.toLowerCase() === 'aptymok@gmail.com' ? '/root' : '/user';
  if (email?.toLowerCase() === 'aptymok@gmail.com') return '/root';

  try {
    const { data: profile } = await withTimeout(
      supabase.from('profiles').select('role').eq('user_id', userId).maybeSingle(),
      2500,
      'PROFILE_ROLE_TIMEOUT',
    );
    return isRootIdentity(profile?.role, email) ? '/root' : '/user';
  } catch {
    return email?.toLowerCase() === 'aptymok@gmail.com' ? '/root' : '/user';
  }
}

export default function ThresholdAccess({ error }: { error?: string }) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const startedAt = useRef(Date.now());
  const firstKeyAt = useRef<number | null>(null);
  const lastKeyAt = useRef<number | null>(null);
  const latencies = useRef<number[]>([]);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [backspaceCount, setBackspaceCount] = useState(0);
  const [fieldAbandonment, setFieldAbandonment] = useState(0);
  const [submitAttempts, setSubmitAttempts] = useState(0);
  const [stepIndex, setStepIndex] = useState(-1);
  const [message, setMessage] = useState(error || '');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        const user = data.session?.user;
        if (user) router.replace(await resolvePathFromUser(supabase, user.id, user.email));
      })
      .catch(() => {
        void supabase.auth.signOut();
      });
  }, [router, supabase]);

  const trackKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const now = Date.now();
    if (!firstKeyAt.current) firstKeyAt.current = now;
    if (lastKeyAt.current) latencies.current.push(now - lastKeyAt.current);
    lastKeyAt.current = now;
    if (event.key === 'Backspace') setBackspaceCount((value) => value + 1);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitAttempts((value) => value + 1);
    setMessage('');

    if (!supabase) {
      setMessage('SUPABASE NO CONFIGURADO');
      return;
    }

    try {
      for (let i = 0; i < steps.length - 1; i += 1) {
        setStepIndex(i);
        await new Promise((resolve) => setTimeout(resolve, 180));
      }

      const { data: signInData, error: signInError } = await withTimeout(
        supabase.auth.signInWithPassword({ email: identifier, password }),
        10000,
        'SIGN_IN_TIMEOUT',
      );

      if (signInError) {
        setStepIndex(-1);
        setMessage(signInError.message);
        return;
      }

      setStepIndex(steps.length - 1);
      const now = Date.now();
      const telemetry = {
        time_to_first_key: firstKeyAt.current ? Number(((firstKeyAt.current - startedAt.current) / 1000).toFixed(3)) : null,
        typing_latency: latencies.current.length
          ? Number((latencies.current.reduce((sum, value) => sum + value, 0) / latencies.current.length).toFixed(2))
          : null,
        backspace_count: backspaceCount,
        field_abandonment: fieldAbandonment,
        submit_attempts: submitAttempts + 1,
        total_seconds: Number(((now - startedAt.current) / 1000).toFixed(3)),
      };

      void fetch('/api/auth/threshold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_hash: await sha256(identifier), telemetry }),
      });

      const user = signInData.user;
      const destination = await resolvePathFromUser(supabase, user?.id, user?.email ?? identifier);
      router.refresh();
      router.replace(destination);
    } catch (loginError) {
      setStepIndex(-1);
      setMessage(loginError instanceof Error ? loginError.message : 'LOGIN_FLOW_FAILED');
    }
  };

  return (
    <section className="mx-auto w-full max-w-xl border border-[rgba(200,169,81,0.12)] bg-[#060605] p-7 text-[#c8c4b8] shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
      <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#C8A951]">SYSTEM FRICTION INSTITUTE</p>
      <h1 className="mt-4 font-display text-lg uppercase tracking-[0.18em] text-[#C8A951]">OBSERVATORIO COGNITIVO LONGITUDINAL</h1>
      <div className="mt-6 grid gap-2 border-y border-[rgba(200,169,81,0.08)] py-4 font-mono text-[10px] uppercase tracking-[0.22em] text-[#5c5c52]">
        <span>NODO: PRODUCCION</span>
        <span>ESTADO: ESPERANDO OBSERVADOR</span>
      </div>

      <form onSubmit={submit} className="mt-7 space-y-5">
        <label className="block font-mono text-[10px] uppercase tracking-[0.24em] text-[#5c5c52]">
          IDENTIFICADOR
          <input
            required
            type="email"
            autoComplete="email"
            value={identifier}
            onBlur={() => identifier && !password && setFieldAbandonment((value) => value + 1)}
            onKeyDown={trackKey}
            onChange={(event) => setIdentifier(event.target.value)}
            className="mt-2 w-full border-0 border-b border-[rgba(200,169,81,0.18)] bg-black/30 px-3 py-3 font-mono text-sm text-[#c8c4b8] outline-none focus:border-[#C8A951]"
          />
        </label>
        <label className="block font-mono text-[10px] uppercase tracking-[0.24em] text-[#5c5c52]">
          CLAVE DE INSTANCIA
          <input
            required
            type="password"
            autoComplete="current-password"
            value={password}
            onKeyDown={trackKey}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full border-0 border-b border-[rgba(200,169,81,0.18)] bg-black/30 px-3 py-3 font-mono text-sm text-[#c8c4b8] outline-none focus:border-[#C8A951]"
          />
        </label>
        <button className="w-full border border-[rgba(200,169,81,0.4)] bg-[rgba(200,169,81,0.07)] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.24em] text-[#C8A951]">
          INICIALIZAR SESION →
        </button>
      </form>

      <div className="mt-5 flex justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[#5c5c52]">
        <Link href="/register" className="hover:text-[#C8A951]">REGISTRAR OBSERVADOR</Link>
        <Link href="/forgot" className="hover:text-[#C8A951]">RECUPERAR CLAVE</Link>
      </div>

      <div className="mt-6 space-y-2 font-mono text-[10px] uppercase tracking-[0.18em]">
        {steps.map((step, index) => (
          <div key={step} className={index <= stepIndex ? 'text-[#C8A951]' : 'text-[#2e2e2a'}>
            {step}
          </div>
        ))}
      </div>
      {message && <p className="mt-5 border-l border-[#b85050] bg-[#b85050]/10 p-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#b85050]">{message}</p>}
    </section>
  );
}
