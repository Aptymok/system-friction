'use client'

import type { Session } from '@supabase/supabase-js'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { createBrowserSupabaseClient } from '@/runtime/supabase/client'

type AuthState = {
  session: Session | null
  status: 'config-missing' | 'hydrating' | 'anonymous' | 'authenticated'
  userRole: string | null
}

const AuthContext = createContext<AuthState>({
  session: null,
  status: 'hydrating',
  userRole: null,
})

const AUTH_ROUTES = new Set(['/login', '/register', '/forgot', '/reset', '/verify'])

function fallbackRole(errorCode?: string | null) {
  if (errorCode === 'PGRST116') return 'observer'
  return 'observer'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const [state, setState] = useState<AuthState>({
    session: null,
    status: supabase ? 'hydrating' : 'config-missing',
    userRole: null,
  })

  useEffect(() => {
    if (!supabase) return
    let active = true

    const fetchUserRole = async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Profile role unavailable; falling back to observer.', {
            code: error.code,
            message: error.message,
          })
        }
        return fallbackRole(error.code)
      }

      return data?.role || 'observer'
    }

    supabase.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (!active) return
        if (error) {
          await supabase.auth.signOut()
          setState({ session: null, status: 'anonymous', userRole: null })
          router.refresh()
          return
        }
        let role = null
        if (data.session) {
          role = await fetchUserRole(data.session.user.id)
        }
        setState({
          session: data.session,
          status: data.session ? 'authenticated' : 'anonymous',
          userRole: role,
        })
      })
      .catch(async () => {
        if (!active) return
        await supabase.auth.signOut()
        setState({ session: null, status: 'anonymous', userRole: null })
        router.refresh()
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      let role = null
      if (session) {
        role = await fetchUserRole(session.user.id)
      }
      setState({
        session,
        status: session ? 'authenticated' : 'anonymous',
        userRole: role,
      })

      if (event === 'SIGNED_IN') {
        router.refresh()
        if (AUTH_ROUTES.has(pathname)) router.replace('/terminal')
      }

      if (event === 'SIGNED_OUT') {
        setState({ session: null, status: 'anonymous', userRole: null })
        router.refresh()
        if (pathname.startsWith('/root') || pathname.startsWith('/user')) router.replace('/login')
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
