import { loginAction } from '@/lib/auth/actions';

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
  }>;
};

function safeNextPath(value?: string) {
  if (!value) return '/field';
  if (!value.startsWith('/')) return '/field';
  if (value.startsWith('//')) return '/field';
  if (value.startsWith('/login')) return '/field';
  return value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = safeNextPath(params?.next);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#060605] p-6 text-[#c8c4b8]">
      <section className="w-full max-w-md border border-[#c8a95122] bg-[#0b0b09] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
        <div className="mb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">System Friction Institute</p>
          <h1 className="mt-4 text-3xl font-semibold text-[#f1ede0]">Log in</h1>
          <p className="mt-2 text-sm text-[#8f8878]">Accede a System Friction Institute</p>
        </div>

        {params?.error ? (
          <div className="mb-5 border border-[#8f3f34]/50 bg-[#1a0d0a] px-3 py-2 font-mono text-[11px] text-[#df8a78]">
            {decodeURIComponent(params.error)}
          </div>
        ) : null}

        <form action={loginAction} className="space-y-5">
          <input type="hidden" name="next" value={next} />
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#777063]">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-2 w-full border border-[#1e1c17] bg-[#060605] px-3 py-3 text-sm text-[#f1ede0] outline-none focus:border-[#c8a951]"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#777063]">Password</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-2 w-full border border-[#1e1c17] bg-[#060605] px-3 py-3 text-sm text-[#f1ede0] outline-none focus:border-[#c8a951]"
            />
          </label>
          <button
            type="submit"
            className="w-full border border-[#c8a95166] bg-[#c8a951] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#060605] transition hover:bg-[#e0c46b]"
          >
            Log in
          </button>
        </form>
      </section>
    </main>
  );
}
