// src/components/providers/AuthProvider.tsx
'use client';

import type { Session } from '@supabase/supabase-js';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type AuthState = {
  session: Session | null;
  status: 'config-missing' | 'hydrating' | 'anonymous' | 'authenticated';
  userRole?: string;
};

const AuthContext = createContext<AuthState>({
  session: null,
  status: 'hydrating',
});

const AUTH_ROUTES = new Set(['/login', '/register', '/forgot', '/reset', '/verify']);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [state, setState] = useState<AuthState>({
    session: null,
    status: supabase ? 'hydrating' : 'config-missing',
  });

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    const getUserRole = async (userId: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', userId)
        .single();
      return data?.role || 'observer';
    };

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      let role = 'observer';
      if (data.session) {
        role = await getUserRole(data.session.user.id);
      }
      setState({
        session: data.session,
        status: data.session ? 'authenticated' : 'anonymous',
        userRole: role,
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      let role = 'observer';
      if (session) {
        role = await getUserRole(session.user.id);
      }
      setState({
        session,
        status: session ? 'authenticated' : 'anonymous',
        userRole: role,
      });

      if (event === 'SIGNED_IN') {
        router.refresh();
        if (AUTH_ROUTES.has(pathname)) router.replace('/');
      }

      if (event === 'SIGNED_OUT') {
        router.refresh();
        if (pathname.startsWith('/user') || pathname.startsWith('/root'))
          router.replace('/login');
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [pathname, router, supabase]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuthState() {
  return useContext(AuthContext);
}
