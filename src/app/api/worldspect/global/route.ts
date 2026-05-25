import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export async function GET() {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('worldspect_snapshots')
    .select('*')
    .order('observed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { status: 'stale', reason: 'database_hydration_pending' },
      { status: 200 }
    );
  }

  return NextResponse.json({ status: 'ok', snapshot: data }, { status: 200 });
}
