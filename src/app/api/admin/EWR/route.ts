// src/app/api/admin/erw/route.ts
import { NextResponse } from 'next/server';
import { GlobalLearningAgent } from '@/lib/agents/GlobalLearningAgent';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  if (profile?.role !== 'root') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const erw = await GlobalLearningAgent.getLatestERW();
  return NextResponse.json({ erw });
}

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  if (profile?.role !== 'root') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Forzar recálculo del ERW (últimas 24h)
  const newErw = await GlobalLearningAgent.calculateERW();
  return NextResponse.json({ success: true, erw: newErw });
}