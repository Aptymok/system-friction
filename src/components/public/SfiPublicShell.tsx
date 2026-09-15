import Link from 'next/link';
import type { ReactNode } from 'react';
import './SfiPublicShell.css';

const PUBLIC_NAV = [
  { href: '/observatory', label: 'OBSERVATORY' },
  { href: '/publications', label: 'PUBLICATIONS' },
  { href: '/library', label: 'LIBRARY' },
  { href: '/field', label: 'FIELD' },
  { href: '/institution', label: 'INSTITUTE' },
] as const;

export function SfiPublicShell({
  children,
  active,
}: {
  children: ReactNode;
  active?: string;
}) {
  return <div className="sfiPublicShell">
    <header className="sfiPublicHeader">
      <Link href="/" className="sfiPublicBrand" aria-label="System Friction Institute home">
        <span className="sfiPublicMark" aria-hidden="true">◇</span>
        <strong>SFI</strong>
        <small>SYSTEM FRICTION INSTITUTE</small>
      </Link>
      <nav aria-label="SFI public navigation">
        {PUBLIC_NAV.map((item) => <Link key={item.href} href={item.href} data-active={active === item.label ? 'true' : 'false'}>{item.label}</Link>)}
      </nav>
      <Link href="/login" className="sfiPublicSignIn">SIGN IN</Link>
    </header>
    {children}
    <footer className="sfiPublicFooter">
      <div><strong>SFI</strong><span>SYSTEM FRICTION INSTITUTE</span></div>
      <nav aria-label="SFI footer navigation"><Link href="/institution">INSTITUTE</Link><Link href="/privacy">PRIVACY</Link><Link href="/publications">PUBLICATIONS</Link><Link href="/library">LIBRARY</Link></nav>
      <span>UN MUNDO MÁS COHERENTE.</span>
    </footer>
  </div>;
}
