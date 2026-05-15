// src/app/api/subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, module_access, subscription_expires_at')
    .eq('user_id', user.id)
    .single();
  return NextResponse.json({
    tier: profile?.subscription_tier || 'free',
    modules: profile?.module_access || {},
    expiresAt: profile?.subscription_expires_at,
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { userId, tier, modules } = await req.json();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  if (profile?.role !== 'root') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const targetId = userId || user.id;
  await supabase
    .from('profiles')
    .update({ subscription_tier: tier, module_access: modules })
    .eq('user_id', targetId);
  return NextResponse.json({ success: true });
}
