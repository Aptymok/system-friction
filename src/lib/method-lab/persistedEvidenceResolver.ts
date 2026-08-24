import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import type { KernelEvidence } from '@/lib/sfi/cognitive-runtime/kernelContext';

type Row = Record<string, unknown>;
const rows=(v:unknown):Row[]=>Array.isArray(v)?v.filter((x):x is Row=>Boolean(x)&&typeof x==='object'&&!Array.isArray(x)):[];
const text=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim():null;
const number01=(v:unknown)=>{const n=typeof v==='number'?v:Number(v);return Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;};

export async function resolveMethodLabEvidence(evidenceIds:string[]):Promise<KernelEvidence[]>{
  const requested=[...new Set(evidenceIds.filter(Boolean))];
  if(!requested.length)throw new Error('METHOD_LAB_EVIDENCE_IDS_REQUIRED');
  const db=createServiceSupabaseClient();

  const [rootResult,ledgerResult]=await Promise.all([
    db.from('root_evidence_entries')
      .select('id,title,content,evidence_type,payload,epistemic_event_id,created_at')
      .in('id',requested),
    db.from('sfi_evidence_ledger')
      .select('id,case_id,module,evidence_kind,source_name,source_url,public_summary,evidence_hash,trust_level,trust_score,observed_at,created_at')
      .in('id',requested),
  ]);
  if(rootResult.error)throw new Error(`METHOD_LAB_ROOT_EVIDENCE_READ_FAILED:${rootResult.error.message}`);
  if(ledgerResult.error)throw new Error(`METHOD_LAB_LEDGER_EVIDENCE_READ_FAILED:${ledgerResult.error.message}`);

  const rootRows=rows(rootResult.data);
  const ledgerRows=rows(ledgerResult.data);
  const eventIds=rootRows.map(r=>text(r.epistemic_event_id)).filter((v):v is string=>Boolean(v));
  const eventResult=eventIds.length
    ? await db.from('epistemic_events').select('event_id,epistemic_class,confidence,occurred_at,hash_self').in('event_id',eventIds)
    : {data:[],error:null};
  if(eventResult.error)throw new Error(`METHOD_LAB_EPISTEMIC_EVENT_READ_FAILED:${eventResult.error.message}`);
  const eventMap=new Map(rows(eventResult.data).map(r=>[String(r.event_id),r]));

  const resolved=new Map<string,KernelEvidence>();
  for(const item of rootRows){
    const id=String(item.id);
    const event=eventMap.get(String(item.epistemic_event_id??''));
    resolved.set(id,{
      id,
      source:`root_evidence_entries:${text(item.evidence_type)??'evidence'}`,
      confidence:number01(event?.confidence),
      payload:{
        title:text(item.title),
        content:text(item.content),
        payload:item.payload,
        epistemicClass:text(event?.epistemic_class)?.toUpperCase()??'MISSING',
        observedAt:text(event?.occurred_at)??text(item.created_at),
        epistemicEventId:text(item.epistemic_event_id),
        eventHash:text(event?.hash_self),
        persistenceSource:'root_evidence_entries',
      },
    });
  }

  for(const item of ledgerRows){
    const id=String(item.id);
    if(resolved.has(id))continue;
    resolved.set(id,{
      id,
      source:`sfi_evidence_ledger:${text(item.evidence_kind)??'evidence'}`,
      confidence:number01(item.trust_score),
      payload:{
        title:text(item.source_name)??text(item.case_id)??id,
        content:item.public_summary??null,
        caseId:text(item.case_id),
        module:text(item.module),
        sourceUrl:text(item.source_url),
        evidenceHash:text(item.evidence_hash),
        trustLevel:text(item.trust_level),
        epistemicClass:text(item.observed_at)?'OBSERVED':'DECLARED',
        observedAt:text(item.observed_at)??text(item.created_at),
        persistenceSource:'sfi_evidence_ledger',
      },
    });
  }

  const missing=requested.filter(id=>!resolved.has(id));
  if(missing.length)throw new Error(`METHOD_LAB_PERSISTED_EVIDENCE_NOT_FOUND:${missing.join(',')}`);
  return requested.map(id=>resolved.get(id) as KernelEvidence);
}
