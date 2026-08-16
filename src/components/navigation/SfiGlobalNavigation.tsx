'use client';

import { usePathname } from 'next/navigation';
import { SfiSessionIdentity } from './SfiSessionIdentity';
import './sfi-global-navigation.css';

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function SfiGlobalNavigation() {
  const pathname = usePathname();
  const isRoot = matchesPrefix(pathname, '/root');

  // The global experiential membrane now owns cross-surface routing.
  // ROOT retains only its sovereign identity rail; it is not flattened into public navigation.
  if (!isRoot) return null;

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
