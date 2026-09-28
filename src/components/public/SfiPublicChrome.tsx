import Link from 'next/link';
import { SFI_PUBLIC_NAV } from '@/lib/navigation/publicNavigation';

export function SfiPublicHeader({active}:{active?:string}) {
  return <header className="sfiPublicTopbar" data-sfi-public-chrome="SFI-PUBLIC-CHROME-1.0">
    <Link href="/" className="sfiPublicBrand" aria-label="System Friction Institute home">
      <strong>SFI</strong><span>SYSTEM FRICTION INSTITUTE</span>
    </Link>
    <nav aria-label="Public navigation">
      {SFI_PUBLIC_NAV.map((item)=><Link key={item.href} href={item.href} data-active={active===item.href?'true':undefined}>{item.label}</Link>)}
    </nav>
    <Link className="sfiPublicAccess" href="/login">ACCESS</Link>
  </header>;
}

export function SfiPublicFooter(){
  return <footer className="sfiPublicFooter" data-sfi-public-chrome="SFI-PUBLIC-CHROME-1.0">
    <b>SYSTEM FRICTION INSTITUTE</b>
    <span>OBSERVE · CONTRAST · RETURN</span>
  </footer>;
}
