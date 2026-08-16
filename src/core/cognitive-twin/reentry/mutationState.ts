import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;

export async function readCognitiveTwinMutationState() {
  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_cognitive_twin_decisions')
    .select('id,decision_id,status,general_rule,evidence_refs,created_at,updated_at')
    .like('decision_id', 'CT-A01-MUT-%')
    .order('created_at', { ascending: false })
    .limit(200);
  if (result.error) return { available:false, unresolved:0, proposals:[] as Row[], warning:`ct_mutation_state:${result.error.message}` };
  const proposals=(result.data??[]) as Row[];
  const unresolved=proposals.filter(row=>['CANDIDATE','WAITING_EVIDENCE'].includes(String(row.status??'').toUpperCase())).length;
  return { available:true, unresolved, proposals, warning:null as string|null };
}
