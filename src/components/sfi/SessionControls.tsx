'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthState } from '@/components/auth/AuthProvider';
import './SessionControls.css';

export function SessionControls({ className = '' }: { className?: string }) {
  const auth = useAuthState();
  const pathname = usePathname();

  if (auth.status === 'hydrating') {
    return <div className={`sessionControls ${className}`.trim()} aria-label="SFI session"><span className="sessionState">SESSION…</span></div>;
  }

  if (auth.status !== 'authenticated') {
    const next = pathname && pathname.startsWith('/') ? pathname : '/observatory';
    return (
      <div className={`sessionControls ${className}`.trim()} aria-label="SFI session">
        <Link className="sessionControl" href={`/login?next=${encodeURIComponent(next)}`}>SIGN IN</Link>
      </div>
    );
  }

  const role = auth.identity?.role?.toLowerCase() || 'observer';
  const homeHref = role === 'root' || role === 'system' ? '/root' : '/observatory';

  return (
    <div className={`sessionControls ${className}`.trim()} aria-label="SFI session controls">
      <Link className="sessionControl" href={homeHref}>HOME</Link>
      <Link className="sessionControl" href="/integrations">INTEGRATIONS</Link>
      <form action="/logout" method="post">
        <button className="sessionControl sessionLogout" type="submit">LOG OUT</button>
      </form>
    </div>
  );
}
