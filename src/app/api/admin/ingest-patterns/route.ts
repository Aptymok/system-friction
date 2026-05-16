// src/app/api/admin/ingest-patterns/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/runtime/supabase/server';

type PatternDefinition = {
  name?: string;
  definition?: string;
  activation_conditions?: Record<string, unknown>;
  mihm_v3_variables?: unknown;
  falsification?: unknown;
  doc_refs?: unknown;
  severity?: string;
};

const patternsData: { patterns: Record<string, PatternDefinition> } = {
  patterns: {},
};

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // verificar rol root
  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'root') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const patterns = patternsData.patterns;
  for (const [id, p] of Object.entries(patterns)) {
    await supabase.from('systemic_patterns').upsert({
      pattern_id: id,
      name: p.name ?? id,
      description: p.definition ?? '',
      conditions: p.activation_conditions || {},
      mihm_mapping: p.mihm_v3_variables,
      falsification: p.falsification,
      doc_refs: p.doc_refs,
      severity: p.severity || 'MEDIUM'
    }, { onConflict: 'pattern_id' });
  }
  return NextResponse.json({ success: true });
}
