export function Footer() {
  return (
    <footer className="relative border-t border-gold/10 bg-[#151311] px-6 py-20 text-paper overflow-hidden">
      {/* Grid de fondo */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(#F5F2ED 1px, transparent 1px), linear-gradient(90deg, #F5F2ED 1px, transparent 1px)',
          backgroundSize: '72px 72px'
        }}
      />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-16 lg:grid-cols-[1fr_auto]">
          
          {/* COLUMNA IZQUIERDA: IDENTIDAD */}
          <div className="space-y-12">
            <div className="flex items-start gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-gold/20 bg-black/40">
                <span className="text-lg text-gold">◈</span>
              </div>
              <div>
                <h3 className="font-display text-xl uppercase tracking-[0.15em] text-paper">
                  System Friction Institute
                </h3>
                <p className="mt-2 max-w-md font-serif text-sm italic leading-relaxed text-zinc-500">
                  Infraestructura longitudinal de observación operacional. 
                  Auditamos la latencia entre intención y ejecución mediante 
                  acumulación de casos y memoria activa.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-10">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-gold mb-3">
                  [ SISTEMA_DE_CONTACTO ]
                </p>
                <a
                  href="mailto:aptymok@gmail.com"
                  className="font-mono text-xs text-zinc-300 transition hover:text-gold"
                >
                  VAR mailto = "aptymok@gmail.com"
                </a>
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-gold mb-3">
                  [ LOCALIZACIÓN_NODO ]
                </p>
                <p className="font-mono text-xs text-zinc-500">
                  LAT: 21.8853 // LONG: -102.2916
                </p>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: ÍNDICE TÉCNICO */}
          <div className="grid grid-cols-2 gap-12 sm:gap-24">
            
            <div className="space-y-6">
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-gold/40">Navegación</p>
              <ul className="flex flex-col gap-4 font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500">
                <li><a href="/terminal" className="hover:text-gold transition-colors">Terminal_v2</a></li>
                <li><a href="https://systemfrictionv1.netlify.app/" className="hover:text-gold transition-colors opacity-50 italic text-[9px]">Legacy_v1</a></li>
                <li><a href="/casos" className="hover:text-gold transition-colors">Casos_Activos</a></li>
                <li><a href="/changelog" className="hover:text-gold transition-colors">Update_Logs</a></li>
              </ul>
            </div>

            <div className="space-y-6">
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-gold/40">Protocolo</p>
              <ul className="flex flex-col gap-4 font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500">
                <li><a href="/manifiesto" className="hover:text-gold transition-colors">Manifiesto</a></li>
                <li><a href="/licencias" className="hover:text-gold transition-colors">Licencias</a></li>
                <li><a href="https://github.com/aptymok/system-friction" target="_blank" className="hover:text-gold transition-colors">Source_Repo</a></li>
                <li>
                  <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" className="text-gold/60 hover:text-gold transition-colors italic border-b border-gold/10">
                    CC BY 4.0
                  </a>
                </li>
              </ul>
            </div>

          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="mt-20 pt-8 border-t border-gold/5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-700">
            © 2026 Juan Antonio Marín Liera // System Friction Institute
          </p>
          <div className="h-[1px] flex-grow bg-gold/5 mx-6 hidden sm:block"></div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-700">
            Resolución Mínima Verificable: v2.0.42
          </p>
        </div>
      </div>
    </footer>
  )
}