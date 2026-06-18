import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const caseId = req.nextUrl.searchParams.get('case_id');
  if (!caseId) return NextResponse.json({ error: 'case_id is required' }, { status: 400 });

  try {
    const supabase = createServiceSupabaseClient();
    const [perturbationsRes, capabilityChecksRes, ledgerRes, mediaAssetsRes, outcomesRes, lessonsRes] = await Promise.all([
      supabase.from('sfi_field_perturbations').select('*').eq('case_id', caseId).order('created_at', { ascending: false }),
      supabase.from('sfi_capability_checks').select('*').eq('case_id', caseId).order('created_at', { ascending: false }),
      supabase.from('sfi_execution_ledger').select('*').eq('case_id', caseId).order('created_at', { ascending: false }),
      supabase.from('sfi_media_assets').select('*').eq('case_id', caseId).order('created_at', { ascending: false }),
      supabase.from('sfi_outcomes').select('*').eq('case_id', caseId).order('created_at', { ascending: false }),
      supabase.from('sfi_lessons').select('*').eq('case_id', caseId).order('created_at', { ascending: false }),
    ]);
    return NextResponse.json({
      ok: true,
      perturbations: perturbationsRes.data ?? [],
      capabilityChecks: capabilityChecksRes.data ?? [],
      ledgerEntries: ledgerRes.data ?? [],
      mediaAssets: mediaAssetsRes.data ?? [],
      outcomes: outcomesRes.data ?? [],
      lessons: lessonsRes.data ?? [],
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'execution_state_failed',
      perturbations: [],
      capabilityChecks: [],
      ledgerEntries: [],
      mediaAssets: [],
      outcomes: [],
      lessons: [],
    }, { status: 200 });
  }
}

