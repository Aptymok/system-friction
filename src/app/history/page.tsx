import Link from 'next/link';
import { SFI_HISTORY_BOUNDARY, SFI_INSTITUTION_HISTORY } from '@/lib/public/institutionHistory';

export const dynamic = 'force-dynamic';

export default function HistoryPage() {
  return (
    <main style={{minHeight:'100vh',background:'#070705',color:'#d8c6a0',padding:'48px 28px 80px',fontFamily:'Georgia, serif'}}>
      <div style={{maxWidth:1180,margin:'0 auto'}}>
        <header style={{display:'flex',justifyContent:'space-between',gap:24,alignItems:'flex-start',borderBottom:'1px solid rgba(202,160,92,.28)',paddingBottom:28}}>
          <div>
            <small style={{letterSpacing:'.28em',color:'#b78d50'}}>SYSTEM FRICTION INSTITUTE · OBSERVED HISTORY</small>
            <h1 style={{fontSize:'clamp(42px,7vw,92px)',fontWeight:400,letterSpacing:'-.03em',margin:'14px 0 10px',color:'#e7cf9c'}}>ORIGIN → PRESENT</h1>
            <p style={{maxWidth:760,fontSize:18,lineHeight:1.7,color:'#b9aa8e'}}>Una línea temporal institucional compuesta únicamente por hitos verificables en fuentes públicas del propio SFI y su repositorio. La cronología no completa silencios con inferencias.</p>
          </div>
          <Link href="/" style={{color:'#d5ad69',textDecoration:'none',letterSpacing:'.15em',fontSize:12}}>← FIELD</Link>
        </header>

        <section style={{marginTop:36,padding:'18px 20px',border:'1px solid rgba(202,160,92,.25)',background:'rgba(191,139,65,.035)'}}>
          <small style={{letterSpacing:'.22em',color:'#b78d50'}}>EPISTEMIC BOUNDARY</small>
          <p style={{lineHeight:1.65,marginBottom:0,color:'#c8b99d'}}>{SFI_HISTORY_BOUNDARY}</p>
        </section>

        <section style={{marginTop:22,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:12}}>
          <Link href="/history/mutations" style={{display:'block',border:'1px solid rgba(202,160,92,.2)',padding:'16px 18px',color:'#cfa15d',textDecoration:'none'}}>
            <small style={{letterSpacing:'.18em',color:'#9f845b'}}>MUTATION EVIDENCE</small>
            <span style={{display:'block',marginTop:8,color:'#c8b99d',fontSize:15,lineHeight:1.55}}>GitHub commit → QA → deployment → exercise → calibrated learning.</span>
          </Link>
        </section>

        <section style={{position:'relative',marginTop:48}}>
          <div style={{position:'absolute',left:112,top:0,bottom:0,width:1,background:'linear-gradient(#c3924e,rgba(195,146,78,.08))'}} />
          {SFI_INSTITUTION_HISTORY.map((m) => (
            <article key={m.id} style={{display:'grid',gridTemplateColumns:'90px 1fr',gap:42,position:'relative',padding:'0 0 46px'}}>
              <time style={{fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',fontSize:12,color:'#9a825f',paddingTop:5}}>{m.occurredAt.slice(0,10)}</time>
              <div style={{position:'relative',paddingLeft:38}}>
                <span style={{position:'absolute',left:-26,top:7,width:9,height:9,borderRadius:'50%',background:'#d3a45d',boxShadow:'0 0 18px rgba(211,164,93,.45)'}} />
                <small style={{letterSpacing:'.16em',color:'#9f845b'}}>{m.epistemicClass} · {m.sourceType}</small>
                <h2 style={{fontWeight:400,fontSize:30,margin:'8px 0 10px',color:'#e0c58f'}}>{m.title}</h2>
                <p style={{maxWidth:820,lineHeight:1.75,color:'#bcae94',fontSize:16}}>{m.summary}</p>
                <a href={m.sourceUrl} target="_blank" rel="noreferrer" style={{display:'inline-block',marginTop:6,color:'#cfa15d',textDecoration:'none',fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',fontSize:12}}>SOURCE · {m.sourceLabel} ↗</a>
              </div>
            </article>
          ))}
        </section>

        <footer style={{borderTop:'1px solid rgba(202,160,92,.2)',paddingTop:26,marginTop:18,display:'flex',justifyContent:'space-between',gap:20,flexWrap:'wrap'}}>
          <span style={{fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',fontSize:11,color:'#786b56'}}>SFI-INSTITUTION-HISTORY-1.0</span>
          <a href="/api/public/history" style={{color:'#b98d4e',textDecoration:'none',fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',fontSize:11}}>MACHINE-READABLE HISTORY →</a>
        </footer>
      </div>
    </main>
  );
}
