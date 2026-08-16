import Link from 'next/link';
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

function destinationLabel(next: string) {
  if (next === '/studio' || next.startsWith('/studio?')) return 'STUDIO';
  if (next.startsWith('/root/cognitive-twin')) return 'COGNITIVE TWIN';
  if (next.startsWith('/root/evidence')) return 'EVIDENCE';
  if (next.startsWith('/root')) return 'ROOT';
  if (next.startsWith('/field')) return 'FIELD';
  return 'SFI';
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = safeNextPath(params?.next);
  const destination = destinationLabel(next);

  return (
    <main className="min-h-screen bg-[#050504] text-[#c8c4b8]">
      <header className="border-b border-[#c8a95122] px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-5">
          <Link href="/" className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#c8a951]">SFI · ACCESS</Link>
          <div className="flex items-center gap-4 font-mono text-[9px] uppercase tracking-[0.16em] text-[#776e5d]">
            <Link href="/observatory">OBSERVE</Link>
            <Link href="/contact">ENGAGE</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-69px)] max-w-6xl items-stretch lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col justify-between border-b border-[#c8a95122] px-6 py-14 lg:border-b-0 lg:border-r lg:py-20">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#9a8248]">AUTHENTICATION BOUNDARY</p>
            <h1 className="mt-7 max-w-xl font-serif text-5xl leading-[0.98] tracking-[-0.04em] text-[#f0e5cc] md:text-7xl">Identity before operation.</h1>
            <p className="mt-7 max-w-xl font-serif text-base leading-8 text-[#938b7d]">Public observation does not require identity. Operational surfaces do. Authentication preserves the destination that brought you here and resumes the corresponding governed surface after access is resolved.</p>
          </div>

          <div className="mt-12 border-l border-[#c8a95144] pl-4">
            <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#665e50]">RESUME TARGET</p>
            <strong className="mt-3 block font-serif text-3xl font-normal text-[#d7c596]">{destination}</strong>
            <code className="mt-2 block font-mono text-[9px] text-[#716a5e]">{next}</code>
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-14 lg:py-20">
          <section className="w-full max-w-md border border-[#c8a95122] bg-[#0b0b09] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
            <div className="mb-8">
              <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#c8a951]">SYSTEM FRICTION INSTITUTE</p>
              <h2 className="mt-4 font-serif text-4xl font-normal text-[#f1ede0]">Access</h2>
              <p className="mt-3 text-sm leading-6 text-[#8f8878]">Authenticate to continue to {destination}.</p>
            </div>

            {params?.error ? (
              <div className="mb-5 border border-[#8f3f34]/50 bg-[#1a0d0a] px-3 py-2 font-mono text-[11px] text-[#df8a78]">
                {decodeURIComponent(params.error)}
              </div>
            ) : null}

            <form action={loginAction} className="space-y-5">
              <input type="hidden" name="next" value={next} />
              <label className="block">
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#777063]">Email</span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="mt-2 w-full border border-[#272219] bg-[#060605] px-3 py-3 text-sm text-[#f1ede0] outline-none transition focus:border-[#c8a951]"
                />
              </label>
              <label className="block">
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#777063]">Password</span>
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="mt-2 w-full border border-[#272219] bg-[#060605] px-3 py-3 text-sm text-[#f1ede0] outline-none transition focus:border-[#c8a951]"
                />
              </label>
              <button
                type="submit"
                className="w-full border border-[#c8a95166] bg-[#c8a951] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#060605] transition hover:bg-[#e0c46b]"
              >
                Authenticate → {destination}
              </button>
            </form>

            <div className="mt-7 flex items-center justify-between gap-4 border-t border-[#272219] pt-5 font-mono text-[8px] uppercase tracking-[0.14em] text-[#625c50]">
              <Link href="/forgot">Forgot password</Link>
              <Link href="/">Return to layer 0</Link>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
