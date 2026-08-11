'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthState } from '@/components/auth/AuthProvider';
import { SfiSessionIdentity } from './SfiSessionIdentity';
import './sfi-global-navigation.css';

const GLOBAL_DESTINATIONS = [
  { href: '/interface', label: 'FIELD', match: ['/interface', '/field'] },
  { href: '/studio', label: 'STUDIO', match: ['/studio'] },
  { href: '/observatory', label: 'OBSERVATORY', match: ['/observatory'] },
  { href: '/library', label: 'LIBRARY', match: ['/library'] },
] as const;

const PRIVATE_SURFACES = ['/member', '/interface', '/field', '/studio'] as const;
const AUTH_SURFACES = ['/login', '/signup', '/forgot', '/reset', '/verify'] as const;

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isActive(pathname: string, prefixes: readonly string[]) {
  return prefixes.some((prefix) => matchesPrefix(pathname, prefix));
}

export function SfiGlobalNavigation() {
  const pathname = usePathname();
  const { status } = useAuthState();
  const isRoot = matchesPrefix(pathname, '/root');
  const isObservatory = matchesPrefix(pathname, '/observatory');
  const isPrivateSurface = PRIVATE_SURFACES.some((prefix) => matchesPrefix(pathname, prefix));
  const isAuthSurface = AUTH_SURFACES.some((prefix) => matchesPrefix(pathname, prefix));

  if (isRoot) {
    return (
      <div className="sgn-root-anchor">
        <div className="sgn-root-bar">
          <span>SFI · SESIÓN PRIVADA</span>
          <span className="sgn-root-state">IDENTIDAD PERSISTENTE</span>
          <SfiSessionIdentity variant="root" />
        </div>
      </div>
    );
  }

  // Observatory owns its complete public instrument header. Do not stack a second global bar over it.
  if (pathname === '/' || isAuthSurface || isObservatory) return null;

  return (
    <div className="sgn-anchor">
      <nav className="sgn-bar" aria-label="Navegación global de System Friction Institute">
        <Link className="sgn-mark" href="/interface" aria-label="System Friction Institute">
          <span>SFI</span>
        </Link>
        <div className="sgn-destinations">
          {GLOBAL_DESTINATIONS.map((destination) => {
            const active = isActive(pathname, destination.match);
            return (
              <Link
                key={destination.href}
                href={destination.href}
                className={active ? 'is-active' : undefined}
                aria-current={active ? 'page' : undefined}
              >
                {destination.label}
              </Link>
            );
          })}
        </div>
        <span className="sgn-layer">{pathname.split('/').filter(Boolean).slice(0, 2).join(' / ') || 'SFI'}</span>
        {isPrivateSurface && status === 'authenticated' ? <SfiSessionIdentity /> : null}
      </nav>
    </div>
  );
}
