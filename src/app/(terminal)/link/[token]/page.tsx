'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useNodeStore } from '@/lib/store/nodeStore'

export default function MagicLinkPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const { syncWithToken } = useNodeStore()
  const [status, setStatus] = useState('Verificando token...')

  useEffect(() => {
    const verify = async () => {
      const token = params?.token
      if (!token) {
        setStatus('Token invalido o expirado.')
        return
      }

      const ok = await syncWithToken(token)
      if (ok) {
        setStatus('Nodo sincronizado. Redirigiendo a terminal.')
        router.replace('/terminal')
      } else {
        setStatus('Token invalido o expirado.')
      }
    }
    void verify()
  }, [params, router, syncWithToken])

  return (
    <main className="flex min-h-screen items-center justify-center bg-void p-6">
      <section className="terminal-panel max-w-lg p-8 text-center">
        <Loader2 className="mx-auto mb-5 h-6 w-6 animate-spin text-gold" />
        <h1 className="font-display text-lg uppercase tracking-[0.12em] text-paper">Verificacion de nodo</h1>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">{status}</p>
        {status.includes('invalido') && (
          <Link href="/terminal" className="mt-6 inline-block bg-gold px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-void">
            Crear nuevo nodo
          </Link>
        )}
      </section>
    </main>
  )
}
