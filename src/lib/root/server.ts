import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { getServerUserContext } from '@/lib/server/productionBackend';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export type RootGate = Awaited<ReturnType<typeof requireRootActor>>;

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export async function requireRootActor(action: string) {
  const ctx = await getServerUserContext();
  if (!ctx.user) return { ok: false as const, status: 401, body: { ok: false, error: 'Unauthorized' } };
  if (!ctx.isRoot) return { ok: false as const, status: 403, body: { ok: false, error: 'root_required' } };
  return { ok: true as const, ctx, action };
}

// perf: suppress read-time audit and epistemic writes.
//
// Auditoría de la fuga real (2026-07-02): auditRootAction() es el único
// punto de escritura hacia root_audit_events + epistemic_events, y
// requireGovernedActor() (usada en 18+ rutas) lo llamaba en CADA request sin
// distinguir lectura de mutación. Las propias rutas ya nombraban la acción
// como lectura ('acp.agents.read', 'acp.proposals.list', 'me.read',
// 'me.head', 'state.read') — el sistema se autodeclaraba lectura y la
// función lo ignoraba.
//
// Regla operativa (no inferida, declarada): una acción cuyo nombre termina
// en uno de estos sufijos es de solo lectura y NUNCA debe producir un
// root_audit_event ni un epistemic_event. Cualquier acción nueva que
// necesite ese sufijo debe ser de lectura; cualquier mutación nueva debe
// evitar estos sufijos exactos. Esto convierte la convención de nombres que
// el propio código ya usaba en una regla exigible, no solo documental.
const READ_ONLY_ACTION_SUFFIXES = ['.read', '.list', '.head', '.state', '.health', '.preview', '.lookup'] as const;

function isReadOnlyAction(action: string): boolean {
  return READ_ONLY_ACTION_SUFFIXES.some((suffix) => action.endsWith(suffix));
}

export async function auditRootAction(input: {
  actorId: string;
  action: string;
  target?: string | null;
  payload?: Record<string, unknown>;
  request?: Request;
}) {
  if (isReadOnlyAction(input.action)) {
    // No se escribe root_audit_event ni epistemic_event por una lectura.
    // DT-TRUTH-001 / R19 en espíritu: una lectura no es evidencia nueva, es
    // solo consultar lo que ya existe. Se devuelve ok:true con skipped:true
    // para que quien llama pueda seguir su flujo normal sin tratarlo como
    // fallo, pero quede visible en logs de desarrollo que se omitió a
    // propósito, no por error silencioso.
    return { ok: true as const, skipped: true as const, reason: 'read_only_action_not_audited' as const };
  }

  const service = createServiceSupabaseClient();
  const payload = input.payload ?? {};
  const auditInsert = await service
    .from('root_audit_events')
    .insert({
      actor_id: input.actorId,
      action: input.action,
      target: input.target ?? null,
      payload,
      ip_address: input.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      user_agent: input.request?.headers.get('user-agent') ?? null,
    })
    .select('*')
    .single();

  if (auditInsert.error) {
    return { ok: false as const, error: 'root_audit_insert_failed', details: auditInsert.error.message };
  }

  const event = await appendEpistemicEvent({
    eventName: `root.${input.action}`,
    epistemicClass: 'observed',
    confidence: 0.92,
    payload: {
      auditId: auditInsert.data.id,
      action: input.action,
      target: input.target ?? null,
      ...payload,
    },
    occurredAt: new Date().toISOString(),
    source: { sourceId: 'ROOT_CONSOLE', sourceType: 'root_audit' },
    logbookId: 'ROOT',
    lineage: [String(auditInsert.data.id)],
  });

  if (!event.ok) {
    return { ok: false as const, error: 'root_epistemic_audit_failed', details: event };
  }

  return { ok: true as const, skipped: false as const, audit: auditInsert.data, epistemicEvent: event.data };
}


export async function readTableHealth(table: string, limit = 5) {
  const service = createServiceSupabaseClient();
  const count = await service.from(table).select('*', { count: 'exact', head: true });
  if (count.error) return { table, ok: false, count: null, latest: [], warning: count.error.message };

  const latest = await service
    .from(table)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return {
    table,
    ok: !latest.error,
    count: count.count ?? 0,
    latest: latest.error ? [] : latest.data ?? [],
    warning: latest.error?.message ?? null,
  };
}

export async function recordUsageObservation(input: {
  actorId: string;
  kind: string;
  amount?: number;
  metadata?: Record<string, unknown>;
}) {
  const service = createServiceSupabaseClient();
  const membership = await service
    .from('account_members')
    .select('account_id')
    .eq('user_id', input.actorId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membership.error || !membership.data?.account_id) {
    return { ok: true as const, skipped: true, reason: membership.error?.message ?? 'account_membership_missing' };
  }

  const amount = typeof input.amount === 'number' ? input.amount : 1;
  const ledger = await service
    .from('usage_ledger')
    .insert({
      account_id: membership.data.account_id,
      actor_id: input.actorId,
      kind: input.kind,
      amount,
      unit: 'operation',
      metadata: input.metadata ?? {},
    })
    .select('*')
    .single();

  if (ledger.error) return { ok: false as const, error: 'usage_ledger_insert_failed', details: ledger.error.message };

  const balance = await service
    .from('account_balance')
    .upsert({
      account_id: membership.data.account_id,
      balance: 0,
      reserved: 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'account_id' })
    .select('*')
    .single();

  return { ok: true as const, data: { ledger: ledger.data, balance: balance.error ? null : balance.data } };
}
