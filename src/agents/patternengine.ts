// src/lib/agents/patternEngine.ts
import { createServerSupabaseClient } from '@/runtime/supabase/server';

export interface Pattern {
  id: string;
  name: string;
  conditions: any;
  mihm_mapping: any;
  severity: string;
}

export async function evaluatePatterns(nodeId: string, metrics: any): Promise<string[]> {
  const supabase = await createServerSupabaseClient();
  const { data: patterns } = await supabase
    .from('systemic_patterns')
    .select('*');
  
  if (!patterns) return [];

  const activePatterns: string[] = [];
  for (const pattern of patterns) {
    const conditions = pattern.conditions;
    let meets = true;
    if (conditions.ihg_min !== undefined && metrics.ihg < conditions.ihg_min) meets = false;
    if (conditions.nti_max !== undefined && metrics.nti > conditions.nti_max) meets = false;
    if (conditions.fs_min !== undefined && metrics.F_s_norm < conditions.fs_min) meets = false;
    // ... más condiciones según el patrón
    if (meets) activePatterns.push(pattern.pattern_id);
  }
  return activePatterns;
}
