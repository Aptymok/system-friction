import Link from 'next/link';

export function SfiPublicHeader({global=false}:{active?:string;global?:boolean}) {
  return <header className={global?'sfiPublicTopbar sfiGlobalHeader':'sfiPublicTopbar'} data-sfi-public-chrome="SFI-NYC-CHROME-1.0">
    <Link href="/" className="sfiPublicBrand" aria-label="System Friction Institute home">
      <img src="/library/assets/sfi-mark.svg" alt="" aria-hidden="true"/>
      <span className="sfiPublicBrandText"><strong>SFI</strong><span>SYSTEM FRICTION INSTITUTE</span></span>
    </Link>
    <div className="sfiPublicEvent">NEW YORK · AI WEEK 2026</div>
    <div className="sfiPublicChromeRight">
      <span>OCT 08 · 19:00 ET</span>
      <Link className="sfiPublicAccess" href="/login">ACCESS</Link>
    </div>
  </header>;
}

export function SfiPublicFooter({global=false}:{global?:boolean}){
  return <footer className={global?'sfiPublicFooter sfiGlobalInstitutionalFooter':'sfiPublicFooter'} data-sfi-public-chrome="SFI-NYC-CHROME-1.0">
    <span>SYSTEM FRICTION INSTITUTE</span>
    <b>EVIDENCE · AUTHORITY · RETURN</b>
    <span>AFTER AI GOVERNANCE · NEW YORK · 2026</span>
    <span className="sfiFooterPolicy"><Link href="/privacy">PRIVACY</Link><Link href="/terms">TERMS</Link></span>
  </footer>;
}
