import 'server-only';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import type { SfiMaterialRightsStatus } from '../materialRegistryContract';

export type SfiProductionInstrumentRow = {
  id: string; name: string; family: string; engine: string; packageRef: string; packageHash: string; license: string | null;
  rightsStatus: SfiMaterialRightsStatus; rightsEvidenceRef: string; rangeLow: number; rangeHigh: number; articulations: string[];
  sampleRate: number | null; culturalProfiles: string[]; verifiedAt: string;
};

function normalize(row: Record<string, unknown>): SfiProductionInstrumentRow {
  if (row.current_execution_rights_state !== 'ELIGIBLE' || row.quality_state !== 'PRODUCTION') throw new Error('SFI_AUDIO_INSTRUMENT_NOT_EXECUTION_ELIGIBLE');
  if (!['EXECUTION_ALLOWED', 'DERIVATIVE_ALLOWED'].includes(String(row.rights_status))) throw new Error('SFI_AUDIO_INSTRUMENT_EXECUTION_RIGHTS_REQUIRED');
  const required = ['id','name','family','engine','package_ref','package_hash','rights_evidence_ref','verified_at'] as const;
  for (const key of required) if (typeof row[key] !== 'string' || !String(row[key]).trim()) throw new Error(`SFI_AUDIO_INSTRUMENT_FIELD_REQUIRED:${key}`);
  if (!Number.isInteger(row.range_low) || !Number.isInteger(row.range_high)) throw new Error('SFI_AUDIO_INSTRUMENT_RANGE_REQUIRED');
  return {
    id: String(row.id), name: String(row.name), family: String(row.family), engine: String(row.engine), packageRef: String(row.package_ref), packageHash: String(row.package_hash),
    license: typeof row.license === 'string' ? row.license : null, rightsStatus: String(row.rights_status) as SfiMaterialRightsStatus,
    rightsEvidenceRef: String(row.rights_evidence_ref), rangeLow: Number(row.range_low), rangeHigh: Number(row.range_high),
    articulations: Array.isArray(row.articulations) ? row.articulations.map(String) : [], sampleRate: typeof row.sample_rate === 'number' ? row.sample_rate : null,
    culturalProfiles: Array.isArray(row.cultural_profiles) ? row.cultural_profiles.map(String) : [], verifiedAt: String(row.verified_at),
  };
}

export async function resolveProductionInstrument(input: { culturalProfile: string; families: string[] }) {
  const db = createServiceSupabaseClient();
  const { data, error } = await db.from('sfi_instruments')
    .select('id,name,family,engine,package_ref,package_hash,license,rights_status,rights_evidence_ref,current_execution_rights_state,range_low,range_high,articulations,sample_rate,cultural_profiles,quality_state,verified_at')
    .eq('current_execution_rights_state', 'ELIGIBLE').eq('quality_state', 'PRODUCTION').contains('cultural_profiles', [input.culturalProfile]);
  if (error) throw new Error(`SFI_AUDIO_INSTRUMENT_RESOLUTION_FAILED:${error.message}`);
  const familySet = new Set(input.families.map((family) => family.toLowerCase()));
  const match = (data ?? []).find((item) => familySet.has(String(item.family).toLowerCase()));
  if (!match) throw new Error(`SFI_AUDIO_PRODUCTION_INSTRUMENT_MISSING:${input.culturalProfile}:${input.families.join('|')}`);
  return normalize(match as Record<string, unknown>);
}

export async function getProductionInstrumentById(instrumentId: string) {
  const db = createServiceSupabaseClient();
  const { data, error } = await db.from('sfi_instruments')
    .select('id,name,family,engine,package_ref,package_hash,license,rights_status,rights_evidence_ref,current_execution_rights_state,range_low,range_high,articulations,sample_rate,cultural_profiles,quality_state,verified_at')
    .eq('id', instrumentId).eq('current_execution_rights_state', 'ELIGIBLE').eq('quality_state', 'PRODUCTION').maybeSingle();
  if (error) throw new Error(`SFI_AUDIO_INSTRUMENT_RESOLUTION_FAILED:${error.message}`);
  if (!data) throw new Error('SFI_AUDIO_PRODUCTION_INSTRUMENT_NOT_FOUND');
  return normalize(data as Record<string, unknown>);
}
