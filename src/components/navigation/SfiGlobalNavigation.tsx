'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './sfi-global-navigation.css';

const GLOBAL_DESTINATIONS = [
  { href: '/interface', label: 'FIELD', match: ['/interface', '/field'] },
  { href: '/studio', label: 'STUDIO', match: ['/studio'] },
  { href: '/observatory', label: 'OBSERVATORY', match: ['/observatory'] },
  { href: '/library', label: 'LIBRARY', match: ['/library'] },
] as const;

function isActive(pathname: string, prefixes: readonly string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function SfiGlobalNavigation() {
  const pathname = usePathname();
  const hidden = pathname === '/' || pathname.startsWith('/root') || pathname.startsWith('/login');

  if (hidden) return null;

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
      </nav>
    </div>
  );
}
