import { NextResponse } from 'next/server';
import { z } from 'zod';

import { humanReportText } from '@/lib/reports/humanReport';
import { readRootReportHealth, readRootReportInbox } from '@/lib/reports/rootReportInbox';
import { authorizeExternalRequest, externalAuthError } from '@/lib/sfi/externalAuth';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

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
  const invitation = await service.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/reset?mode=invite`,
    data: {
      display_name: displayName,
      sfi_access_class: accessClass,
      sfi_invitation: true,
    },
  });

  if (invitation.error || !invitation.data.user) {
    const inviteError = invitation.error?.message ?? 'invite_user_missing';
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
      user_id: invitation.data.user.id,
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
    },
  });

  return {
    ok: true as const,
    status: 200,
    account: {
      grantId,
      userId: invitation.data.user.id,
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
      boundary: 'root:operate adds founder-only ROOT administration. It does not replace governance:decide, bypass capability grants, create arbitrary URL access, mint canon, or grant ROOT to another account.',
    }, { headers: { 'Cache-Control': 'no-store' } });
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
    allowed: ['capabilities', 'reports', 'accounts_list', 'account_invite'],
  }, { status: 400 });
}
