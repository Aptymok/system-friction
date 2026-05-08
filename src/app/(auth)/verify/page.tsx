import Link from 'next/link'

export default function VerifyPage() {
  return (
    <section className="terminal-panel mx-auto max-w-md p-8 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-gold">Verificacion email</p>
      <h1 className="mt-3 font-display text-lg uppercase tracking-[0.12em] text-paper">Nodo en espera</h1>
      <p className="mt-4 font-serif text-base italic leading-relaxed text-zinc-500">
        Revisa el correo. La sesion queda activa cuando el enlace confirma identidad.
      </p>
      <Link href="/login" className="mt-7 inline-block bg-gold px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-void">
        Volver a login
      </Link>
    </section>
  )
}
