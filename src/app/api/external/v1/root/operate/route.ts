import { recordProposalOutcomeFromObservedReturn } from '@/lib/governance/proposalOutcome';
import { appendOperationalEvent, updateActionProposalStatus } from '@/lib/operational/common';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { recoverBlockedScheduledWorldReports } from '@/lib/reports/scheduledAgentReports';
import { probeLlmProviders } from '@/lib/ai/providerRouter';
import { persistDiscoveryObservation, runAutomaticDiscoveryObservationCycle, runBoundedGeminiDiscoveryProbe, runBoundedGeminiGroundedDiscoveryProbe } from '@/lib/discovery/discoveryRepository';
import { humanReportText } from '@/lib/reports/humanReport';
import { readRootReportHealth, readRootReportInbox } from '@/lib/reports/rootReportInbox';
import { runRestrictedEvidenceReports } from '@/lib/reports/restrictedEvidenceReports';
import { authorizeExternalRequest, externalAuthError } from '@/lib/sfi/externalAuth';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { bootstrapSfiStudioPilot, importSfiStudioGenealogy, reviewSfiStudioPilotMorning } from '@/lib/studio/campaign/studioCampaignPilot';
import { deliverInstitutionalInvitation } from '@/lib/auth/institutionalInvitationDelivery';
import { readDataPlaneReconciliationStatus, attemptBoundedDataPlaneReconciliation } from '@/lib/persistence/dataPlaneReconciliationControl';
import { replayVerifiedSourceObservations } from '@/lib/persistence/verifiedObservationReplay';
import {
  createPredictionEntry,
  listPredictionEntries,
  normalizeCreatePredictionInput,
} from '@/lib/sfi/predictions/service';
import { validateMihmP4IssuePacket } from '@/lib/mihm/foundationProspectiveScoring';
import { readUniversalCycleHistory } from '@/lib/sfi/universalSignalCycle';
import { assessUniversalClosure } from '@/lib/sfi/universalClosure';
import { getCurrentUniversalClosureRecommendation, hasVerifiedLatestUniversalReturnCalibration } from '@/lib/sfi/universalCalibrationState';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const REQUIRED_SCOPE = 'root:operate' as const;

const recoverySchema = z.object({ email: z.string().trim().email().transform((value) => value.toLowerCase()) });

const invitationSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  displayName: z.string().trim().min(2).max(120),
  title: z.string().trim().min(2).max(160),
  accessClass: z.enum(['INSTITUTIONAL_OBSERVER', 'INSTITUTIONAL_OPERATOR']),
});

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function sovereignRootProfile(profile: Record<string, unknown> | null) {
  if (!profile) return false;
  const role = typeof profile.role === 'string' ? profile.role.trim().toLowerCase() : '';
  const access = record(profile.module_access);
  return (role === 'root' || role === 'system') && access.full_access === true && access.root === true;
}

async function requireSovereignRoot(req: Request) {
  const auth = authorizeExternalRequest(req, REQUIRED_SCOPE);
  if (!auth.credential) {
    return {
      ok: false as const,
      response: NextResponse.json(externalAuthError(auth, REQUIRED_SCOPE), { status: 401 }),
    };
  }

  const credential = auth.credential;
  if (
    credential.authMethod !== 'oauth'
    || !credential.subjectId
    || credential.role !== 'root_delegate'
    || credential.tenantId !== 'sfi'
  ) {
    return {
      ok: false as const,
      response: NextResponse.json({
        ok: false,
        error: 'sovereign_root_oauth_required',
        scopeAllowed: auth.scopeAllowed,
        authMethod: credential.authMethod ?? null,
        role: credential.role ?? null,
        tenantId: credential.tenantId ?? null,
      }, { status: 403 }),
    };
  }

  const service = createServiceSupabaseClient();
  const profileRead = await service
    .from('profiles')
    .select('user_id,email,role,module_access')
    .eq('user_id', credential.subjectId)
    .maybeSingle();

  if (profileRead.error) {
    return {
      ok: false as const,
      response: NextResponse.json({
        ok: false,
        error: 'root_profile_read_failed',
        details: profileRead.error.message,
      }, { status: 503 }),
    };
  }

  if (!sovereignRootProfile(profileRead.data as Record<string, unknown> | null)) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: 'sovereign_root_authority_required' }, { status: 403 }),
    };
  }

  return {
    ok: true as const,
    credential,
    service,
    profile: profileRead.data as Record<string, unknown>,
  };
}

function clampReportLimit(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return 80;
  return Math.max(1, Math.min(240, Math.floor(parsed)));
}

async function readRootControlPlane(service: ReturnType<typeof createServiceSupabaseClient>) {
  const safe = async (table:string, select:string, limit=80, orderColumn='created_at') => {
    const r=await service.from(table).select(select).order(orderColumn,{ascending:false}).limit(limit);
    return {available:!r.error, rows:r.data??[], error:r.error?.message??null};
  };
  const [proposals,founderRules,hypotheses,outcomes,learning,cases,health,incidents,commercialProposals,commercialOpportunities]=await Promise.all([
    safe('action_proposals','id,proposal_type,title,description,status,expected_field_delta,proportionality_check,outcome,created_at',120),
    safe('sfi_cognitive_twin_decisions','id,decision_id,situation,rejected_condition,correct_state,general_rule,required_evidence,evidence_refs,status,decision_kind,created_at,updated_at',100),
    safe('world_hypotheses','id,phenomenon_key,statement,status,current_confidence,validation_starts_at,validation_ends_at,created_at',80),
    safe('world_hypothesis_outcomes','id,hypothesis_id,classification,observed_outcome,evidence_ids,evaluated_at',80,'evaluated_at'),
    safe('world_learning_events','id,hypothesis_id,outcome_id,retained_assumptions,rejected_assumptions,missing_variables,graph_adjustments,confidence_before,confidence_after,created_at',80),
    safe('sfi_cases','id,subject,scope,status,uncertainty,governance,created_at,updated_at,closed_at',80),
    safe('sfi_capability_health_checks','*',80,'checked_at'),
    safe('sfi_institutional_incidents','*',80,'opened_at'),
    safe('commercial_proposals','*',80),
    safe('commercial_opportunities','*',80),
  ]);
  return {generatedAt:new Date().toISOString(),proposals,founderRules,world:{hypotheses,outcomes,learning},cases,health,incidents,commercial:{proposals:commercialProposals,opportunities:commercialOpportunities},boundaries:{observationDoesNotEqualEvidence:true,simulationDoesNotEqualReturn:true,reportDoesNotEqualAuthority:true,rootDoesNotRewriteHistory:true}};
}

async function readRootPending(service: ReturnType<typeof createServiceSupabaseClient>) {
 const state=await readRootControlPlane(service);
 const pendingProposals=(state.proposals.rows as unknown as Record<string,unknown>[]).filter(r=>['proposed','conflicted','pending'].includes(String(r.status??'').toLowerCase()));
 const pendingRules=(state.founderRules.rows as unknown as Record<string,unknown>[]).filter(r=>String(r.status??'').toUpperCase()==='CANDIDATE');
 // Make already-queued operational work visible, but never conflate its
 // executor/RETURN obligations with a new sovereign approval decision.
 const operationalQueue=(state.proposals.rows as unknown as Record<string,unknown>[])
   .filter(r=>['queued','waiting_evidence','design_approved','frozen'].includes(String(r.status??'').toLowerCase()))
   .map(r=>{
     const outcome=record(r.outcome);
     const payload=record(outcome.payloadPatch);
     const assignment=record(payload.assignment);
     const assignedAt=typeof assignment.assignedAt==='string'?assignment.assignedAt:null;
     const assignedMs=assignedAt?Date.parse(assignedAt):NaN;
     const externalAssigned=assignment.adapterId==='external_connector_handoff_v1' && assignment.state==='ASSIGNED';
     const minutesAssigned=Number.isFinite(assignedMs)?Math.max(0,Math.floor((Date.now()-assignedMs)/60000)):null;
     return {
       id:r.id,
       proposalType:r.proposal_type,
       title:r.title,
       status:r.status,
       executionState:externalAssigned && (minutesAssigned===null || minutesAssigned>=60)?'STALLED_EXTERNAL_EXECUTOR':payload.executionState??null,
       assignedExecutor:assignment.executorId??null,
       assignedAt,
       minutesAssigned,
       nextAction:externalAssigned?'EXTERNAL_EXECUTOR_PERFORM_AUTHORIZED_ACTION_AND_RECORD_OBSERVED_RETURN':payload.systemNextAction??null,
       returnRequired:payload.requiresExecutorReturn??payload.returnRequiredBeforeAdoption??null,
       adoptionRecorded:payload.institutionalAdoptionRecorded??false,
     };
   });
 return {
   generatedAt:state.generatedAt,
   proposals:pendingProposals,
   founderRules:pendingRules,
   operationalQueue,
   operationalQueueCount:operationalQueue.length,
   operationalQueueBoundary:'READ_ONLY: operational queue is not a sovereign decision queue; assignment is not execution and closure requires verified RETURN.',
   nextStep:'Use governance:decide only for sovereign decisions; inspect operationalQueue and its executor/RETURN requirements separately.',
 };
}

async function listInstitutionalAccounts(service: ReturnType<typeof createServiceSupabaseClient>) {
  const read = await service
    .from('sfi_account_access_grants')
    .select('id,email,display_name,title,access_class,status,invited_at,activated_at,last_invite_error,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (read.error) {
    return {
      ok: false as const,
      error: 'institutional_account_registry_unavailable',
      details: read.error.message,
    };
  }

  return {
    ok: true as const,
    accounts: read.data ?? [],
  };
}

async function recoverInstitutionalAccount(
  service: ReturnType<typeof createServiceSupabaseClient>,
  actorId: string,
  body: unknown,
) {
  const parsed = recoverySchema.safeParse(body);
  if (!parsed.success) return { ok: false as const, status: 400, error: 'invalid_account_recovery' };
  const grant = await service.from('sfi_account_access_grants')
    .select('id,email,user_id,status,display_name,title,access_class')
    .eq('email', parsed.data.email).maybeSingle();
  if (grant.error || !grant.data) return { ok: false as const, status: 404, error: 'account_not_found' };
  if (grant.data.status === 'SUSPENDED') return { ok: false as const, status: 403, error: 'account_suspended' };
  if (!grant.data.user_id || !['ACTIVE','INVITED'].includes(grant.data.status)) {
    return { ok: false as const, status: 409, error: 'account_identity_not_recoverable' };
  }
  const origin = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.systemfriction.org').replace(/\/$/, '');
  const sent = await deliverInstitutionalInvitation({
    service, email: grant.data.email, displayName: grant.data.display_name,
    title: grant.data.title, accessClass: grant.data.access_class,
    existingUserId: grant.data.user_id,
    redirectTo: `${origin}/reset?mode=invite`,
  });
  if (!sent.ok) return { ok: false as const, status: 502, error: 'recovery_email_not_sent', details: sent.error };

  await service.from('sfi_audit_events').insert({
    actor_id: actorId, action: 'ACCOUNT_CREDENTIAL_RECOVERY_REQUESTED',
    target_type: 'sfi_account_access_grant', target_id: grant.data.id,
    after_state: { email: grant.data.email, status: grant.data.status, userIdPreserved: true },
    context: { source: 'external_root_operate', deliveryChannel: sent.channel,
      grantUnchanged: true, authorityGranted: false, accessProved: false },
  });
  return { ok: true as const, status: 200, email: grant.data.email,
    existingGrantPreserved: true, existingIdentityPreserved: true,
    recoveryRequested: true, accessConfirmed: false };
}

async function inviteInstitutionalAccount(
  service: ReturnType<typeof createServiceSupabaseClient>,
  actorId: string,
  value: unknown,
) {
  const parsed = invitationSchema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false as const,
      status: 400,
      error: 'invalid_institutional_account_invitation',
      issues: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    };
  }

  const { email, displayName, title, accessClass } = parsed.data;
  const existingGrant = await service
    .from('sfi_account_access_grants')
    .select('id,status,user_id')
    .eq('email', email)
    .maybeSingle();

  if (existingGrant.error && !/does not exist|schema cache/i.test(existingGrant.error.message)) {
    return {
      ok: false as const,
      status: 503,
      error: 'institutional_account_registry_unavailable',
      details: existingGrant.error.message,
    };
  }

  if (existingGrant.data?.status === 'ACTIVE') {
    return { ok: false as const, status: 409, error: 'institutional_account_already_active' };
  }
  if (existingGrant.data?.status === 'SUSPENDED') {
    return { ok: false as const, status: 409, error: 'institutional_account_suspended' };
  }

  const now = new Date().toISOString();
  const previousStatus = existingGrant.data?.status ?? null;
  let grantId: string;

  if (existingGrant.data) {
    const prepared = await service
      .from('sfi_account_access_grants')
      .update({
        display_name: displayName,
        title,
        access_class: accessClass,
        invited_by: actorId,
        updated_at: now,
        last_invite_error: null,
      })
      .eq('id', existingGrant.data.id)
      .select('id')
      .single();

    if (prepared.error || !prepared.data) {
      return {
        ok: false as const,
        status: 503,
        error: 'institutional_account_prepare_failed',
        details: prepared.error?.message ?? 'grant_not_returned',
      };
    }
    grantId = String(prepared.data.id);
  } else {
    const prepared = await service
      .from('sfi_account_access_grants')
      .insert({
        email,
        display_name: displayName,
        title,
        access_class: accessClass,
        status: 'PENDING',
        invited_by: actorId,
        updated_at: now,
        last_invite_error: null,
      })
      .select('id')
      .single();

    if (prepared.error || !prepared.data) {
      return {
        ok: false as const,
        status: 503,
        error: 'institutional_account_prepare_failed',
        details: prepared.error?.message ?? 'grant_not_returned',
      };
    }
    grantId = String(prepared.data.id);
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://www.systemfriction.org';
  const invitation = await deliverInstitutionalInvitation({
    service,
    email,
    displayName,
    title,
    accessClass,
    existingUserId: existingGrant.data?.user_id ?? null,
    redirectTo: `${origin}/reset?mode=invite`,
  });

  if (!invitation.ok) {
    const inviteError = invitation.error;
    await service
      .from('sfi_account_access_grants')
      .update({
        status: previousStatus === 'INVITED' ? 'INVITED' : 'INVITE_FAILED',
        last_invite_error: inviteError,
        updated_at: new Date().toISOString(),
      })
      .eq('id', grantId);

    return {
      ok: false as const,
      status: /rate limit|too many requests/i.test(inviteError) ? 429 : 502,
      error: /rate limit|too many requests/i.test(inviteError)
        ? 'institutional_invitation_rate_limited'
        : 'institutional_invitation_not_sent',
      details: inviteError,
      accessGranted: false,
    };
  }

  const invitedAt = new Date().toISOString();
  await service
    .from('sfi_account_access_grants')
    .update({
      user_id: invitation.userId,
      status: 'INVITED',
      invited_at: invitedAt,
      activated_at: null,
      updated_at: invitedAt,
      last_invite_error: null,
    })
    .eq('id', grantId);

  await service.from('sfi_audit_events').insert({
    actor_id: actorId,
    action: 'ACCOUNT_INVITATION_SENT',
    target_type: 'sfi_account_access_grant',
    target_id: grantId,
    after_state: {
      email,
      displayName,
      title,
      accessClass,
      status: 'INVITED',
      profileProvisioned: false,
      authorityGranted: false,
    },
    context: {
      source: 'external_root_operate',
      profileProvisioningOwner: 'account_activation_route',
      accountAccessIsInstitutionalAppointment: false,
      sovereignAuthorityGranted: false,
      canonicalPromotionAllowed: false,
      deliveryChannel: invitation.channel,
    },
  });

  return {
    ok: true as const,
    status: 200,
    account: {
      grantId,
      userId: invitation.userId,
      email,
      displayName,
      title,
      accessClass,
      invitationStatus: 'INVITED',
    },
    authority: {
      accountAccessGranted: 'PENDING_VERIFIED_ACTIVATION',
      institutionalAppointmentGranted: false,
      sovereignAuthorityGranted: false,
      canonicalPromotionAllowed: false,
    },
  };
}

export async function POST(req: Request) {
  const root = await requireSovereignRoot(req);
  if (!root.ok) return root.response;

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const operation = typeof body.operation === 'string' ? body.operation.trim() : 'capabilities';

  if (operation === 'capabilities') {
    return NextResponse.json({
      ok: true,
      scope: REQUIRED_SCOPE,
      operations: [
        { id: 'reports', effect: 'READ', description: 'Read normalized ROOT report inbox and report health.' },
        { id: 'reports_recover_blocked', effect: 'BOUNDED_RECOVERY', description: 'Retry at most two blocked world reports as present-time observations; retain original failed receipts.' },
        { id: 'gemini_canary', effect: 'BOUNDED_PROVIDER_TEST', description: 'One short Gemini canary with no model provider escalation.' },
        { id: 'reports_run_restricted', effect: 'BOUNDED_SOURCE_REPORT_PERSISTENCE', description: 'Persist source-backed reports with ROOT OAuth, execute scope, separate opt-in and explicit confirmation. No models or external actions.' },
        { id: 'accounts_list', effect: 'READ', description: 'List ROOT-administered institutional account access grants.' },
        { id: 'account_invite', effect: 'EXTERNAL_REVERSIBLE', description: 'Send one institutional account invitation without granting sovereign authority.' },
        { id: 'account_recover', effect: 'EXTERNAL_REVERSIBLE', description: 'Re-send password setup to an existing verified institutional identity without altering its grant.' },
        { id: 'data_plane_status', effect: 'READ', description: 'Read primary/continuity reconciliation status, backlog, conflicts, and safety gates.' },
        { id: 'data_plane_emergency', effect: 'GOVERNED_RECOVERY', description: 'Attempt a bounded and conflict-gated recovery now. Never force a primary switch or erase evidence.' },
        { id: 'data_plane_copy_verified', effect: 'GOVERNED_INSERT_ONLY_REPLAY', description: 'Copy at most 20 exact, immutable world source observations via the existing canonical replay RPC; reject divergent inserts, never switch planes.' },
        { id: 'pending', effect: 'READ', description: 'Read sovereign pending proposals and founder-rule candidates with next-step boundary.' },
        { id: 'cycles_audit_bounded', effect: 'READ_ONLY_CANONICAL_CYCLE_AUDIT', description: 'Audit up to nine exact existing universal cycles: execution, authority, evidence, return, contrast, empirical closure gaps. No writes or resumed cycles.' },
        { id: 'studio_sfi_campaign_bootstrap', effect: 'FOUNDER_AUTHORIZED_STUDIO_INTAKE', description: 'Create or reuse SFI as its own Studio pilot project; no outbound, publication or new authority.' },
        { id: 'studio_sfi_genealogy_import', effect: 'OWNER_SCOPED_HISTORICAL_METADATA', description: 'Import at most 32 attributed historical source references into the existing Studio pilot; no raw archive content or publication.' },
        { id: 'studio_sfi_campaign_review', effect: 'READ_AND_BOUNDED_DAILY_RECEIPT', description: 'Review today source-backed Studio campaign state using existing World and Studio records only.' },
        { id: 'discovery_observe_bounded', effect: 'BOUNDED_OBSERVATION', description: 'Execute one existing zero-key public Discovery query; persist real retrieval or unavailable state without calling AI or paid providers.' },
        { id: 'discovery_ingest_external_search', effect: 'EXTERNAL_TOOL_OBSERVATION', description: 'Persist one attributed external SEARCH-tool result set with bounded fixed queries and source URLs, not server-verified or AI retrieval.' },
        { id: 'discovery_read_runs_bounded', effect: 'READ', description: 'Read back at most eight exact persisted Discovery observation runs and metrics; no writes or inferred measurements.' },
        { id: 'discovery_reconcile_gap', effect: 'GOVERNED_EVIDENCE_RECONCILIATION', description: 'Attach exact persisted discovery observations to one existing waiting-evidence proposal, without claiming recognition or closing the proposal.' },
        { id: 'discovery_gemini_memory_probe', effect: 'BOUNDED_MODEL_OBSERVATION', description: 'Observe one Gemini API response with fixed public prompt, no web, no cross-provider fallback and explicit original text persistence.' },
        { id: 'discovery_gemini_grounded_probe', effect: 'ONE_SHOT_GROUNDED_OBSERVATION', description: 'One manual Gemini Google Search-grounded identity probe with canonical readback and no schedule; Google may charge per generated query.' },
        { id: 'reconcile_obsolete_remediation', effect: 'GOVERNED_SUPERSESSION', description: 'Supersede one queued remediation only after canonical evidence that its parent has completed or was itself superseded. Never claim material execution.' },
        { id: 'sfi_state', effect: 'READ', description: 'Read one bounded cross-institution control-plane projection: WORLD hypotheses/outcomes/learning, Cases, health, incidents and commercial state.' },
        { id: 'capability_map', effect: 'READ', description: 'Describe the canonical surfaces ROOT can orchestrate without duplicating their authority.' },
        { id: 'proposals_record_observed_outcome', effect: 'GOVERNED_OUTCOME', description: 'Record one queued proposal outcome using its existing observed RETURN.' },
        { id: 'predictions_list', effect: 'READ', description: 'Read existing canonical prediction entries through sovereign OAuth; no writes.' },
        { id: 'predictions_create_p4', effect: 'GOVERNED_PREDICTION_RECORD', description: 'Persist one P4 T0 precommitted numeric prediction via the existing prediction service with sovereign ROOT auth, explicit confirmation and strict pre-issue guards. Registration is not outcome validation.' },
      ],
      existingMachineAuthority: {
        governanceDecision: 'decideSfiGovernanceProposal',
        governedExecution: 'executeAuthorizedSfiAction',
        proposalReturn: 'recordSfiProposalReturn',
        cases: 'operateSfiCaseWorkspace + dedicated Case operations',
        lab: 'operateSfiLab',
        cognitiveExecution: 'invoke_cognitive_capability (ACTIVE grant + possession proof required)',
        studio: 'separate SFI Studio MCP',
      },
      rootControlPlane: {
        accounts: 'root:operate',
        dataPlane: 'root:operate/data_plane_status + data_plane_emergency + data_plane_copy_verified; no forced failover',
        pending: 'root:operate read + governance:decide mutation',
        institution: 'root:operate sfi_state + observe/read surfaces',
        registryPublications: 'canonical publication/registry services; mutation adapter pending',
        predictions: 'root:operate/predictions_list + predictions_create_p4 delegates to existing SFI prediction service; cannot backdate or mint a verified RETURN',
        reports: 'root:operate reports (read) + reports_run_restricted (execute + explicit opt-in)',
        methodLab: 'operateSfiLab',
        agents: 'cognitive-runtime + invoke_cognitive_capability',
        health: 'root:operate sfi_state health + canonical QA/CI surfaces',
        commercial: 'root:operate sfi_state commercial + commercial service',
        studio: 'separate owner-bound Studio MCP',
        jr: 'operateSfiJr (jr:read / jr:run); bounded field-cycle coordination with no material perturbation, governance decision or canon promotion',
      },
      boundary: 'root:operate adds founder-only ROOT administration. It does not replace governance:decide, bypass capability grants, create arbitrary URL access, mint canon, or grant ROOT to another account.',
    }, { headers: { 'Cache-Control': 'no-store' } });
  }

  if (operation === 'capability_map') {
    return NextResponse.json({ok:true,operation,controlPlane:{
      accounts:{read:'root:operate/accounts_list',invite:'root:operate/account_invite',recover:'root:operate/account_recover'},
      dataPlane:{read:'root:operate/data_plane_status',emergency:'root:operate/data_plane_emergency',verifiedInsertReplay:'root:operate/data_plane_copy_verified',forceSwitchAllowed:false},
      pending:{read:'root:operate/pending',decide:'governance:decide'},
      institution:{read:'root:operate/sfi_state'},
      reports:{read:'root:operate/reports',restrictedRun:'root:operate/reports_run_restricted (execute + explicit opt-in)'},
      lab:{delegate:'operateSfiLab'},
      agents:{delegate:'cognitive-runtime/invoke_cognitive_capability'},
      studio:{delegate:'SFI Studio MCP'},
      registry:{status:'READ_AVAILABLE_MUTATION_ADAPTER_PENDING'},
      health:{read:'root:operate/sfi_state.health',execution:'CANONICAL_QA_ADAPTER_PENDING'},
      commercial:{read:'root:operate/sfi_state.commercial'},
      jr:{delegate:'operateSfiJr',readScope:'jr:read',runScope:'jr:run',materialPerturbationAllowed:false,governanceDecisionAuthorityInherited:false,canonicalPromotionAllowed:false}
    }},{headers:{'Cache-Control':'no-store'}});
  }

  if (operation === 'pending') {
    return NextResponse.json({ok:true,operation,pending:await readRootPending(root.service)},{headers:{'Cache-Control':'no-store'}});
  }

  if (operation === 'cycles_audit_bounded') {
    const ids = Array.isArray(body.cycle_ids) ? body.cycle_ids : [];
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (ids.length<1 || ids.length>9 || ids.some(id=>typeof id!=='string'||!uuid.test(id))
      || new Set(ids).size!==ids.length) {
      return NextResponse.json({ok:false,operation,error:'REQUIRE_1_TO_9_DISTINCT_EXACT_CYCLE_IDS'},{status:400});
    }
    const summarize = (event: Record<string, unknown>|null|undefined) => event ? ({
      eventId: typeof event.event_id==='string'?event.event_id:null,
      eventName: typeof event.event_name==='string'?event.event_name:null,
      occurredAt: typeof event.occurred_at==='string'?event.occurred_at:null,
      epistemicClass: typeof event.epistemic_class==='string'?event.epistemic_class:null,
    }) : null;
    const item = async (cycleId: string) => {
      const h=await readUniversalCycleHistory(cycleId);
      if (!h.ok) return {cycleId,ok:false,error:h.error??'CYCLE_HISTORY_READ_FAILED'};
      const ev=Array.isArray(h.events)?h.events:[];
      const latest=ev.at(-1)??null;
      const lastRun=(h.cognitiveRuns??[]).at(-1)??null;
      const lastSynthesis=(h.aiSyntheses??[]).at(-1)??null;
      const lastStructured=(h.structuredResults??[]).at(-1)??null;
      const lastReturn=(h.returns??[]).at(-1)??null;
      const lastContrast=(h.returnContrasts??[]).at(-1)??null;
      const returnPayload=record(record(lastReturn).payload);
      const contrastPayload=record(record(lastContrast).payload);
      const openedPayload=record(record(h.opened).payload);
      const sourceRefs=new Set<string>();
      const knownExternalEvidence=new Set<string>();
      for (const event of ev) {
        const er=record(event);
        const lineage=Array.isArray(er.lineage)?er.lineage:[];
        for(const ref of lineage){if(typeof ref==='string'&&ref)sourceRefs.add(ref);}
        const p=record(er.payload);
        for (const key of ['webEvidenceEventId','hydrationEventId']) {
          if(typeof p[key]==='string'&&p[key])knownExternalEvidence.add(p[key] as string);
        }
      }
      const empirical=assessUniversalClosure({history:h,requested:{closureClass:'EMPIRICAL_CONTRAST'}});
      const calibrated=hasVerifiedLatestUniversalReturnCalibration(ev);
      const closureRecommendation=getCurrentUniversalClosureRecommendation(ev);
      const returnOutcome=record(returnPayload.outcome);
      const observationNames=['SFI_UNIVERSAL_CYCLE_OPENED','SFI_UNIVERSAL_CYCLE_RESUMED'];
      const notEvidenceNames=['SFI_UNIVERSAL_RETURN_RECORDED','SFI_UNIVERSAL_RETURN_CONTRASTED'];
      const observedEvents=ev.filter(e=> {
        const r=record(e);
        return r.epistemic_class==='observed'&&!observationNames.includes(String(r.event_name))&&!notEvidenceNames.includes(String(r.event_name));
      });
      const latestInternalObservation=observedEvents.at(-1)??null;
      return {
        ok:true,cycleId,state:h.state,eventCount:ev.length,
        objective:typeof openedPayload.objective==='string'?openedPayload.objective:null,
        opened:summarize(h.opened),latestEvent:summarize(latest),
        latestCognitiveCycle:summarize(lastRun),latestAiSynthesis:summarize(lastSynthesis),
        latestStructuredResult:summarize(lastStructured),
        cognitiveCycleCount:(h.cognitiveRuns??[]).length,aiSynthesisCount:(h.aiSyntheses??[]).length,
        evidence:{
          lineageReferenceCount:sourceRefs.size,externalSourceEventReferenceCount:knownExternalEvidence.size,
          observedInternalEventCount:observedEvents.length,
          latestObservedInternalEvent:summarize(latestInternalObservation),
          provenanceBoundary:'Linked IDs and observed event classifications are not independent validation of their content.',
        },
        authorization:{
          callerAuthorizedForRead:true,
          callerMayRequestGovernedExecution:(root.credential.scopes??[]).includes('execute'),
          perAgentCapabilityGrantVerified:false,
          materialExecutionAuthorityVerified:false,
          rationale:'Read and execute OAuth scopes do not prove an ACTIVE per-capability grant, material authority or completed action.',
        },
        result:{
          latestReturn:summarize(lastReturn),
          returnsCount:(h.returns??[]).length,
          lastReturnClassification:typeof returnPayload.classification==='string'?returnPayload.classification:null,
          lastReturnEvidenceReferenceCount:Array.isArray(returnPayload.evidenceRefs)?returnPayload.evidenceRefs.length:0,
          lastReturnOutcomeFields:Object.keys(returnOutcome).slice(0,20),
          latestContrast:summarize(lastContrast),
          contrastsCount:(h.returnContrasts??[]).length,
          latestContrastCalibrationStatus:typeof contrastPayload.calibrationStatus==='string'?contrastPayload.calibrationStatus:null,
          latestContrastClassification:typeof contrastPayload.classification==='string'?contrastPayload.classification:null,
          verifiedLatestReturnCalibration:calibrated,
          canonicalClosureRecommended:Boolean(closureRecommendation),
          closed:(h.closures??[]).length>0,
        },
        empiricalClosureAssessment:{
          ready:empirical.ready,
          missing:Array.isArray(empirical.missing)?empirical.missing:[],
          epistemicBoundary:'Read-only feasibility check using the preexisting empirical closure contract. No closure, calibration, external RETURN or learning promotion performed.',
        },
        pendingAction:(h.closures??[]).length?'NONE_CLOSED'
          :!lastReturn?'OBTAIN_OBSERVED_AND_SUPPORTED_RETURN_BEFORE_CLOSURE'
          :!calibrated?'RESOLVE_RETURN_EVIDENCE_AND_CALIBRATION_BEFORE_CLOSURE'
          :empirical.ready?'REVIEW_EMPIRICAL_CLOSURE_WITH_OWNER'
          :'RESOLVE_EMPIRICAL_CLOSURE_MISSING_FIELDS',
      };
    };
    const cycles=await Promise.all(ids.map(id=>item(id as string)));
    return NextResponse.json({ok:cycles.every(x=>x.ok),operation,cycles,
      auditMode:'EXISTING_CYCLE_READ_ONLY_NO_WRITES',executedAgents:0,createdCycles:0,
      authorityExpanded:false,publicationExecuted:false,
    },{headers:{'Cache-Control':'no-store'}});
  }

  if (operation === 'sfi_state') {
    return NextResponse.json({ok:true,operation,state:await readRootControlPlane(root.service)},{headers:{'Cache-Control':'no-store'}});
  }


  if (operation === 'proposals_record_observed_outcome') {
    if (body.confirmation !== true || !(root.credential.scopes ?? []).includes('governance:decide')) {
      return NextResponse.json({ ok: false, error: 'CONFIRMED_GOVERNANCE_DECISION_SCOPE_REQUIRED' }, { status: 403 });
    }
    const proposalId = typeof body.proposal_id === 'string' ? body.proposal_id.trim() : '';
    const returnEventId = typeof body.return_event_id === 'string' ? body.return_event_id.trim() : '';
    if (!proposalId || !returnEventId) {
      return NextResponse.json({ ok: false, error: 'PROPOSAL_AND_RETURN_REQUIRED' }, { status: 400 });
    }
    const receipt = await root.service.from('epistemic_events').select('payload').eq('event_id', returnEventId).maybeSingle();
    if (receipt.error) return NextResponse.json({ ok: false, error: 'RETURN_LOOKUP_FAILED' }, { status: 503 });
    const payload = record(receipt.data?.payload);
    const evidenceRefs = Array.isArray(payload.evidenceRefs)
      ? payload.evidenceRefs.filter((ref): ref is string => typeof ref === 'string' && Boolean(ref.trim()))
      : [];
    const result = await recordProposalOutcomeFromObservedReturn({
      proposalId, returnEventId, evidenceRefs, actorId: root.credential.subjectId!,
      fieldEffect: record(payload.outcome),
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  }

  if (operation === 'predictions_list') {
    const result=await listPredictionEntries({limit:Math.max(1,Math.min(30,
      typeof body.limit==='number'&&Number.isFinite(body.limit)?Math.floor(body.limit):20))});
    return NextResponse.json(result.ok?{
      ok:true,operation,entries:result.data.entries,count:result.data.count,
      source:'EXISTING_SFI_PREDICTION_REGISTRY',readOnly:true,
    }:{ok:false,operation,error:result.error}, {
      status:result.ok?200:result.status??503,
      headers:{'Cache-Control':'no-store'},
    });
  }

  if (operation === 'predictions_create_p4') {
    if (body.confirmation!==true) {
      return NextResponse.json({ok:false,operation,error:'EXPLICIT_SINGLE_PREDICTION_CONFIRMATION_REQUIRED'},
        {status:403});
    }
    const candidate=record(body.prediction);
    const normalized=normalizeCreatePredictionInput(candidate);
    if(!normalized.ok) return NextResponse.json({
      ok:false,operation,error:normalized.error,details:normalized.details??null,
    },{status:normalized.status??400});
    const prediction=normalized.data;
    const now=new Date().toISOString();
    const p4=validateMihmP4IssuePacket(prediction.prediccion_explicita,now);
    if(!p4.ok)return NextResponse.json({ok:false,operation,error:'MIHM_P4_T0_ADMISSION_BLOCKED',
      blockers:p4.blockers}, {status:422});
    // A client cannot assign a different actor, an old issued time,
    // an intervention, a completed return, or an invented observation.
    if(candidate.perturbation_applied_at||candidate.ssp_observada||
       candidate.friccion_respuesta_campo||candidate.created_by||
       candidate.resultado_72h||candidate.resultado_7d||
       candidate.resultado_30d||candidate.resultado_90d||
       candidate.prediction_registered_at) {
      return NextResponse.json({ok:false,operation,error:'P4_CLIENT_CANNOT_SET_AUTHORITY_OR_OUTCOME_FIELDS'},
        {status:422});
    }
    const caseRecord=await root.service.from('sfi_cases')
      .select('id,status,scope').eq('id',prediction.case_id).maybeSingle();
    if(caseRecord.error)return NextResponse.json({
      ok:false,operation,error:'EXISTING_CASE_LOOKUP_FAILED',
    },{status:503});
    if(!caseRecord.data||!['OPEN','OBSERVING','ANALYZING','RESEARCHING'].includes(String(caseRecord.data.status))){
      return NextResponse.json({ok:false,operation,error:'ACTIVE_SFI_CASE_REQUIRED'},
        {status:422});
    }
    if(!prediction.hypothesis_id.startsWith('SFI-MIHM-')) {
      return NextResponse.json({ok:false,operation,error:'EXISTING_MIHM_HYPOTHESIS_REFERENCE_REQUIRED'},
        {status:422});
    }
    // Delegate rather than direct table INSERT. The service sets issued_at
    // from current server clock and created_by from the sovereign OAuth subject.
    const issued=await createPredictionEntry({
      ...prediction,created_by:root.credential.subjectId!,
      perturbation_applied_at:null,ssp_observada:null,friccion_respuesta_campo:null,
      operator_mode:'MIHM_P4_PROSPECTIVE_RESEARCH',
    });
    if(!issued.ok)return NextResponse.json({ok:false,operation,error:issued.error,
      details:issued.details??null},{status:issued.status??503});
    return NextResponse.json({ok:true,operation,entry:issued.data,
      source:'EXISTING_SFI_PREDICTION_SERVICE',
      sourceAvailabilityAttestedByGateway:false,
      providerResponseBytesIndependentlyReverified:false,
      prospectiveForecastRecorded:true,realWorldOutcomeObserved:false,
      scientificValidationEstablished:false,causalPropagationEstablished:false,
      institutionalReturnVerified:false,
      boundary:'Registration does not verify upstream source truth, outcome, homeostasis, causal propagation or empirical success.',
    },{status:201,headers:{'Cache-Control':'no-store'}});
  }

  if (operation === 'discovery_ingest_external_search') {
    if (body.confirmation !== true || !(root.credential.scopes ?? []).includes('execute')) {
      return NextResponse.json({ ok: false, operation, error: 'execute_scope_and_confirmation_required' }, { status: 403 });
    }
    // External observer reports a bounded selection of returned URLs from its own tool.
    // This does not turn user-supplied observations into server-observed search.
    const fixedQueries = [
      'research institute evidence authority return AI governance institutions',
      'friction homeostasis institutional model framework',
    ] as const;
    const index = body.query_index;
    const refs = body.result_urls;
    if ((index !== 0 && index !== 1) || !Array.isArray(refs) || refs.length < 3 || refs.length > 8
      || refs.some((x) => typeof x !== 'string' || x.length > 1000)) {
      return NextResponse.json({ ok: false, operation, error: 'fixed_query_index_and_three_to_eight_result_urls_required' }, { status: 400 });
    }
    let urls: URL[];
    try {
      urls = refs.map((x: string) => new URL(x));
      if (urls.some((u) => u.protocol !== 'https:' || Boolean(u.username || u.password)
        || u.hostname === 'localhost' || u.hostname.endsWith('.local'))) throw new Error('invalid_source_url');
      if (new Set(urls.map((u) => u.href)).size !== urls.length) throw new Error('duplicate_source_url');
    } catch {
      return NextResponse.json({ ok: false, operation, error: 'valid_unique_https_source_urls_required' }, { status: 400 });
    }
    const query = fixedQueries[index as 0 | 1];
    const own = urls.find((u) => u.hostname.replace(/^www\./, '').toLowerCase() === 'systemfriction.org');
    const retrieved = Boolean(own);
    const observedAt = new Date().toISOString();
    const observed = await persistDiscoveryObservation({
      mode: 'distinct_intent',
      query,
      intent: 'Externally reported bounded URL sample; provider result ranking and complete response not replayed by SFI backend',
      retrievalObservations: [{
        observationId: `EXT-SEARCH-${observedAt}-${index}`,
        source: {
          sourceId: 'EXTERNAL_AGENT_REPORTED:chatgpt_web_search',
          sourceUrl: null, publisher: 'ChatGPT external web search', platform: 'chatgpt_web_search',
          providerClass: 'SEARCH', independent: false,
        },
        observedAt,
        query,
        unbranded: true,
        retrieved,
        attributedEntityName: null,
        attributedDomain: retrieved ? 'systemfriction.org' : null,
        citedCanonicalUrl: own?.href ?? null,
        references: urls.map((url) => ({ url: url.href, independent: false })),
        status: 'AVAILABLE',
      }],
    }, root.credential.subjectId!);
    return NextResponse.json({ ok: true, operation, runId: observed.runId, replay: observed.replay,
      query, resultUrls: urls.length, sfiRetrievedInReportedSample: retrieved,
      provenanceType: 'EXTERNAL_AGENT_REPORTED_SEARCH_NOT_SERVER_REPLAYED',
      metricScope: 'REPORTED_BOUNDED_URL_SUBSET_ONLY', aiRetrievalTested: false,
      independentlyValidated: false, canonicalPromotionAllowed: false,
      boundary: 'The external tool observation is attributable, not independently reproduced by SFI. A reported absent domain is not global absence, AI recognition, validated identity, or RETURN.' },
      { headers: { 'Cache-Control': 'no-store' } });
  }

  if (operation === 'discovery_reconcile_gap') {
    if (body.confirmation !== true || !(root.credential.scopes ?? []).includes('governance:decide')) {
      return NextResponse.json({ ok: false, operation, error: 'governance_scope_and_confirmation_required' }, { status: 403 });
    }
    const proposalId = typeof body.proposal_id === 'string' ? body.proposal_id.trim() : '';
    const runIds = Array.isArray(body.run_ids) ? body.run_ids : [];
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuid.test(proposalId) || runIds.length < 1 || runIds.length > 8
      || runIds.some((id) => typeof id !== 'string' || !uuid.test(id))) {
      return NextResponse.json({ ok: false, operation, error: 'valid_proposal_and_one_to_eight_run_ids_required' }, { status: 400 });
    }
    const ids = [...new Set(runIds as string[])].sort();
    const proposalRead = await root.service.from('action_proposals').select('*').eq('id', proposalId).maybeSingle();
    if (proposalRead.error || !proposalRead.data) {
      return NextResponse.json({ ok: false, operation, error: 'discovery_proposal_not_found' }, { status: 404 });
    }
    const proposal = proposalRead.data;
    const expected = record(proposal.expected_field_delta);
    const declared = record(expected.payload);
    const key = declared.discoveryCandidateKey;
    const metric = declared.metric;
    const expectedMetric = key === 'DISCOVERY_UNBRANDED_RETRIEVAL_COVERAGE' ? 'UDR'
      : key === 'DISCOVERY_AI_RETRIEVAL_COVERAGE' ? 'ACR-R'
      : key === 'DISCOVERY_ENTITY_RECONSTRUCTION_COVERAGE' ? 'ERR' : null;
    if (proposal.status !== 'waiting_evidence' || proposal.proposal_type !== 'institutional_mutation_candidate'
      || declared.sourceOwner !== 'DiscoveryMesh' || metric !== expectedMetric || !expectedMetric) {
      return NextResponse.json({ ok: false, operation, error: 'not_eligible_discovery_evidence_proposal' }, { status: 409 });
    }
    const runRead = await root.service.from('sfi_discovery_query_runs')
      .select('id,query_id,availability,metrics,provenance,observed_at')
      .in('id', ids).limit(8);
    if (runRead.error || (runRead.data ?? []).length !== ids.length) {
      return NextResponse.json({ ok: false, operation, error: 'exact_discovery_run_readback_required' }, { status: 409 });
    }
    const seenQueries = new Set<string>();
    const evaluated = (runRead.data ?? []).map((run) => {
      const observations = Array.isArray(run.provenance) ? run.provenance.map(record) : [];
      const eligible = observations.some((obs) => {
        const source = record(obs.source);
        if (obs.status !== 'AVAILABLE' || (obs.retrieved !== true && obs.retrieved !== false)) return false;
        if (metric === 'UDR') return source.providerClass === 'SEARCH' && obs.unbranded === true;
        if (metric === 'ACR-R') return source.providerClass === 'AI'
          && obs.testModality !== 'MODEL_MEMORY_NO_WEB'
          && typeof obs.providerResponseText === 'string' && obs.providerResponseText.trim().length > 0;
        return typeof record(obs.reconstructedFields).name === 'string'
          && typeof record(obs.reconstructedFields).domain === 'string'
          && typeof record(obs.reconstructedFields).entityId === 'string';
      });
      // Legacy Discovery rows retained calculated metrics but not all raw
      // retrieval flags in provenance. Recover only a canonically persisted,
      // eligible SEARCH UDR denominator; never infer this from source count.
      const udr = record(record(run.metrics).UDR);
      const legacySearch = metric === 'UDR' && run.availability === 'AVAILABLE'
        && udr.availability === 'AVAILABLE'
        && typeof udr.denominator === 'number' && udr.denominator > 0
        && typeof udr.numerator === 'number' && udr.numerator >= 0
        && udr.numerator <= udr.denominator
        && observations.some((obs) => obs.status === 'AVAILABLE'
          && record(obs.source).providerClass === 'SEARCH');
      const eligibleMeasured = eligible || legacySearch;
      const queryId = String(run.query_id ?? '');
      const unique = !seenQueries.has(queryId);
      if (eligibleMeasured && unique) seenQueries.add(queryId);
      return { id: String(run.id), availability: run.availability,
        eligible: eligibleMeasured && unique, legacyMetricReadback: legacySearch && !eligible,
        metricNumerator: legacySearch ? udr.numerator : null,
        metricDenominator: legacySearch ? udr.denominator : null,
        queryId, observedAt: run.observed_at };
    });
    const eligibleRunIds = evaluated.filter((run) => run.eligible).map((run) => run.id);
    const missingEvidence = metric === 'UDR' && eligibleRunIds.length < 2 ? 'NEEDS_MORE_DISTINCT_UNBRANDED_SEARCH_QUERIES'
      : metric === 'ACR-R' && !eligibleRunIds.length ? 'NEEDS_ELIGIBLE_AI_WEB_RETRIEVAL_OBSERVATION'
      : metric === 'ERR' && !eligibleRunIds.length ? 'NEEDS_COMPLETE_EXTERNAL_NAME_DOMAIN_ENTITY_ID_RECONSTRUCTION'
      : null;
    const previousPatch = record(record(proposal.outcome).payloadPatch);
    const priorReconciliation = record(previousPatch.discoveryEvidenceReconciliation);
    const previousIds = Array.isArray(priorReconciliation.reviewedRunIds)
      ? priorReconciliation.reviewedRunIds.filter((x): x is string => typeof x === 'string').sort() : [];
    if (priorReconciliation.algorithmVersion === 'DISCOVERY-EVIDENCE-RECONCILIATION-2'
      && JSON.stringify(previousIds) === JSON.stringify(ids)) {
      return NextResponse.json({ ok: true, operation, state: 'ALREADY_RECONCILED',
        proposalId, metric, reviewedRuns: ids.length,
        eligibleRuns: eligibleRunIds.length, missingEvidence,
        proposalStatus: 'waiting_evidence' }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const event = await appendOperationalEvent({
      eventName: 'discovery.proposal.evidence_reconciled', actorId: root.credential.subjectId!,
      confidence: 1,
      payload: { proposalId, metric, reviewedRunIds: ids, eligibleRunIds,
        missingEvidence, statusUnchanged: true, noRecognizedExternalIdentityClaim: true },
      lineage: [proposalId, ...ids],
    });
    if (!event.ok) return NextResponse.json({ ok: false, operation, error: 'reconciliation_event_write_failed' }, { status: 503 });
    const assessment = { algorithmVersion: 'DISCOVERY-EVIDENCE-RECONCILIATION-2', metric, reviewedRunIds: ids, eligibleRunIds, observations: evaluated,
      missingEvidence, assessedAt: new Date().toISOString(), evidenceEventId: event.data.id,
      conclusion: 'EVIDENCE_REVIEWED_NOT_GAP_CLOSED', aiMemoryIsNotWebRetrieval: true,
      canonicalPromotionAllowed: false };
    const statusResult = await updateActionProposalStatus({
      proposalId, status: 'waiting_evidence', actorId: root.credential.subjectId!,
      isRoot: true, proposalType: 'institutional_mutation_candidate', expectedStatuses: ['waiting_evidence'],
      eventId: event.data.id, payloadPatch: {
        ...previousPatch, discoveryEvidenceReconciliation: assessment,
        executionAllowed: false, institutionalAdoptionRecorded: false, canonicalPromotionAllowed: false,
      },
    });
    return NextResponse.json({ ok: statusResult.ok, operation, proposalId, metric,
      reviewedRuns: ids.length, eligibleRuns: eligibleRunIds.length,
      missingEvidence, proposalStatus: statusResult.ok ? 'waiting_evidence' : 'UNCONFIRMED',
      evidenceEventId: event.data.id,
      error: statusResult.ok ? null : statusResult.error,
      boundary: 'Evidence review does not claim recognition, authorize material execution, close the gap or promote canon.' },
      { status: statusResult.ok ? 200 : 409, headers: { 'Cache-Control': 'no-store' } });
  }

  if (operation === 'discovery_gemini_grounded_probe') {
    if (body.confirmation !== true || !(root.credential.scopes ?? []).includes('execute')
      || body.approved_one_shot_web_search !== true) {
      return NextResponse.json({ ok: false, operation, error: 'execute_scope_and_explicit_one_shot_grounding_consent_required' }, { status: 403 });
    }
    try {
      const observed = await runBoundedGeminiGroundedDiscoveryProbe();
      return NextResponse.json({ ...observed, operation, testModality: 'WEB_SEARCH',
        scheduled: false, providerFallbackAllowed: false,
        independentlyVerified: false, institutionalAdoptionRecorded: false,
        canonicalPromotionAllowed: false }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      return NextResponse.json({ ok: false, operation, error: 'gemini_grounded_probe_failed',
        details: error instanceof Error ? error.message : String(error) },
        { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
  }

  if (operation === 'studio_sfi_genealogy_import') {
    if (body.confirmation !== true || !(root.credential.scopes ?? []).includes('execute')) {
      return NextResponse.json({ok:false,operation,error:'execute_scope_and_confirmation_required'},{status:403});
    }
    try {
      const result=await importSfiStudioGenealogy(root.credential.subjectId!,body.entries);
      return NextResponse.json({ok:result.ok,operation,result,
        noOriginalFilesUploaded:true,canonicalPromotionAllowed:false,
        publicationExecuted:false}, {status:result.ok?200:409,
        headers:{'Cache-Control':'no-store'}});
    } catch(error) {
      return NextResponse.json({ok:false,operation,error:'genealogy_import_failed',
        details:error instanceof Error?error.message:String(error)}, {status:503});
    }
  }

  if (operation === 'studio_sfi_campaign_bootstrap' || operation === 'studio_sfi_campaign_review') {
    const scopes = root.credential.scopes ?? [];
    if (!scopes.includes('execute') || body.confirmation !== true) {
      return NextResponse.json({ ok: false, operation, error: 'execute_scope_and_confirmation_required' }, { status: 403 });
    }
    try {
      const result = operation === 'studio_sfi_campaign_bootstrap'
        ? await bootstrapSfiStudioPilot(root.credential.subjectId!)
        : await reviewSfiStudioPilotMorning();
      return NextResponse.json({ ok: true, operation, result, publishAllowed: false,
        outboundExecuted: false, epistemicBoundary: 'Studio project and daily evidence review only; no platform connection, material marketing execution or institutional adoption established.' },
      { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      return NextResponse.json({ ok: false, operation, error: 'studio_campaign_operation_failed',
        details: error instanceof Error ? error.message : String(error) }, {status:503});
    }
  }

  if (operation === 'discovery_gemini_memory_probe') {
    if (body.confirmation !== true || !(root.credential.scopes ?? []).includes('execute')) {
      return NextResponse.json({ ok: false, operation, error: 'execute_scope_and_confirmation_required' }, { status: 403 });
    }
    const probeIndex = body.probe_index;
    if (probeIndex !== 0 && probeIndex !== 1) {
      return NextResponse.json({ ok: false, operation, error: 'probe_index_must_be_0_or_1' }, { status: 400 });
    }
    try {
      const observed = await runBoundedGeminiDiscoveryProbe(probeIndex);
      return NextResponse.json({ ...observed, operation, externalActionsPerformed: false,
        providerFallbackAllowed: false, browserRetrievalTested: false, modelMemoryOnly: true,
        institutionalAdoptionRecorded: false, canonicalPromotionAllowed: false },
        { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      return NextResponse.json({ ok: false, operation, error: 'gemini_memory_probe_failed',
        details: error instanceof Error ? error.message : String(error) },
        { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
  }

  if (operation === 'discovery_read_runs_bounded') {
    const runIds = Array.isArray(body.run_ids) ? body.run_ids : [];
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (runIds.length < 1 || runIds.length > 8 || runIds.some((id) => typeof id !== 'string' || !uuid.test(id))) {
      return NextResponse.json({ ok: false, operation, error: 'one_to_eight_valid_run_ids_required' }, { status: 400 });
    }
    const uniqueIds = [...new Set(runIds as string[])];
    const read = await root.service.from('sfi_discovery_query_runs')
      .select('id,run_id,query_id,availability,metrics,provenance,observed_at,epistemic_boundary,sfi_discovery_queries(query_text,mode,intent,unbranded)')
      .in('id', uniqueIds).limit(8);
    if (read.error) return NextResponse.json({ ok: false, operation, error: 'discovery_readback_failed' }, { status: 503 });
    const byId = new Map((read.data ?? []).map((row) => [String(row.id), row]));
    return NextResponse.json({ ok: true, operation, requested: uniqueIds.length,
      found: byId.size, missingRunIds: uniqueIds.filter((id) => !byId.has(id)),
      runs: uniqueIds.map((id) => byId.get(id)).filter(Boolean),
      boundary: 'Persisted observations and their original measurements only. No AI retrieval or identity reconstruction inferred from SEARCH class results.' },
      { headers: { 'Cache-Control': 'no-store' } });
  }

  if (operation === 'discovery_observe_bounded') {
    if (body.confirmation !== true || !(root.credential.scopes ?? []).includes('execute')) {
      return NextResponse.json({ ok: false, operation, error: 'execute_scope_and_confirmation_required' }, { status: 403 });
    }
    const queryIndex = body.query_index;
    if (typeof queryIndex !== 'number' || !Number.isInteger(queryIndex) || queryIndex < 0 || queryIndex > 3) {
      return NextResponse.json({ ok: false, operation, error: 'query_index_must_be_0_to_3' }, { status: 400 });
    }
    try {
      const observation = await runAutomaticDiscoveryObservationCycle(new Date(), { zeroKeyOnly: true, queryIndex });
      return NextResponse.json({ ok: Boolean(observation.runId), operation, observation,
        providerClass: 'SEARCH', aiRetrievalTested: false, providerSpendExpansion: false,
        externalPublicationPerformed: false, canonicalPromotionAllowed: false,
        boundary: 'GDELT source indexing is not generative AI retrieval or external institutional recognition. UNAVAILABLE is not a measured zero.' },
        { status: observation.runId ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      return NextResponse.json({ ok: false, operation, error: 'discovery_observation_failed',
        details: error instanceof Error ? error.message : 'unknown' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
  }

  if (operation === 'reconcile_obsolete_remediation') {
    if (body.confirmation !== true || !(root.credential.scopes ?? []).includes('governance:decide')) {
      return NextResponse.json({ ok: false, operation, error: 'governance_scope_and_confirmation_required' }, { status: 403 });
    }
    const proposalId = typeof body.proposal_id === 'string' ? body.proposal_id.trim() : '';
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(proposalId)) {
      return NextResponse.json({ ok: false, operation, error: 'valid_proposal_id_required' }, { status: 400 });
    }
    const childRead = await root.service.from('action_proposals').select('*').eq('id', proposalId).maybeSingle();
    if (childRead.error || !childRead.data) return NextResponse.json({ ok: false, operation, error: 'remediation_not_found' }, { status: 404 });
    const child = childRead.data;
    const expected = record(child.expected_field_delta);
    const payload = record(expected.payload);
    const requested = record(payload.requested_action);
    const parentId = typeof payload.parentProposalId === 'string' ? payload.parentProposalId : '';
    if (child.status !== 'queued' || child.proposal_type !== 'execution_capability_remediation'
      || payload.source !== 'self_healing_bootstrap_v1' || requested.type !== 'build_execution_adapter'
      || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(parentId) || parentId === proposalId) {
      return NextResponse.json({ ok: false, operation, error: 'not_eligible_remediation' }, { status: 409 });
    }
    const parentRead = await root.service.from('action_proposals').select('*').eq('id', parentId).maybeSingle();
    if (parentRead.error || !parentRead.data) return NextResponse.json({ ok: false, operation, error: 'parent_not_found' }, { status: 409 });
    const parent = parentRead.data;
    const parentPatch = record(record(parent.outcome).payloadPatch);
    const parentReturnId = typeof parentPatch.returnEventId === 'string' ? parentPatch.returnEventId : '';
    const parentCompleted = parent.status === 'accepted' && parentPatch.outcomeRecorded === true && Boolean(parentReturnId);
    const parentSuperseded = parent.status === 'superseded'
      && parentPatch.executionState === 'SUPERSEDED_PARENT_RESOLVED'
      && typeof parentPatch.resolvedByParentId === 'string';
    if (!parentCompleted && !parentSuperseded) {
      return NextResponse.json({ ok: false, operation, error: 'parent_not_proven_resolved', parentStatus: parent.status }, { status: 409 });
    }
    if (parentCompleted) {
      const receipt = await root.service.from('epistemic_events')
        .select('event_id,event_name,epistemic_class,payload,lineage')
        .eq('event_id', parentReturnId).maybeSingle();
      const event = receipt.data;
      const data = record(event?.payload);
      const lineage = Array.isArray(event?.lineage) ? event.lineage : [];
      if (receipt.error || !event || event.epistemic_class !== 'observed'
        || !String(event.event_name ?? '').endsWith('_RETURN_RECORDED')
        || (data.proposalId !== parentId && !lineage.includes(parentId))) {
        return NextResponse.json({ ok: false, operation, error: 'parent_observed_return_unverified' }, { status: 409 });
      }
    }
    const oldPatch = record(record(child.outcome).payloadPatch);
    const evidenceRefs = [parentId, ...(parentReturnId ? [parentReturnId] : [])];
    const event = await appendOperationalEvent({
      eventName: 'execution.remediation.obsolete_superseded', actorId: root.credential.subjectId!, confidence: 1,
      payload: { proposalId, parentProposalId: parentId, previousStatus: 'queued', nextStatus: 'superseded',
        resolution: 'PARENT_ALREADY_RESOLVED', externalExecutionObserved: false, canonicalPromotionAllowed: false },
      lineage: [proposalId, ...evidenceRefs],
    });
    if (!event.ok) return NextResponse.json({ ok: false, operation, error: 'supersession_event_failed' }, { status: 503 });
    const result = await updateActionProposalStatus({ proposalId, status: 'superseded',
      actorId: root.credential.subjectId!, isRoot: true,
      proposalType: 'execution_capability_remediation', expectedStatuses: ['queued'], eventId: event.data.id,
      payloadPatch: { ...oldPatch, executionState: 'SUPERSEDED_PARENT_RESOLVED',
        resolvedByParentId: parentId, resolutionEvidenceRefs: evidenceRefs, executionAllowed: false,
        institutionalAdoptionRecorded: false, canonicalPromotionAllowed: false,
        actualExternalExecutionPerformed: false },
    });
    return NextResponse.json({ ok: result.ok, operation,
      proposalId, parentId, state: result.ok ? 'superseded' : 'UNCONFIRMED',
      externalExecutionObserved: false, evidenceRefs,
      error: result.ok ? null : result.error }, { status: result.ok ? 200 : 409 });
  }

  if (operation === 'reports') {
    const limit = clampReportLimit(body.limit);
    try {
      const rawInbox = await readRootReportInbox(limit);
      const inbox = {
        ...rawInbox,
        items: rawInbox.items.map((item) => ({
          ...item,
          body: humanReportText(item.body),
        })),
      };
      const health = await readRootReportHealth(rawInbox);
      return NextResponse.json({
        ok: true,
        operation,
        inbox,
        health,
        interpretation: {
          humanLanguageReady: true,
          epistemicBoundary: 'Reports are auditable representations of persisted observations/derivations. Their presence does not by itself establish truth, authorize action, or fabricate RETURN.',
        },
      }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      return NextResponse.json({
        ok: false,
        error: 'root_reports_read_failed',
        details: error instanceof Error ? error.message : String(error),
      }, { status: 503 });
    }
  }

  if (operation === 'gemini_canary' || operation === 'reports_recover_blocked') {
    const scopes = root.credential.scopes ?? [];
    if (!scopes.includes('execute') || body.confirmation !== true) {
      return NextResponse.json({ ok: false, operation, error: 'execute_scope_and_confirmation_required' }, { status: 403 });
    }
    try {
      if (operation === 'gemini_canary') {
        const test = await probeLlmProviders({ provider: 'gemini' });
        return NextResponse.json({ ok: test.ok, operation, checkedAt: test.checkedAt,
          results: test.results, noProviderEscalation: true },
          { status: test.ok ? 200 : 207, headers: { 'Cache-Control': 'no-store' } });
      }
      const result = await recoverBlockedScheduledWorldReports({ limit: 2 });
      return NextResponse.json({ ...result, operation, initiatedBy: 'SOVEREIGN_ROOT_OAUTH',
        generalEgressAuthorityExpanded: false, externalMaterialActionPerformed: false },
        { status: result.ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      return NextResponse.json({ ok: false, operation, error: 'bounded_recovery_failed',
        details: error instanceof Error ? error.message : String(error) }, { status: 503 });
    }
  }

  if (operation === 'reports_run_restricted') {
    const scopes=root.credential.scopes??[];
    if (!scopes.includes('execute') || body.confirmation !== true) {
      return NextResponse.json({ok:false,operation,error:'execute_scope_and_explicit_confirmation_required'}, {status:403});
    }
    if (process.env.SFI_RESTRICTED_REPORTS_MODE !== 'enabled') {
      return NextResponse.json({ok:false,operation,error:'restricted_report_lane_not_enabled'}, {status:409});
    }
    try {
      const result=await runRestrictedEvidenceReports();
      return NextResponse.json({ ...result, operation, initiatedBy:'SOVEREIGN_ROOT_OAUTH', bypassedGeneralEgress:false }, {
        status:result.ok?200:207, headers:{'Cache-Control':'no-store'},
      });
    } catch {
      return NextResponse.json({ok:false,operation,error:'restricted_report_execution_failed'}, {status:503});
    }
  }

  if (operation === 'accounts_list') {
    const result = await listInstitutionalAccounts(root.service);
    return NextResponse.json(result, {
      status: result.ok ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  if (operation === 'data_plane_status') {
    try {
      const status = await readDataPlaneReconciliationStatus();
      return NextResponse.json({ ok: true, operation, status }, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
      return NextResponse.json({ ok: false, operation, error: 'data_plane_status_unavailable' }, { status: 503 });
    }
  }

  if (operation === 'data_plane_copy_verified') {
    return NextResponse.json({ ok: false, operation, attempted: false,
      code: 'SFI_REPLICATION_RETIRED_BY_FOUNDER',
      message: 'Cross-provider data copying and replay are disabled. Observe resource costs instead.' },
      { status: 410, headers: { 'Cache-Control': 'no-store' } });
  }


  if (operation === 'data_plane_emergency') {
    return NextResponse.json({ ok: false, operation, attempted: false,
      code: 'SFI_REPLICATION_RETIRED_BY_FOUNDER',
      message: 'Cross-provider data copying and replay are disabled. Observe resource costs instead.' },
      { status: 410, headers: { 'Cache-Control': 'no-store' } });
  }


  if (operation === 'account_recover') {
    const result = await recoverInstitutionalAccount(root.service, root.credential.subjectId!, body.recovery);
    return NextResponse.json(result, {
      status: result.ok ? 200 : result.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  if (operation === 'account_invite') {
    const result = await inviteInstitutionalAccount(root.service, root.credential.subjectId!, body.invitation);
    return NextResponse.json(result, {
      status: result.ok ? 200 : result.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  return NextResponse.json({
    ok: false,
    error: 'unsupported_root_operation',
    allowed: ['capabilities','capability_map','pending','sfi_state','proposals_record_observed_outcome','predictions_list','predictions_create_p4','reports','reports_run_restricted','accounts_list','account_invite','account_recover','data_plane_status','data_plane_emergency','data_plane_copy_verified'],
  }, { status: 400 });
}
