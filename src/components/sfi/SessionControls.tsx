'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthState } from '@/components/auth/AuthProvider';
import './SessionControls.css';

export function SessionControls({ className = '' }: { className?: string }) {
  const auth = useAuthState();
  const pathname = usePathname();

  if (auth.status === 'hydrating') {
    return <div className={`sessionControls ${className}`.trim()} aria-label="Sesión SFI"><span className="sessionState">SESIÓN…</span></div>;
  }

  if (auth.status !== 'authenticated') {
    const next = pathname && pathname.startsWith('/') ? pathname : '/field';
    return (
      <div className={`sessionControls ${className}`.trim()} aria-label="Sesión SFI">
        <Link className="sessionControl" href={`/login?next=${encodeURIComponent(next)}`}>INICIAR SESIÓN</Link>
      </div>
    );
  }

  const role = auth.identity?.role?.toLowerCase() || 'observer';
  const homeHref = role === 'root' || role === 'system' ? '/root' : '/field';

  return (
    <div className={`sessionControls ${className}`.trim()} aria-label="Controles de sesión SFI">
      <Link className="sessionControl" href={homeHref}>INICIO</Link>
      <form action="/logout" method="post">
        <button className="sessionControl sessionLogout" type="submit">CERRAR SESIÓN</button>
      </form>
    </div>
  );
}
