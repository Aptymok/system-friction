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

function isRootEmail(email?: string | null) {
  return email?.toLowerCase() === 'aptymok@gmail.com'
}

function isRootIdentity(role?: string | null, email?: string | null) {
  return role === 'root' || role === 'system' || isRootEmail(email)
}

function postAuthPath(role?: string | null, email?: string | null) {
  return isRootIdentity(role, email) ? '/root' : '/user'
}

function roleWithRootEmailFallback(role: string | null, email?: string | null) {
  if (isRootEmail(email)) return 'root'
  return role
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
    const client = supabase
    let active = true

    const fetchUserRole = async (userId: string, email?: string | null) => {
      if (isRootEmail(email)) return 'root'

      const { data, error } = await client
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

      return roleWithRootEmailFallback(data?.role || 'observer', email)
    }

    async function hydrateSession() {
      try {
        const { data, error } = await client.auth.getSession()
        if (!active) return
        if (error) {
          await client.auth.signOut()
          setState({ session: null, status: 'anonymous', userRole: null })
          router.refresh()
          return
        }
        let role = null
        if (data.session) role = await fetchUserRole(data.session.user.id, data.session.user.email)
        if (!active) return
        setState({
          session: data.session,
          status: data.session ? 'authenticated' : 'anonymous',
          userRole: role,
        })
      } catch {
        if (!active) return
        await client.auth.signOut()
        setState({ session: null, status: 'anonymous', userRole: null })
        router.refresh()
      }
    }

    void hydrateSession()

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      const immediateRole = session && isRootEmail(session.user.email) ? 'root' : session ? 'observer' : null
      setState({
        session,
        status: session ? 'authenticated' : 'anonymous',
        userRole: immediateRole,
      })

      globalThis.setTimeout(() => {
        if (!active) return
        if (event === 'SIGNED_IN' && session) {
          void fetchUserRole(session.user.id, session.user.email).then((role) => {
            if (!active) return
            setState({ session, status: 'authenticated', userRole: role })
            router.refresh()
            if (AUTH_ROUTES.has(pathname)) router.replace(postAuthPath(role, session.user.email))
          })
          return
        }

        if (event === 'SIGNED_OUT') {
          setState({ session: null, status: 'anonymous', userRole: null })
          router.refresh()
          if (pathname.startsWith('/root') || pathname.startsWith('/user')) router.replace('/login')
        }
      }, 0)
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
