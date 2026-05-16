'use client'

import type { Session } from '@supabase/supabase-js'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

type AuthState = {
  session: Session | null
  status: 'config-missing' | 'hydrating' | 'anonymous' | 'authenticated'
}

const AuthContext = createContext<AuthState>({
  session: null,
  status: 'hydrating',
})

const AUTH_ROUTES = new Set(['/login', '/register', '/forgot', '/reset', '/verify'])

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const [state, setState] = useState<AuthState>({
    session: null,
    status: supabase ? 'hydrating' : 'config-missing',
  })

  useEffect(() => {
    if (!supabase) return
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setState({
        session: data.session,
        status: data.session ? 'authenticated' : 'anonymous',
      })
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setState({
        session,
        status: session ? 'authenticated' : 'anonymous',
      })

      if (event === 'SIGNED_IN') {
        router.refresh()
        if (AUTH_ROUTES.has(pathname)) router.replace('/')
      }

      if (event === 'SIGNED_OUT') {
        router.refresh()
        if (pathname.startsWith('/terminal')) router.replace('/login')
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [pathname, router, supabase])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuthState() {
  return useContext(AuthContext)
}
