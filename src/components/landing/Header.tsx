import Link from 'next/link'

export function Header() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-gold/10 bg-[#151311]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        
        <Link href="/" className="flex items-center gap-4 group">
          <div className="flex h-9 w-9 items-center justify-center border border-gold/30 bg-gold/5 text-gold transition-all group-hover:border-gold group-hover:bg-gold/10">
            <span className="text-xs">◈</span>
          </div>
          <div className="hidden sm:block">
            <p className="font-display text-[11px] uppercase tracking-[0.25em] text-paper">
              System Friction Institute
            </p>
            <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-gold/50">
              Core_v2.0 // Node: Active
            </p>
          </div>
        </Link>

        <nav className="flex items-center gap-8 font-mono text-[10px] uppercase tracking-[0.2em]">
          <Link href="/terminal" className="text-zinc-500 transition hover:text-gold">
            Terminal
          </Link>
          <Link href="/casos" className="text-zinc-500 transition hover:text-gold">
            Casos
          </Link>
          <Link 
            href="/login" 
            className="border border-gold/20 px-4 py-2 text-gold transition hover:bg-gold hover:text-void"
          >
            Acceso
          </Link>
        </nav>

      </div>
    </header>
  )
}