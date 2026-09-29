import Link from 'next/link';
import { SFI_PUBLIC_NAV } from '@/lib/navigation/publicNavigation';
import { PublicNewsletterForm } from './PublicNewsletterForm';

export function SfiPublicHeader({active,global=false}:{active?:string;global?:boolean}) {
  return <header className={global?'sfiPublicTopbar sfiGlobalHeader':'sfiPublicTopbar'} data-sfi-public-chrome="SFI-PUBLIC-CHROME-2.0">
    <Link href="/" className="sfiPublicBrand" aria-label="System Friction Institute home">
      <img src="/library/assets/sfi-mark.svg" alt="" aria-hidden="true"/>
      <span className="sfiPublicBrandText"><strong>SFI</strong><span>SYSTEM FRICTION INSTITUTE</span></span>
    </Link>
    <nav aria-label="Institutional navigation">
      {SFI_PUBLIC_NAV.map((item)=><Link key={item.href} href={item.href} data-active={active===item.href?'true':undefined}>{item.label}</Link>)}
    </nav>
    <Link className="sfiPublicAccess" href="/login">SIGN IN</Link>
  </header>;
}

export function SfiPublicFooter({global=false}:{global?:boolean}){
  return <footer className={global?'sfiPublicFooter sfiGlobalInstitutionalFooter':'sfiPublicFooter'} data-sfi-public-chrome="SFI-PUBLIC-CHROME-2.0">
    <div className="sfiFooterIdentity">
      <Link href="/" aria-label="System Friction Institute home"><img src="/library/assets/sfi-mark.svg" alt="" aria-hidden="true"/></Link>
      <div><b>SYSTEM FRICTION INSTITUTE</b><span>OBSERVE · CONTRAST · RETURN</span><small>Independent institutional research and observability for complex sociotechnical systems.</small></div>
    </div>
    <div className="sfiFooterLinks">
      <div><b>INSTITUTE</b><Link href="/institution">Institution</Link><Link href="/laboratory">Laboratory</Link><Link href="/observatory">Observatory</Link><Link href="/publications">Registry</Link></div>
      <div><b>PUBLIC</b><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link><Link href="/llms.txt">LLM orientation</Link><Link href="/ai-index.json">AI index</Link></div>
    </div>
    <PublicNewsletterForm/>
    <div className="sfiFooterLegal">
      <span>© {new Date().getUTCFullYear()} System Friction Institute.</span>
      <span>Public material remains subject to its stated publication, evidence and licensing conditions.</span>
    </div>
  </footer>;
}
