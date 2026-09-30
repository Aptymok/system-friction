import Link from 'next/link';
import './SfiPublicChrome.css';

const PUBLIC_MODULES = [
  {label:'NEW YORK 2026',href:'/#time'},
  {label:'OBSERVATORY',href:'/#observation'},
  {label:'REGISTRY',href:'/#authority'},
  {label:'METHOD LAB',href:'/method-lab'},
  {label:'ACCESS',href:'/login'},
  {label:'INTEGRATION',href:'/integrations'},
  {label:'CASES',href:'/cases'},
  {label:'FIELD EVENTS',href:'/#after-ai-governance'},
] as const;

export function SfiPublicHeader({global=false}:{active?:string;global?:boolean}) {
  return <header className={global?'sfiPublicTopbar sfiGlobalHeader':'sfiPublicTopbar'} data-sfi-public-chrome="SFI-NYC-CHROME-2.0">
    <Link href="/#intro" className="sfiPublicBrand" aria-label="System Friction Institute home">
      <img src="/sfi/brand/sfi-institutional-seal.png" alt="" aria-hidden="true"/>
      <span className="sfiPublicBrandText"><strong>SFI</strong><i aria-hidden="true">|</i><span>SYSTEM FRICTION INSTITUTE</span></span>
    </Link>
    <nav className="sfiPublicModuleRail" aria-label="Public SFI modules">
      {PUBLIC_MODULES.map(item=><Link key={item.label} href={item.href}>{item.label}</Link>)}
    </nav>
    <div className="sfiPublicChromeRight">
      <span>OCT 08 · 19:00 ET</span>
      <Link className="sfiPublicAccess" href="/login">SIGN IN</Link>
    </div>
  </header>;
}

export function SfiPublicFooter({global=false}:{global?:boolean}){
  return <footer className={global?'sfiPublicFooter sfiGlobalInstitutionalFooter':'sfiPublicFooter'} data-sfi-public-chrome="SFI-NYC-CHROME-2.0">
    <span>SYSTEM FRICTION INSTITUTE</span>
    <b>EVIDENCE · AUTHORITY · RETURN</b>
    <span>AI WEEK NEW YORK · OCT 08 · 19:00 ET</span>
    <span className="sfiFooterPolicy"><Link href="/privacy">PRIVACY</Link><Link href="/terms">TERMS</Link></span>
  </footer>;
}
