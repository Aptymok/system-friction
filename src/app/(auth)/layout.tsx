export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_38%),radial-gradient(circle_at_85%_25%,rgba(74,122,170,0.12),transparent_28%),#0A0905] px-4 py-12 text-paper">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[length:56px_56px] opacity-30" />
      <div className="scanline fixed inset-0" />
      <div className="relative mx-auto grid min-h-[calc(100vh-96px)] max-w-6xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_460px]">
        <section className="hidden lg:block">
          <div className="terminal-panel max-w-2xl p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-gold">Observatorio publico activo</p>
            <h2 className="mt-4 font-display text-xl uppercase tracking-[0.18em] text-paper">El sistema no inicia con el login</h2>
            <div className="mt-8 grid gap-3 font-mono text-[11px] text-zinc-400">
              {[
                'stream.telemetry.public: vivo',
                'node.authorization: pendiente',
                'memory.longitudinal: en espera de identidad',
                'terminal.expansion: bloqueada por credenciales',
              ].map((line) => (
                <div key={line} className="border-l border-gold/20 bg-black/20 px-3 py-2">{line}</div>
              ))}
            </div>
          </div>
        </section>
        {children}
      </div>
    </main>
  )
}
