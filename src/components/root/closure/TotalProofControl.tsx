'use client';

import { useState } from 'react';

export function TotalProofControl() {
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  async function record(){
    setBusy(true); setMessage(null);
    try {
      const response=await fetch('/api/root/readiness',{method:'POST',credentials:'include'});
      const body=await response.json().catch(()=>null);
      if(!response.ok||!body?.ok) throw new Error(body?.details??body?.error??`HTTP ${response.status}`);
      const p=body.proof;
      setMessage(`Receipt recorded · STRUCTURAL ${p.structuralPass?'PASS':'FAIL'} · LIVE ${p.livePass?'PASS':'FAIL'} · LONGITUDINAL ${p.longitudinalPass?'PASS':'FAIL'}`);
    } catch(error){ setMessage(error instanceof Error?error.message:'Total proof failed.'); }
    finally{setBusy(false)}
  }
  return <section style={{marginTop:18,border:'1px solid rgba(200,169,81,.16)',padding:14}}><button onClick={()=>void record()} disabled={busy} style={{border:'1px solid rgba(200,169,81,.4)',background:'#090908',color:'#d0b76f',padding:'9px 12px',font:'9px ui-monospace,monospace'}}>{busy?'RECORDING…':'RECORD TOTAL PROOF RECEIPT'}</button>{message?<p aria-live="polite" style={{color:'#b9a269',fontSize:9}}>{message}</p>:null}</section>;
}
