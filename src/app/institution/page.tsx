import Link from 'next/link';
import { SFI_PUBLIC_PROFILE } from '@/lib/public/institutionProfile';

export const dynamic = 'force-dynamic';

export default function InstitutionPage() {
  const p = SFI_PUBLIC_PROFILE;
  return (
    <main style={{minHeight:'100vh',background:'#070705',color:'#d8c6a0',padding:'48px 28px 84px',fontFamily:'Georgia, serif'}}>
      <div style={{maxWidth:1180,margin:'0 auto'}}>
        <header style={{display:'flex',justifyContent:'space-between',gap:24,borderBottom:'1px solid rgba(202,160,92,.28)',paddingBottom:30}}>
          <div>
            <small style={{letterSpacing:'.28em',color:'#b78d50'}}>SYSTEM FRICTION INSTITUTE · CANONICAL PUBLIC PROFILE</small>
            <h1 style={{fontSize:'clamp(44px,7vw,94px)',fontWeight:400,letterSpacing:'-.035em',margin:'14px 0 8px',color:'#e7cf9c'}}>SYSTEM FRICTION INSTITUTE</h1>
            <p style={{maxWidth:850,fontSize:19,lineHeight:1.7,color:'#b9aa8e'}}>{p.institution.operationalDefinition}</p>
          </div>
          <Link href="/" style={{color:'#d5ad69',textDecoration:'none',letterSpacing:'.15em',fontSize:12}}>← FIELD</Link>
        </header>

        <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:16,marginTop:32}}>
          <div style={{border:'1px solid rgba(202,160,92,.22)',padding:20}}><small style={{color:'#a78350',letterSpacing:'.18em'}}>DEFINITION</small><p style={{lineHeight:1.65}}>{p.institution.primaryDefinition}</p></div>
          <div style={{border:'1px solid rgba(202,160,92,.22)',padding:20}}><small style={{color:'#a78350',letterSpacing:'.18em'}}>OPERATING PRINCIPLE</small><p style={{lineHeight:1.65}}>{p.operatingPrinciple}</p></div>
          <div style={{border:'1px solid rgba(202,160,92,.22)',padding:20}}><small style={{color:'#a78350',letterSpacing:'.18em'}}>CANONICAL QUESTION</small><p style={{lineHeight:1.65}}>{p.institution.canonicalQuestion}</p></div>
        </section>

        <section style={{marginTop:50}}><small style={{letterSpacing:'.22em',color:'#b78d50'}}>INSTRUMENTS</small><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:14,marginTop:16}}>{p.instruments.map(i=><article key={i.key} style={{borderTop:'1px solid rgba(202,160,92,.28)',padding:'18px 0 8px'}}><h2 style={{fontWeight:400,color:'#e0c58f',margin:'0 0 8px'}}>{i.key}</h2><small style={{color:'#9f845b'}}>{i.name}</small><p style={{lineHeight:1.65,color:'#baac92'}}>{i.role}</p></article>)}</div></section>

        <section style={{marginTop:52}}><small style={{letterSpacing:'.22em',color:'#b78d50'}}>OPERATING LIFECYCLE</small><div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:16}}>{p.lifecycle.map((x,i)=><span key={x} style={{border:'1px solid rgba(202,160,92,.22)',padding:'10px 12px',fontFamily:'ui-monospace, monospace',fontSize:11,color:'#c5aa79'}}>{String(i+1).padStart(2,'0')} · {x}</span>)}</div></section>

        <section style={{marginTop:52,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:28}}>
          <div><small style={{letterSpacing:'.22em',color:'#b78d50'}}>EPISTEMIC INVARIANTS</small>{p.invariants.map(x=><p key={x} style={{borderBottom:'1px solid rgba(202,160,92,.14)',paddingBottom:10,lineHeight:1.6,color:'#b9aa8e'}}>{x}</p>)}</div>
          <div><small style={{letterSpacing:'.22em',color:'#b78d50'}}>AI-NATIVE ACCESS</small><p style={{lineHeight:1.7,color:'#b9aa8e'}}>Discovery: <code>{p.externalAi.discovery}</code><br/>Console: <code>{p.externalAi.console}</code><br/>Auth: {p.externalAi.authentication}</p><p style={{lineHeight:1.7,color:'#b9aa8e'}}>{p.externalAi.governance}</p></div>
        </section>

        <section style={{marginTop:52}}><small style={{letterSpacing:'.22em',color:'#b78d50'}}>PUBLIC SURFACES</small><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:10,marginTop:16}}>{p.publicSurfaces.map(s=><Link key={s.path} href={s.path} style={{display:'block',border:'1px solid rgba(202,160,92,.18)',padding:14,color:'#cfa15d',textDecoration:'none'}}><code>{s.path}</code><span style={{display:'block',marginTop:7,color:'#95866e',fontFamily:'Georgia, serif',fontSize:14}}>{s.role}</span></Link>)}</div></section>

        <footer style={{marginTop:58,borderTop:'1px solid rgba(202,160,92,.2)',paddingTop:24,display:'flex',gap:18,flexWrap:'wrap',justifyContent:'space-between'}}><Link href="/history" style={{color:'#cfa15d',textDecoration:'none'}}>ORIGIN → PRESENT</Link><a href="/api/public/institution" style={{color:'#cfa15d',textDecoration:'none'}}>MACHINE-READABLE PROFILE →</a></footer>
      </div>
    </main>
  );
}
