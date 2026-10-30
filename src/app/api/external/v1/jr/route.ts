import { NextResponse } from 'next/server';

import { authorizeExternalRequest, externalActor, externalAuthError } from '@/lib/sfi/externalAuth';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { runJrFieldCycle } from '@/lib/mihm/jrFieldCycle';
import { SFI_SUPABASE_READ_BUDGET } from '@/lib/supabase/readBudget';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

type JrOperation = 'state' | 'run';
type Row = Record<string, unknown>;

const JR_READ_SCOPE = 'jr:read' as const;
const JR_RUN_SCOPE = 'jr:run' as const;

function requiredScope(operation: JrOperation) {
  return operation === 'run' ? JR_RUN_SCOPE : JR_READ_SCOPE;
}

function boundedNodeRefs(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    .map((item) => item.trim()))]
    .slice(0, SFI_SUPABASE_READ_BUDGET.jrScientificTargets);
}

async function readJrState(nodeRefs: string[]) {
  const db = createServiceSupabaseClient();
  const latest = await db.from('epistemic_events')
    .select('event_id,occurred_at,payload')
    .eq('event_name', 'SFI_JR_FIELD_CYCLE_COMPLETED')
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest.error) {
    return {
      ok: false as const,
      contract: 'SFI-JR-MCP-1.0',
      latestCycle: null,
      nodeRefs,
      error: latest.error.message,
    };
  }

  const payload = (latest.data?.payload && typeof latest.data.payload === 'object' && !Array.isArray(latest.data.payload))
    ? latest.data.payload as Row
    : {};

  return {
    ok: true as const,
    contract: 'SFI-JR-MCP-1.0',
    latestCycle: latest.data ? {
      eventId: latest.data.event_id,
      occurredAt: latest.data.occurred_at,
      status: payload.status ?? null,
      graphState: payload.graphState ?? null,
      observed: payload.observed ?? null,
      methods: payload.methods ?? null,
      activeObservationRequests: payload.activeObservationRequests ?? null,
      perturbationReviewRequests: payload.perturbationReviewRequests ?? null,
      returnReconciliation: payload.returnReconciliation ?? null,
      materialPerturbationExecuted: payload.materialPerturbationExecuted ?? false,
      canonicalMutation: payload.canonicalMutation ?? false,
      returnFabricated: payload.returnFabricated ?? false,
    } : null,
    nodeRefs,
    boundary: 'JR state is a bounded read of persisted cycle receipts. Absence of a receipt means NOT_OBSERVED, not zero, success or failure.',
  };
}

export async function GET(req: Request) {
  const auth = authorizeExternalRequest(req, JR_READ_SCOPE);
  if (!auth.credential) return NextResponse.json(externalAuthError(auth, JR_READ_SCOPE), { status: 401 });
  if (auth.credential.authMethod !== 'oauth' || !auth.credential.subjectId || auth.credential.tenantId !== 'sfi') {
    return NextResponse.json({ ok: false, error: 'institutional_user_bound_oauth_required' }, { status: 403 });
  }
  return NextResponse.json({
    ...(await readJrState([])),
    operation: 'state',
    actor: externalActor(auth.credential),
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const operation = String(body.operation || 'state') as JrOperation;
  if (!['state', 'run'].includes(operation)) {
    return NextResponse.json({ ok: false, error: 'unsupported_jr_operation', supported: ['state', 'run'] }, { status: 400 });
  }

  const scope = requiredScope(operation);
  const auth = authorizeExternalRequest(req, scope);
  if (!auth.credential) return NextResponse.json(externalAuthError(auth, scope), { status: 401 });
  if (auth.credential.authMethod !== 'oauth' || !auth.credential.subjectId || auth.credential.tenantId !== 'sfi') {
    return NextResponse.json({ ok: false, error: 'institutional_user_bound_oauth_required' }, { status: 403 });
  }

  const actorId = externalActor(auth.credential);
  const nodeRefs = boundedNodeRefs(body.nodeRefs);
  if (operation === 'state') {
    return NextResponse.json({
      ...(await readJrState(nodeRefs)),
      operation,
      actor: actorId,
    }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const before = await readJrState([]);
  const latestAt = before.latestCycle?.occurredAt ? Date.parse(String(before.latestCycle.occurredAt)) : Number.NaN;
  const cooldownMs = SFI_SUPABASE_READ_BUDGET.worldRunCooldownMinutes * 60_000;
  if (Number.isFinite(latestAt) && Date.now() - latestAt < cooldownMs) {
    return NextResponse.json({
      ok: true,
      operation,
      actor: actorId,
      status: 'COOLDOWN_SKIPPED',
      cooldownMinutes: SFI_SUPABASE_READ_BUDGET.worldRunCooldownMinutes,
      writesPerformed: false,
      latestCycle: before.latestCycle,
      boundary: 'Repeated JR runs inside the governed cooldown are skipped to contain primary egress and duplicate Method Lab work.',
    });
  }

  const result = await runJrFieldCycle({
    actorId,
    trigger: 'EXTERNAL_JR_RUN',
    maxMethodRuns: SFI_SUPABASE_READ_BUDGET.jrMethodRuns,
    maxEpochWrites: SFI_SUPABASE_READ_BUDGET.jrEpochWrites,
    maxPhenomenonWrites: SFI_SUPABASE_READ_BUDGET.jrPhenomenonWrites,
  });

  return NextResponse.json({
    ...result,
    operation,
    actor: actorId,
    requestedNodeRefs: nodeRefs,
    authority: {
      scope,
      rootAuthorityInherited: false,
      governanceDecisionAuthorityInherited: false,
      materialPerturbationAllowed: false,
      canonicalPromotionAllowed: false,
      returnFabricationAllowed: false,
    },
  }, { status: result.ok ? 200 : 207 });
}
