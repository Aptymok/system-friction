'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthState } from '@/components/auth/AuthProvider';
import { useSfiLanguage } from '@/components/i18n/SfiLanguageProvider';
import './SessionControls.css';

export function SessionControls({ className = '' }: { className?: string }) {
  const auth = useAuthState();
  const pathname = usePathname();
  const { text } = useSfiLanguage();

  if (auth.status === 'hydrating') {
    return <div className={`sessionControls ${className}`.trim()} aria-label={text('Sesión SFI', 'SFI session')}><span className="sessionState">{text('SESIÓN…', 'SESSION…')}</span></div>;
  }

  if (auth.status !== 'authenticated') {
    const next = pathname && pathname.startsWith('/') ? pathname : '/field';
    return (
      <div className={`sessionControls ${className}`.trim()} aria-label={text('Sesión SFI', 'SFI session')}>
        <Link className="sessionControl" href={`/login?next=${encodeURIComponent(next)}`}>{text('INICIAR SESIÓN', 'SIGN IN')}</Link>
      </div>
    );
  }

  const role = auth.identity?.role?.toLowerCase() || 'observer';
  const homeHref = role === 'root' || role === 'system' ? '/root' : '/field';

  return (
    <div className={`sessionControls ${className}`.trim()} aria-label={text('Controles de sesión SFI', 'SFI session controls')}>
      <Link className="sessionControl" href={homeHref}>{text('INICIO', 'HOME')}</Link>
      <Link className="sessionControl" href="/integrations">{text('INTEGRACIONES', 'INTEGRATIONS')}</Link>
      <form action="/logout" method="post">
        <button className="sessionControl sessionLogout" type="submit">{text('CERRAR SESIÓN', 'LOG OUT')}</button>
      </form>
    </div>
  );
}
