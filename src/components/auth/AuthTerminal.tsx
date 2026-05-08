import Link from 'next/link'

export function AuthTerminal({
  title,
  action,
  mode,
  error,
  state
}: {
  title: string
  action: (formData: FormData) => Promise<void>
  mode: 'login' | 'register' | 'forgot' | 'reset'
  error?: string
  state?: string
}) {
  const needsPassword = mode !== 'forgot'
  const showEmail = mode !== 'reset'

  return (
    <section className="terminal-panel relative mx-auto max-w-md overflow-hidden p-6 md:p-8">
      <div className="scanline" />
      <div className="relative">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gold">Acceso instrumental</p>
        <h1 className="mt-3 font-display text-lg uppercase tracking-[0.12em] text-paper">{title}</h1>
        <p className="mt-4 font-serif text-base italic leading-relaxed text-zinc-500">
          Identidad minima. Sesion persistente. El nodo recuerda solo lo necesario para continuidad operacional.
        </p>

        <form action={action} className="mt-7 space-y-4">
          {showEmail && <Input name="email" type="email" label="Correo" />}
          {needsPassword && <Input name="password" type="password" label={mode === 'reset' ? 'Nueva clave' : 'Clave'} />}
          <button className="w-full bg-gold px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-void transition hover:bg-paper">
            Ejecutar
          </button>
        </form>

        {error && <p className="mt-4 border-l border-signalRed bg-signalRed/10 p-3 font-mono text-[10px] uppercase tracking-[0.14em] text-red-200">{error}</p>}
        {state && <p className="mt-4 border-l border-gold bg-gold/10 p-3 font-mono text-[10px] uppercase tracking-[0.14em] text-gold">{state}</p>}

        <div className="mt-6 flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
          {mode !== 'login' && <Link href="/login">Login</Link>}
          {mode !== 'register' && <Link href="/register">Registro</Link>}
          {mode !== 'forgot' && <Link href="/forgot">Reset</Link>}
        </div>
      </div>
    </section>
  )
}

function Input({ name, type, label }: { name: string; type: string; label: string }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">{label}</span>
      <input
        required
        name={name}
        type={type}
        className="mt-2 w-full border border-gold/15 bg-black/45 px-4 py-3 font-mono text-sm text-paper outline-none focus:border-gold/50"
      />
    </label>
  )
}
