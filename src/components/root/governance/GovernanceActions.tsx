'use client';

import { useState } from 'react';

export function GovernanceActions({ crlProposalId }: { crlProposalId: string | null }) {
  const [message,setMessage]=useState<string|null>(null);
  const [busy,setBusy]=useState<string|null>(null);
  async function run(key:string,url:string){setBusy(key);setMessage(null);try{const response=await fetch(url,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'}});const body=await response.json().catch(()=>null) as Record<string,unknown>|null;if(!response.ok||!body||body.ok!==true)throw new Error(String(body?.error??`HTTP ${response.status}`));setMessage(key==='presence'?'ACP PRESENCE RECORDED · governance heartbeat updated.':crlProposalId?'CRL governance object already exists; open Decision Inbox.':'CRL governance proposal created; open Decision Inbox.');window.setTimeout(()=>window.location.reload(),600);}catch(error){setMessage(error instanceof Error?error.message:'Governance action failed.')}finally{setBusy(null)}}
  return <section style={{border:'1px solid rgba(200,169,81,.12)',background:'#080807',padding:14,marginTop:12}}><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button disabled={Boolean(busy)} onClick={()=>void run('presence','/api/governance/acp-seen')} style={button}>RECORD ACP PRESENCE</button><button disabled={Boolean(busy)||Boolean(crlProposalId)} onClick={()=>void run('crl','/api/root/governance/crl/prepare-decision')} style={button}>{crlProposalId?'CRL DECISION EXISTS':'CREATE CRL GOVERNANCE DECISION'}</button><a href="/root/decisions" style={{...button,textDecoration:'none'}}>OPEN DECISION INBOX</a></div>{message?<p style={{margin:'10px 0 0',color:'#9ca97b',fontSize:9}}>{message}</p>:null}</section>;
}
const button: React.CSSProperties={border:'1px solid rgba(200,169,81,.25)',background:'transparent',color:'#c6ad69',padding:'9px 11px',font:'8px ui-monospace,SFMono-Regular,Menlo,monospace',cursor:'pointer'};
