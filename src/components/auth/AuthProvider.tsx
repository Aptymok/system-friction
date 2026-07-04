'use client'

import type { Session } from '@supabase/supabase-js'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
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

const AUTH_ROUTES = new Set(['/login', '/signup', '/forgot', '/reset', '/verify'])

function fallbackRole(errorCode?: string | null) {
  if (errorCode === 'PGRST116') return 'observer'
  return 'observer'
}

function isRootIdentity(role?: string | null) {
  return role === 'root' || role === 'system'
}

function postAuthPath(role?: string | null) {
  return isRootIdentity(role) ? '/root' : '/field'
}

async function readServerIdentity() {
  const response = await fetch('/api/root/me', { credentials: 'include', cache: 'no-store' })
  if (!response.ok) return null
  const body = await response.json().catch(() => null)
  return body?.ok ? body.data as { role?: string | null; isRoot?: boolean } : null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const [state, setState] = useState<AuthState>({
    session: null,
    status: supabase ? 'hydrating' : 'config-missing',
    userRole: null,
  })

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    let active = true

    const fetchUserRole = async (userId: string) => {
      const identity = await readServerIdentity().catch(() => null)
      if (identity?.isRoot) return 'root'
      if (identity?.role) return identity.role

      const { data, error } = await client
        .from('profiles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Profile role not_ready; falling back to observer.', {
            code: error.code,
            message: error.message,
          })
        }
        return fallbackRole(error.code)
      }

      return data?.role || 'observer'
    }

    const commitAuthenticatedSession = async (session: Session, options?: { redirectFromAuthRoute?: boolean }) => {
      setState((previous) => ({
        session,
        status: 'authenticated',
        userRole: previous.session?.user.id === session.user.id ? previous.userRole : null,
      }))

      const role = await fetchUserRole(session.user.id).catch(() => null)
      if (!active) return

      setState({
        session,
        status: 'authenticated',
        userRole: role || 'observer',
      })

      const currentPath = pathnameRef.current
      if (options?.redirectFromAuthRoute && AUTH_ROUTES.has(currentPath)) {
        router.replace(postAuthPath(role))
      }
    }

    async function hydrateSession() {
      const { data, error } = await client.auth.getSession().catch(() => ({ data: { session: null }, error: null }))
      if (!active) return

      if (error) {
        setState({ session: null, status: 'anonymous', userRole: null })
        return
      }

      if (data.session) {
        await commitAuthenticatedSession(data.session)
        return
      }

      setState({ session: null, status: 'anonymous', userRole: null })
    }

    void hydrateSession()

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setState({ session: null, status: 'anonymous', userRole: null })
        const currentPath = pathnameRef.current
        if (currentPath.startsWith('/root') || currentPath.startsWith('/studio')) router.replace('/login')
        return
      }

      if (!session) {
        setState({ session: null, status: 'anonymous', userRole: null })
        return
      }

      globalThis.setTimeout(() => {
        if (!active) return
        void commitAuthenticatedSession(session, { redirectFromAuthRoute: event === 'SIGNED_IN' })
      }, 0)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [router, supabase])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuthState() {
  return useContext(AuthContext)
}
