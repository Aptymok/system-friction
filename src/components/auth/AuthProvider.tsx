'use client'

import type { Session } from '@supabase/supabase-js'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createBrowserSupabaseClient } from '@/runtime/supabase/client'

export type AuthIdentity = {
  userId: string
  email: string | null
  alias: string | null
  role: string
}

type AuthState = {
  session: Session | null
  status: 'config-missing' | 'hydrating' | 'anonymous' | 'authenticated'
  userRole: string | null
  identity: AuthIdentity | null
}

const AuthContext = createContext<AuthState>({
  session: null,
  status: 'hydrating',
  userRole: null,
  identity: null,
})

const AUTH_ROUTES = new Set(['/login', '/signup', '/forgot', '/reset', '/verify'])
const PRIVATE_ROUTE_PREFIXES = ['/root', '/studio', '/field', '/member', '/interface'] as const

type ServerIdentity = {
  role?: string | null
  isRoot?: boolean
  user?: { id?: string | null; email?: string | null } | null
  profile?: { alias?: string | null; email?: string | null; role?: string | null } | null
}

function fallbackRole(errorCode?: string | null) {
  if (errorCode === 'PGRST116') return 'observer'
  return 'observer'
}

function isRootIdentity(role?: string | null) {
  return role === 'root' || role === 'system'
}

function postAuthPath(role?: string | null) {
  if (isRootIdentity(role)) return '/root'
  if (role === 'operator' || role === 'controller') return '/member'
  return '/field'
}

function isPrivateRoute(pathname: string) {
  return PRIVATE_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function fallbackAlias(session: Session) {
  const metadata = session.user.user_metadata as Record<string, unknown> | undefined
  const candidates = [metadata?.alias, metadata?.display_name, metadata?.full_name, metadata?.name]
  const name = candidates.find((value): value is string => typeof value === 'string' && Boolean(value.trim()))
  if (name) return name.trim()
  const localPart = session.user.email?.split('@')[0]?.trim()
  return localPart || null
}

async function readServerIdentity() {
  const response = await fetch('/api/root/me', { credentials: 'include', cache: 'no-store' })
  if (!response.ok) return null
  const body = await response.json().catch(() => null)
  return body?.ok ? body.data as ServerIdentity : null
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
    identity: null,
  })

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    let active = true

    const fetchIdentity = async (session: Session): Promise<AuthIdentity> => {
      const serverIdentity = await readServerIdentity().catch(() => null)
      if (serverIdentity) {
        const role = serverIdentity.isRoot
          ? 'root'
          : serverIdentity.role || serverIdentity.profile?.role || 'observer'
        return {
          userId: serverIdentity.user?.id || session.user.id,
          email: serverIdentity.profile?.email || serverIdentity.user?.email || session.user.email || null,
          alias: serverIdentity.profile?.alias || fallbackAlias(session),
          role,
        }
      }

      // /api/root/me intentionally rejects non-root accounts. Preserve the authenticated
      // member role through the user's own RLS-scoped profile instead of collapsing every
      // non-root identity to observer.
      const { data, error } = await client
        .from('profiles')
        .select('role,alias,email')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (error && process.env.NODE_ENV !== 'production') {
        console.warn('Profile identity not ready; using authenticated session fallback.', {
          code: error.code,
          message: error.message,
        })
      }

      return {
        userId: session.user.id,
        email: data?.email || session.user.email || null,
        alias: data?.alias || fallbackAlias(session),
        role: data?.role || fallbackRole(error?.code),
      }
    }

    const commitAuthenticatedSession = async (session: Session, options?: { redirectFromAuthRoute?: boolean }) => {
      setState((previous) => {
        const sameUser = previous.session?.user.id === session.user.id
        return {
          session,
          status: 'authenticated',
          userRole: sameUser ? previous.userRole : null,
          identity: sameUser ? previous.identity : null,
        }
      })

      const identity = await fetchIdentity(session).catch(() => ({
        userId: session.user.id,
        email: session.user.email || null,
        alias: fallbackAlias(session),
        role: 'observer',
      }))
      if (!active) return

      setState({
        session,
        status: 'authenticated',
        userRole: identity.role,
        identity,
      })

      const currentPath = pathnameRef.current
      if (options?.redirectFromAuthRoute && AUTH_ROUTES.has(currentPath)) {
        router.replace(postAuthPath(identity.role))
      }
    }

    async function hydrateSession() {
      const { data, error } = await client.auth.getSession().catch(() => ({ data: { session: null }, error: null }))
      if (!active) return

      if (error) {
        setState({ session: null, status: 'anonymous', userRole: null, identity: null })
        return
      }

      if (data.session) {
        await commitAuthenticatedSession(data.session)
        return
      }

      setState({ session: null, status: 'anonymous', userRole: null, identity: null })
    }

    void hydrateSession()

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setState({ session: null, status: 'anonymous', userRole: null, identity: null })
        if (isPrivateRoute(pathnameRef.current)) router.replace('/login')
        return
      }

      if (!session) {
        setState({ session: null, status: 'anonymous', userRole: null, identity: null })
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
