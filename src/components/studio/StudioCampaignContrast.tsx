'use client';

import { useState } from 'react';
import type { ReleaseDirection } from './localReleaseMaterials';
import {
  proposeCampaignVariants, contrastCampaignObservations,
  type CampaignObserved,
} from './localCampaignContrast';

type Entry = { url:string; observedAt:string; impressions:string; saves:string; meaningfulInteractions:string };
const empty = ():Entry => ({url:'',observedAt:'',impressions:'',saves:'',meaningfulInteractions:''});

export default function StudioCampaignContrast({direction}:{direction:ReleaseDirection}) {
  const [entries,setEntries]=useState<Record<'A'|'B',Entry>>({A:empty(),B:empty()});
  const [evaluated,setEvaluated]=useState(false);
  const [message,setMessage]=useState('');
  const variants=proposeCampaignVariants(direction);
  const records:CampaignObserved[] = (['A','B'] as const)
    .filter(id=>Object.values(entries[id]).some(v=>v.trim()))
    .map(id=>({
      variant:id,
      url:entries[id].url.trim(),
      observedAt:entries[id].observedAt,
      impressions:entries[id].impressions.trim()===''?NaN:Number(entries[id].impressions),
      saves:entries[id].saves.trim()===''?NaN:Number(entries[id].saves),
      meaningfulInteractions:entries[id].meaningfulInteractions.trim()===''?NaN:Number(entries[id].meaningfulInteractions),
      source:'MANUAL_PLATFORM_READBACK',
    }));
  const contrast=contrastCampaignObservations(records);
  const canExport=Boolean(direction.title.trim()) && Boolean(direction.artist.trim());
  function update(id:'A'|'B',field:keyof Entry,value:string) {
    setEntries(current=>({...current,[id]:{...current[id],[field]:value}}));
    setEvaluated(false);setMessage('');
  }
  function download(content:string,filename:string) {
    const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));
    const link=document.createElement('a');
    link.href=url;link.download=filename;link.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function downloadVariants(){
    if(!canExport)return;
    download(JSON.stringify({
      contract:'SFI-STUDIO-LOCAL-CAMPAIGN-CONTRAST-1.0',
      producedAt:new Date().toISOString(),
      status:'DRAFT_NOT_PUBLISHED',
      authorizedPublication:false,
      title:direction.title,artist:direction.artist,sectorHypothesis:direction.sector,
      variants,
      evaluationProtocol:{
        requirement:'Real posts, recorded references, observed platform values, comparable 24-hour readbacks',
        primaryMetric:'Saves divided by observed impressions',
        limitation:'Not causal without controlled allocation and comparable exposure',
      },
      originalAudioTransferred:false,providerCostsAdded:false,
    },null,2),'studio-campaign-variants.json');
    setMessage('Dos variantes y protocolo exportados. No se ha publicado ninguna pieza.');
  }
  function downloadContrast() {
    if(!canExport || contrast.status!=='CONTRASTABLE')return;
    download(JSON.stringify({
      contract:'SFI-STUDIO-LOCAL-CAMPAIGN-CONTRAST-1.0',
      producedAt:new Date().toISOString(),
      direction:{title:direction.title,artist:direction.artist,sectorHypothesis:direction.sector},
      contrast,comparisonOnly:true,certifiedEffect:false,
      provenance:'User-entered platform observations; URLs not independently authenticated by this interface',
      originalAudioTransferred:false,
    },null,2),'studio-campaign-observed-contrast.json');
    setMessage('Lecturas comparadas exportadas. La aplicación no verificó directamente los valores en la plataforma.');
  }
  return <section style={{display:'grid',gap:12,padding:14,border:'1px solid rgba(127,200,245,.27)'}}>
    <strong>Campaña de contraste · dos variantes verificables</strong>
    <p style={{margin:0,color:'#aabfce',fontSize:11,lineHeight:1.5}}>
      A y B son propuestas para publicar sólo con autorización. Aquí puedes descargar la campaña y,
      cuando existan publicaciones, registrar cifras reales y comparar tasas. Las cifras no se inventan,
      no se almacenan en SFI y no se declaran efectos causales.
    </p>
    {variants.map(variant=><div key={variant.id} style={{padding:12,border:'1px solid rgba(127,200,245,.2)',display:'grid',gap:7}}>
      <strong>Variante {variant.id}</strong>
      <p style={{margin:0,color:'#a4c7d9',fontSize:11}}>{variant.hypothesis}</p>
      <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontSize:12,margin:0}}>{variant.caption}</pre>
      <label htmlFor={'campaign-url-'+variant.id}>URL real de la publicación</label>
      <input id={'campaign-url-'+variant.id} value={entries[variant.id].url} type="url" placeholder="https://..."
        onChange={e=>update(variant.id,'url',e.target.value)}
        style={{background:'#162836',border:'1px solid #4c6775',color:'#fff',padding:8}}/>
      <label htmlFor={'campaign-date-'+variant.id}>Fecha y hora de la lectura</label>
      <input id={'campaign-date-'+variant.id} value={entries[variant.id].observedAt} type="datetime-local"
        onChange={e=>update(variant.id,'observedAt',e.target.value)}
        style={{background:'#162836',border:'1px solid #4c6775',color:'#fff',padding:8}}/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(105px,1fr))',gap:7}}>
        {([
          ['impressions','Impresiones'],
          ['saves','Guardados'],
          ['meaningfulInteractions','Interacciones pertinentes'],
        ] as const).map(([field,label])=><label key={field} style={{display:'grid',gap:5,fontSize:11}}>
          {label}
          <input type="number" min="0" step="1" value={entries[variant.id][field]}
            onChange={e=>update(variant.id,field,e.target.value)}
            style={{background:'#162836',border:'1px solid #4c6775',color:'#fff',padding:8,width:'100%',boxSizing:'border-box'}}/>
        </label>)}
      </div>
    </div>)}
    <div style={{display:'flex',flexWrap:'wrap',gap:9}}>
      <button type="button" disabled={!canExport} onClick={downloadVariants}
        style={{padding:'9px 12px',background:'#1f4853',color:'#e8f7ff',border:'1px solid #56899a',cursor:'pointer'}}>
        DESCARGAR CAMPAÑA A/B
      </button>
      <button type="button" onClick={()=>setEvaluated(true)}
        style={{padding:'9px 12px',background:'#263c4e',color:'#e8f7ff',border:'1px solid #57758a',cursor:'pointer'}}>
        COMPARAR LECTURAS REALES
      </button>
    </div>
    {evaluated&&<div aria-live="polite" style={{padding:10,border:'1px solid rgba(127,200,245,.2)'}}>
      <strong>{contrast.status}</strong>
      <p>{contrast.reason}</p>
      {contrast.status==='CONTRASTABLE'&&<div>
        {contrast.rates.map(rate=><p key={rate.variant} style={{margin:'6px 0'}}>
          Variante {rate.variant}: guardados/impresiones {(rate.saveRate*100).toFixed(3)}% ·
          interacción/impresiones {(rate.meaningfulInteractionRate*100).toFixed(3)}%
        </p>)}
        <p>Mayor tasa observada: {contrast.relativeOutcome}. Esto no certifica eficacia ni causalidad.</p>
        <button type="button" onClick={downloadContrast}
          style={{padding:'9px 12px',background:'#20463b',color:'#e8f7ff',border:'1px solid #528674',cursor:'pointer'}}>
          DESCARGAR CONTRASTE CON TRAZABILIDAD
        </button>
      </div>}
    </div>}
    {message&&<p role="status" style={{margin:0,fontSize:12,color:'#a1d9c3'}}>{message}</p>}
  </section>;
}
