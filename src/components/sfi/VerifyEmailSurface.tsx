'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/runtime/supabase/client';

export function VerifyEmailSurface({ next, state, error }: {
  next: string; state?: string; error?: string;
}) {
  const [notice, setNotice] = useState(
    state === 'pending' ? 'Check your email and open the confirmation link.' : 'Verifying your email…'
  );
  useEffect(() => {
    const sb = createBrowserSupabaseClient();
    if (!sb) { setNotice('The verification provider is unavailable.'); return; }
    const query = new URLSearchParams(window.location.search);
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const code = query.get('code');
    const accessToken = fragment.get('access_token');
    const refreshToken = fragment.get('refresh_token');
    const hasCallback = Boolean(code || (accessToken && refreshToken));
    if (!hasCallback) return;
    let active = true;
    void (async () => {
      try {
        const existing = await sb.auth.getSession();
        let session = existing.data.session;
        if (accessToken && refreshToken && session?.access_token !== accessToken) {
          const result = await sb.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          session = result.data.session;
        } else if (code && !session) {
          const exchanged = await sb.auth.exchangeCodeForSession(code);
          session = exchanged.data.session;
        }
        window.history.replaceState(window.history.state, '', '/verify');
        if (!active) return;
        if (!session || !session.user.email_confirmed_at) {
          setNotice('The verification link is invalid or expired. Request another confirmation link.');
          return;
        }
        window.location.replace(next);
      } catch {
        if (active) setNotice('The verification link could not be completed. Please sign in or request another link.');
      }
    })();
    return () => { active = false; };
  }, [next]);

  return (
    <main className="login"><section>
      <div className="sigil">SFI.</div>
      <h1>Verify your email</h1>
      <p className="loginLead" role="status">{error ? 'The verification link was rejected.' : notice}</p>
      <div className="loginSupport">
        <a href="/login">Sign in</a>
        <a href="/signup">Create an account</a>
      </div>
    </section></main>
  );
}
