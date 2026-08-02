import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const COMMERCIAL_STATUSES = [
  'draft',
  'internal_review',
  'approved',
  'sent',
  'viewed',
  'negotiation',
  'accepted',
  'rejected',
  'expired',
  'converted',
] as const;

export type CommercialProposalStatus = typeof COMMERCIAL_STATUSES[number];

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; details?: string };

type JsonRecord = Record<string, unknown>;

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function optionalText(value: unknown) {
  const valueText = text(value);
  return valueText.length > 0 ? valueText : null;
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function bounded01(value: unknown) {
  const parsed = optionalNumber(value);
  return parsed === null ? 0 : Math.min(1, Math.max(0, parsed));
}

function stringList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean);
  return text(value).split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
}

function uuidList(value: unknown) {
  return stringList(value).filter((item) => /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(item));
}

function proposalNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `SFI-CP-${date}-${suffix}`;
}

async function recordEvent(input: {
  eventType: string;
  actorId: string;
  clientId?: string | null;
  opportunityId?: string | null;
  proposalId?: string | null;
  payload?: JsonRecord;
}) {
  const service = createServiceSupabaseClient();
  return service.from('commercial_proposal_events').insert({
    event_type: input.eventType,
    actor_id: input.actorId,
    client_id: input.clientId ?? null,
    opportunity_id: input.opportunityId ?? null,
    proposal_id: input.proposalId ?? null,
    payload: input.payload ?? {},
  });
}

export async function readCommercialWorkspace() {
  const service = createServiceSupabaseClient();
  const [clients, opportunities, proposals, sourceProposals] = await Promise.all([
    service.from('commercial_clients').select('*').order('updated_at', { ascending: false }).limit(200),
    service.from('commercial_opportunities').select('*').order('updated_at', { ascending: false }).limit(200),
    service.from('commercial_proposals').select('*').order('updated_at', { ascending: false }).limit(200),
    service
      .from('action_proposals')
      .select('id,title,status,risk_level,approval_required,objective,proposal_type,created_at,expected_field_delta')
      .order('created_at', { ascending: false })
      .limit(40),
  ]);

  const warnings = [
    clients.error ? `commercial_clients:${clients.error.message}` : '',
    opportunities.error ? `commercial_opportunities:${opportunities.error.message}` : '',
    proposals.error ? `commercial_proposals:${proposals.error.message}` : '',
    sourceProposals.error ? `action_proposals:${sourceProposals.error.message}` : '',
  ].filter(Boolean);

  const clientRows = clients.error ? [] : clients.data ?? [];
  const opportunityRows = opportunities.error ? [] : opportunities.data ?? [];
  const proposalRows = proposals.error ? [] : proposals.data ?? [];

  return {
    schemaReady: !clients.error && !opportunities.error && !proposals.error,
    warnings,
    clients: clientRows,
    opportunities: opportunityRows,
    proposals: proposalRows,
    sourceProposals: sourceProposals.error ? [] : sourceProposals.data ?? [],
    counts: {
      clients: clientRows.length,
      openOpportunities: opportunityRows.filter((row) => !['won', 'lost', 'archived'].includes(String(row.stage))).length,
      draftProposals: proposalRows.filter((row) => ['draft', 'internal_review'].includes(String(row.status))).length,
      activeProposals: proposalRows.filter((row) => ['approved', 'sent', 'viewed', 'negotiation'].includes(String(row.status))).length,
      acceptedProposals: proposalRows.filter((row) => ['accepted', 'converted'].includes(String(row.status))).length,
    },
  };
}

export async function createCommercialClient(input: JsonRecord, actorId: string): Promise<ServiceResult<unknown>> {
  const name = text(input.name);
  if (!name) return { ok: false, error: 'client_name_required' };

  const service = createServiceSupabaseClient();
  const inserted = await service.from('commercial_clients').insert({
    name,
    legal_name: optionalText(input.legalName),
    status: 'prospect',
    sector: optionalText(input.sector),
    website: optionalText(input.website),
    primary_contact: {
      name: optionalText(input.contactName),
      role: optionalText(input.contactRole),
      email: optionalText(input.contactEmail),
      phone: optionalText(input.contactPhone),
    },
    source: optionalText(input.source) ?? 'manual',
    notes: optionalText(input.notes),
    created_by: actorId,
    updated_at: new Date().toISOString(),
  }).select('*').single();

  if (inserted.error) return { ok: false, error: 'commercial_client_insert_failed', details: inserted.error.message };

  const event = await recordEvent({
    eventType: 'client.created',
    actorId,
    clientId: inserted.data.id,
    payload: { source: inserted.data.source },
  });
  if (event.error) return { ok: false, error: 'commercial_client_event_failed', details: event.error.message };

  return { ok: true, data: inserted.data };
}

export async function createCommercialOpportunity(input: JsonRecord, actorId: string): Promise<ServiceResult<unknown>> {
  const clientId = text(input.clientId);
  const title = text(input.title);
  const problemStatement = text(input.problemStatement);
  if (!clientId) return { ok: false, error: 'opportunity_client_required' };
  if (!title) return { ok: false, error: 'opportunity_title_required' };
  if (!problemStatement) return { ok: false, error: 'opportunity_problem_required' };

  const service = createServiceSupabaseClient();
  const inserted = await service.from('commercial_opportunities').insert({
    client_id: clientId,
    title,
    problem_statement: problemStatement,
    recommended_offer: optionalText(input.recommendedOffer),
    stage: 'identified',
    estimated_value: optionalNumber(input.estimatedValue),
    currency: optionalText(input.currency) ?? 'MXN',
    probability: bounded01(input.probability),
    source_action_proposal_id: optionalText(input.sourceActionProposalId),
    source_evidence_ids: uuidList(input.sourceEvidenceIds),
    owner_id: actorId,
    next_action: optionalText(input.nextAction),
    next_action_at: optionalText(input.nextActionAt),
    created_by: actorId,
    updated_at: new Date().toISOString(),
  }).select('*').single();

  if (inserted.error) return { ok: false, error: 'commercial_opportunity_insert_failed', details: inserted.error.message };

  const event = await recordEvent({
    eventType: 'opportunity.created',
    actorId,
    clientId,
    opportunityId: inserted.data.id,
    payload: {
      sourceActionProposalId: inserted.data.source_action_proposal_id,
      recommendedOffer: inserted.data.recommended_offer,
    },
  });
  if (event.error) return { ok: false, error: 'commercial_opportunity_event_failed', details: event.error.message };

  return { ok: true, data: inserted.data };
}

export async function createCommercialProposal(input: JsonRecord, actorId: string): Promise<ServiceResult<unknown>> {
  const opportunityId = text(input.opportunityId);
  const title = text(input.title);
  const diagnosis = text(input.diagnosis);
  const serviceScope = text(input.serviceScope);
  if (!opportunityId) return { ok: false, error: 'proposal_opportunity_required' };
  if (!title) return { ok: false, error: 'proposal_title_required' };
  if (!diagnosis) return { ok: false, error: 'proposal_diagnosis_required' };
  if (!serviceScope) return { ok: false, error: 'proposal_scope_required' };

  const service = createServiceSupabaseClient();
  const opportunity = await service
    .from('commercial_opportunities')
    .select('id,client_id,stage')
    .eq('id', opportunityId)
    .maybeSingle();

  if (opportunity.error) return { ok: false, error: 'proposal_opportunity_lookup_failed', details: opportunity.error.message };
  if (!opportunity.data) return { ok: false, error: 'proposal_opportunity_not_found' };

  const payload = {
    proposal_number: proposalNumber(),
    client_id: opportunity.data.client_id,
    opportunity_id: opportunityId,
    status: 'draft',
    title,
    diagnosis,
    service_scope: serviceScope,
    deliverables: stringList(input.deliverables),
    duration_days: optionalNumber(input.durationDays),
    price_amount: optionalNumber(input.priceAmount),
    currency: optionalText(input.currency) ?? 'MXN',
    assumptions: stringList(input.assumptions),
    exclusions: stringList(input.exclusions),
    confidence: bounded01(input.confidence),
    evidence_ids: uuidList(input.evidenceIds),
    source_action_proposal_ids: uuidList(input.sourceActionProposalIds),
    valid_until: optionalText(input.validUntil),
    created_by: actorId,
    updated_at: new Date().toISOString(),
  };

  const inserted = await service.from('commercial_proposals').insert(payload).select('*').single();
  if (inserted.error) return { ok: false, error: 'commercial_proposal_insert_failed', details: inserted.error.message };

  const version = await service.from('commercial_proposal_versions').insert({
    proposal_id: inserted.data.id,
    version: 1,
    snapshot: inserted.data,
    created_by: actorId,
  });

  if (version.error) {
    await service.from('commercial_proposals').delete().eq('id', inserted.data.id);
    return { ok: false, error: 'commercial_proposal_version_failed', details: version.error.message };
  }

  const opportunityUpdate = await service.from('commercial_opportunities').update({
    stage: 'proposal',
    updated_at: new Date().toISOString(),
  }).eq('id', opportunityId);

  if (opportunityUpdate.error) {
    return { ok: false, error: 'commercial_opportunity_stage_failed', details: opportunityUpdate.error.message };
  }

  const event = await recordEvent({
    eventType: 'proposal.created',
    actorId,
    clientId: inserted.data.client_id,
    opportunityId,
    proposalId: inserted.data.id,
    payload: { proposalNumber: inserted.data.proposal_number, version: 1 },
  });
  if (event.error) return { ok: false, error: 'commercial_proposal_event_failed', details: event.error.message };

  return { ok: true, data: inserted.data };
}

const ALLOWED_TRANSITIONS: Record<CommercialProposalStatus, CommercialProposalStatus[]> = {
  draft: ['internal_review'],
  internal_review: ['draft', 'approved'],
  approved: ['sent'],
  sent: ['viewed', 'negotiation', 'accepted', 'rejected', 'expired'],
  viewed: ['negotiation', 'accepted', 'rejected', 'expired'],
  negotiation: ['accepted', 'rejected', 'expired'],
  accepted: ['converted'],
  rejected: [],
  expired: [],
  converted: [],
};

export async function transitionCommercialProposal(input: JsonRecord, actorId: string): Promise<ServiceResult<unknown>> {
  const proposalId = text(input.proposalId);
  const nextStatus = text(input.status) as CommercialProposalStatus;
  if (!proposalId) return { ok: false, error: 'proposal_id_required' };
  if (!COMMERCIAL_STATUSES.includes(nextStatus)) return { ok: false, error: 'proposal_status_invalid' };

  const service = createServiceSupabaseClient();
  const current = await service.from('commercial_proposals').select('*').eq('id', proposalId).maybeSingle();
  if (current.error) return { ok: false, error: 'commercial_proposal_lookup_failed', details: current.error.message };
  if (!current.data) return { ok: false, error: 'commercial_proposal_not_found' };

  const currentStatus = String(current.data.status) as CommercialProposalStatus;
  if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(nextStatus)) {
    return { ok: false, error: 'commercial_transition_not_allowed', details: `${currentStatus}->${nextStatus}` };
  }

  const now = new Date().toISOString();
  const patch: JsonRecord = { status: nextStatus, updated_at: now };
  if (nextStatus === 'approved') {
    patch.approved_by = actorId;
    patch.approved_at = now;
  }
  if (nextStatus === 'sent') patch.sent_at = now;
  if (nextStatus === 'accepted') patch.accepted_at = now;

  const updated = await service.from('commercial_proposals').update(patch).eq('id', proposalId).select('*').single();
  if (updated.error) return { ok: false, error: 'commercial_proposal_transition_failed', details: updated.error.message };

  const opportunityStage =
    nextStatus === 'negotiation' ? 'negotiation'
      : nextStatus === 'accepted' || nextStatus === 'converted' ? 'won'
        : nextStatus === 'rejected' || nextStatus === 'expired' ? 'lost'
          : nextStatus === 'approved' || nextStatus === 'sent' || nextStatus === 'viewed' ? 'proposal'
            : null;

  if (opportunityStage) {
    const opportunityUpdate = await service.from('commercial_opportunities').update({
      stage: opportunityStage,
      updated_at: now,
    }).eq('id', updated.data.opportunity_id);
    if (opportunityUpdate.error) {
      return { ok: false, error: 'commercial_opportunity_transition_failed', details: opportunityUpdate.error.message };
    }
  }

  const event = await recordEvent({
    eventType: 'proposal.status_changed',
    actorId,
    clientId: updated.data.client_id,
    opportunityId: updated.data.opportunity_id,
    proposalId,
    payload: { from: currentStatus, to: nextStatus },
  });
  if (event.error) return { ok: false, error: 'commercial_transition_event_failed', details: event.error.message };

  return { ok: true, data: updated.data };
}
