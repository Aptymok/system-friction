import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { GlobalLearningAgent } from '@/lib/agents/GlobalLearningAgent';

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

  // Recalcular ERW con un período más largo o forzar limpieza de tabla
  const newErw = await GlobalLearningAgent.calculateERW(undefined, 48); // últimas 48 horas
  // Opcional: eliminar registros antiguos si quieres reset completo
  await supabase.from('external_reality_weights').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // cuidado
  return NextResponse.json({ success: true, erw: newErw });
}