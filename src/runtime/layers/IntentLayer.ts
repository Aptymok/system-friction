// src/lib/layers/IntentLayer.ts
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export type Intent = {
  id: string;
  objective: string;
  successCriteria: Record<string, any>;
  version: number;
  isActive: boolean;
};

// Solo lectura de intenciones activas
export async function getActiveIntent(nodeId: string): Promise<Intent | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const cookieStore = cookies() as any;
  const supabase = createServerClient(supabaseUrl, supabaseKey, { cookies: cookieStore });
  const { data, error } = await supabase
    .from('intents')
    .select('*')
    .eq('node_id', nodeId)
    .eq('is_active', true)
    .single();
  if (error) return null;
  return {
    id: data.id,
    objective: data.objective,
    successCriteria: data.success_criteria,
    version: data.version,
    isActive: data.is_active,
  };
}

// Crear nueva intención (solo humano, vía API con validación de rol)
export async function createIntent(
  userId: string,
  nodeId: string,
  objective: string,
  successCriteria: Record<string, any>
): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const cookieStore = cookies() as any;
  const supabase = createServerClient(supabaseUrl, supabaseKey, { cookies: cookieStore });
  const { data, error } = await supabase
    .from('intents')
    .insert({
      user_id: userId,
      node_id: nodeId,
      objective,
      success_criteria: successCriteria,
      approved_by: userId, // se asume que quien crea es humano autorizado
      is_active: true,
    })
    .select('id')
    .single();
  if (error) throw new Error(`Failed to create intent: ${error.message}`);
  return data.id;
}

// Modificar intención (solo humano, genera histórico)
export async function updateIntent(
  intentId: string,
  newObjective: string,
  reason: string,
  userId: string
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const cookieStore = cookies() as any;
  const supabase = createServerClient(supabaseUrl, supabaseKey, { cookies: cookieStore });
  // Obtener versión actual
  const { data: current } = await supabase
    .from('intents')
    .select('objective, version')
    .eq('id', intentId)
    .single();
  if (!current) throw new Error('Intent not found');
  // Insertar histórico
  await supabase.from('intent_history').insert({
    intent_id: intentId,
    changed_by: userId,
    old_objective: current.objective,
    new_objective: newObjective,
    reason,
  });
  // Actualizar intent
  const { error } = await supabase
    .from('intents')
    .update({
      objective: newObjective,
      version: current.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', intentId);
  if (error) throw error;
}
