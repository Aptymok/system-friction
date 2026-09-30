import { NextResponse } from 'next/server';
import { z } from 'zod';

import { humanReportText } from '@/lib/reports/humanReport';
import { readRootReportHealth, readRootReportInbox } from '@/lib/reports/rootReportInbox';
import { authorizeExternalRequest, externalAuthError } from '@/lib/sfi/externalAuth';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { deliverInstitutionalInvitation } from '@/lib/auth/institutionalInvitationDelivery';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const REQUIRED_SCOPE = 'root:operate' as const;

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
  const safe = async (table:string, select:string, limit=80) => {
    const r=await service.from(table).select(select).order('created_at',{ascending:false}).limit(limit);
    return {available:!r.error, rows:r.data??[], error:r.error?.message??null};
  };
  const [proposals,founderRules,hypotheses,outcomes,learning,cases,health,incidents,commercialProposals,commercialOpportunities]=await Promise.all([
    safe('action_proposals','id,proposal_type,title,description,status,expected_field_delta,proportionality_check,outcome,created_at',120),
    safe('sfi_cognitive_twin_decisions','id,decision_id,situation,rejected_condition,correct_state,general_rule,required_evidence,evidence_refs,status,decision_kind,created_at,updated_at',100),
    safe('world_hypotheses','id,phenomenon_key,statement,status,current_confidence,validation_starts_at,validation_ends_at,created_at',80),
    safe('world_hypothesis_outcomes','id,hypothesis_id,classification,observed_outcome,evidence_ids,evaluated_at,created_at',80),
    safe('world_learning_events','id,hypothesis_id,outcome_id,retained_assumptions,rejected_assumptions,missing_variables,graph_adjustments,confidence_before,confidence_after,created_at',80),
    safe('sfi_cases','id,subject,scope,status,uncertainty,governance,created_at,updated_at,closed_at',80),
    safe('sfi_capability_health_checks','*',80),
    safe('sfi_institutional_incidents','*',80),
    safe('commercial_proposals','*',80),
    safe('commercial_opportunities','*',80),
  ]);
  return {generatedAt:new Date().toISOString(),proposals,founderRules,world:{hypotheses,outcomes,learning},cases,health,incidents,commercial:{proposals:commercialProposals,opportunities:commercialOpportunities},boundaries:{observationDoesNotEqualEvidence:true,simulationDoesNotEqualReturn:true,reportDoesNotEqualAuthority:true,rootDoesNotRewriteHistory:true}};
}

async function readRootPending(service: ReturnType<typeof createServiceSupabaseClient>) {
 const state=await readRootControlPlane(service);
 const pendingProposals=(state.proposals.rows as unknown as Record<string,unknown>[]).filter(r=>['proposed','conflicted','pending'].includes(String(r.status??'').toLowerCase()));
 const pendingRules=(state.founderRules.rows as unknown as Record<string,unknown>[]).filter(r=>String(r.status??'').toUpperCase()==='CANDIDATE');
 return {generatedAt:state.generatedAt,proposals:pendingProposals,founderRules:pendingRules,nextStep:'Use governance:decide for sovereign proposal decisions; operational work remains outside the sovereign queue.'};
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
        { id: 'accounts_list', effect: 'READ', description: 'List ROOT-administered institutional account access grants.' },
        { id: 'account_invite', effect: 'EXTERNAL_REVERSIBLE', description: 'Send one institutional account invitation without granting sovereign authority.' },
        { id: 'pending', effect: 'READ', description: 'Read sovereign pending proposals and founder-rule candidates with next-step boundary.' },
        { id: 'sfi_state', effect: 'READ', description: 'Read one bounded cross-institution control-plane projection: WORLD hypotheses/outcomes/learning, Cases, health, incidents and commercial state.' },
        { id: 'capability_map', effect: 'READ', description: 'Describe the canonical surfaces ROOT can orchestrate without duplicating their authority.' },
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
        pending: 'root:operate read + governance:decide mutation',
        institution: 'root:operate sfi_state + observe/read surfaces',
        registryPublications: 'canonical publication/registry services; mutation adapter pending',
        reports: 'root:operate reports',
        methodLab: 'operateSfiLab',
        agents: 'cognitive-runtime + invoke_cognitive_capability',
        health: 'root:operate sfi_state health + canonical QA/CI surfaces',
        commercial: 'root:operate sfi_state commercial + commercial service',
        studio: 'separate owner-bound Studio MCP',
        jr: 'RETURN/contrast/learning projection; dedicated JR mutation contract pending',
      },
      boundary: 'root:operate adds founder-only ROOT administration. It does not replace governance:decide, bypass capability grants, create arbitrary URL access, mint canon, or grant ROOT to another account.',
    }, { headers: { 'Cache-Control': 'no-store' } });
  }

  if (operation === 'capability_map') {
    return NextResponse.json({ok:true,operation,controlPlane:{
      accounts:{read:'root:operate/accounts_list',invite:'root:operate/account_invite'},
      pending:{read:'root:operate/pending',decide:'governance:decide'},
      institution:{read:'root:operate/sfi_state'},
      reports:{read:'root:operate/reports'},
      lab:{delegate:'operateSfiLab'},
      agents:{delegate:'cognitive-runtime/invoke_cognitive_capability'},
      studio:{delegate:'SFI Studio MCP'},
      registry:{status:'READ_AVAILABLE_MUTATION_ADAPTER_PENDING'},
      health:{read:'root:operate/sfi_state.health',execution:'CANONICAL_QA_ADAPTER_PENDING'},
      commercial:{read:'root:operate/sfi_state.commercial'},
      jr:{readSources:['proposal RETURN','world outcomes','world learning events'],status:'DEDICATED_JR_CONTRACT_PENDING'}
    }},{headers:{'Cache-Control':'no-store'}});
  }

  if (operation === 'pending') {
    return NextResponse.json({ok:true,operation,pending:await readRootPending(root.service)},{headers:{'Cache-Control':'no-store'}});
  }

  if (operation === 'sfi_state') {
    return NextResponse.json({ok:true,operation,state:await readRootControlPlane(root.service)},{headers:{'Cache-Control':'no-store'}});
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

  if (operation === 'accounts_list') {
    const result = await listInstitutionalAccounts(root.service);
    return NextResponse.json(result, {
      status: result.ok ? 200 : 503,
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
    allowed: ['capabilities','capability_map','pending','sfi_state','reports','accounts_list','account_invite'],
  }, { status: 400 });
}
