export default function WorldVectorPage() {
  return (
    <main className="min-h-screen bg-[#060605] px-6 py-10 text-[#d8d2c2]">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="border border-[#2f2a1e] bg-[#0b0b09] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">System Friction Institute</p>
          <h1 className="mt-4 text-4xl font-semibold text-[#f5eedc]">World Vector Observatory</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#9f9788]">
            Superficie de observacion del pulso World Vector. Esta version no ejecuta Supabase durante build; los datos vivos se exponen por rutas API runtime.
          </p>
        </header>

        <section className="grid gap-3 md:grid-cols-4">
          <div className="border border-[#2f2a1e] bg-[#0b0b09] p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8f8878]">Pulse</div>
            <div className="mt-2 text-lg text-[#f5eedc]">runtime</div>
          </div>
          <div className="border border-[#2f2a1e] bg-[#0b0b09] p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8f8878]">Memory</div>
            <div className="mt-2 text-lg text-[#f5eedc]">runtime</div>
          </div>
          <div className="border border-[#2f2a1e] bg-[#0b0b09] p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8f8878]">Agent Mode</div>
            <div className="mt-2 text-lg text-[#f5eedc]">system actor</div>
          </div>
          <div className="border border-[#2f2a1e] bg-[#0b0b09] p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8f8878]">Boundary</div>
            <div className="mt-2 text-lg text-[#f5eedc]">non-root</div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Runtime endpoints</div>
            <div className="mt-5 space-y-3 font-mono text-xs text-[#d8d2c2]">
              <div>GET /api/world-vector/agents/health</div>
              <div>POST /api/world-vector/agents/system-run?job=all&amp;persist=true</div>
            </div>
          </div>

          <div className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Operational rule</div>
            <p className="mt-5 text-sm leading-7 text-[#d8d2c2]">
              Cron puede ejecutar lectura, persistencia y auditoria. La decision de cierre, aprobacion y salida externa permanece fuera de esta superficie.
            </p>
          </div>
        </section>

        <section className="border border-[#2f2a1e] bg-[#0b0b09] p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Next step</div>
          <p className="mt-5 text-sm leading-7 text-[#9f9788]">
            Conectar esta pantalla a un componente cliente que consulte el endpoint de salud en runtime, sin bloquear el build ni prerenderizar llamadas privadas.
          </p>
        </section>
      </div>
    </main>
  );
}
