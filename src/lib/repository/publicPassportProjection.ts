import 'server-only';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

/**
 * REPOSITORY PUBLIC PASSPORT / READ ONLY.
 * An operational T0, T1, hypothesis or question is NOT public merely because
 * it is persisted. Release requires a PUBLISHED snapshot, a publication
 * timestamp, explicit approval and a field-by-field public_fields allowlist.
 * No access to source rows or their private owners is exposed here.
 */
export type PublicPassportReading = {
  sourcePublicationId: string;
  snapshotVersion: string | null;
  publishedAt: string;
  t0: string | null;
  t1: string | null;
  sixQuestions: Array<{ question: string; answer: string | null }>;
  hypothesis: string | null;
  rivalHypotheses: string[];
  observations: string[];
  expectedReturn: string | null;
  observedReturn: string | null;
  limitations: string[];
};

const asRow = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const safeString = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0,2400) : null;
const strings = (v: unknown, max=12): string[] =>
  Array.isArray(v) ? v.slice(0,max).map(safeString).filter((s):s is string=>Boolean(s)) : [];
const FIELDS = new Set([
  't0','t1','sixQuestions','questions','hypothesis','primaryHypothesis',
  'rivalHypotheses','observations','expectedReturn','observedReturn','limitations',
]);

export async function readPublishedRepositoryPassports(knownIds: readonly string[]): Promise<Record<string, PublicPassportReading>> {
  if (!knownIds.length) return {};
  const allowed = new Set(knownIds);
  try {
    const db = createServiceSupabaseClient();
    const result = await db.from('sfi_publications')
      .select('id,source_id,source_type,approved_by,public_fields,public_payload,snapshot_version,published_at,status')
      .eq('status','PUBLISHED')
      .not('published_at','is',null)
      .not('approved_by','is',null)
      .order('published_at',{ascending:false})
      .limit(100);
    if (result.error) return {};
    const output: Record<string,PublicPassportReading> = {};
    for (const raw of result.data??[]) {
      const sourceId=safeString(raw.source_id);
      if (!sourceId || !allowed.has(sourceId) || output[sourceId]) continue;
      const fields=new Set((raw.public_fields??[]).filter((v:unknown):v is string=>typeof v==='string' && FIELDS.has(v)));
      const payload=asRow(raw.public_payload);
      const disclosed=(key:string):unknown=>fields.has(key)?payload[key]:null;
      const picked=(...keys:string[]):string|null=>{
        for (const key of keys){const value=safeString(disclosed(key));if(value)return value;}
        return null;
      };
      const rawQuestions=fields.has('sixQuestions')?payload.sixQuestions:disclosed('questions');
      const questions=Array.isArray(rawQuestions)?rawQuestions.slice(0,6).map(item=>{
        if(typeof item==='string')return {question:item.slice(0,1000),answer:null};
        const q=asRow(item);
        return {question:safeString(q.question??q.prompt)??'',answer:safeString(q.answer??q.response)};
      }).filter(x=>x.question):[];
      output[sourceId]={
        sourcePublicationId:String(raw.id),snapshotVersion:safeString(raw.snapshot_version),
        publishedAt:String(raw.published_at),
        t0:picked('t0'),t1:picked('t1'),sixQuestions:questions,
        hypothesis:picked('hypothesis','primaryHypothesis'),
        rivalHypotheses:strings(disclosed('rivalHypotheses')),
        observations:strings(disclosed('observations')),
        expectedReturn:picked('expectedReturn'),
        observedReturn:picked('observedReturn'),
        limitations:strings(disclosed('limitations')),
      };
    }
    return output;
  } catch { return {}; } // unavailable is unknown; never synthesize a public record
}
