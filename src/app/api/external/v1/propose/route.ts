import { NextResponse } from 'next/server';
import { createActionProposal } from '@/lib/operational/common';
import { isRootDecisionClass, type SfiRootDecisionClass } from '@/lib/governance/rootDecisionBoundary';
import { authorizeExternalRequest, externalActor } from '@/lib/sfi/externalAuth';

export const dynamic = 'force-dynamic';

function normalizeDecisionClass(value: unknown): SfiRootDecisionClass | null {
  const candidate = typeof value === 'string'
    ? value.trim().toUpperCase().replaceAll('-', '_').replaceAll(' ', '_')
    : '';
  return isRootDecisionClass(candidate) ? candidate : null;
}

export async function POST(req: Request) {
  const auth = authorizeExternalRequest(req, 'propose');
  const cred = auth.credential;
  if (!cred) {
    return NextResponse.json({ ok: false, error: 'unauthorized', auth: { tokenPresent: auth.tokenPresent, registryConfigured: auth.registryConfigured, scopeAllowed: auth.scopeAllowed, acceptedHeaders: ['Authorization: Bearer <token>', 'X-SFI-Token: <token>'] } }, { status: 401 });
  }
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const title = String(body.title || '').trim();
  const summary = String(body.summary || '').trim();
  if (!title || !summary) return NextResponse.json({ ok: false, error: 'title_and_summary_required' }, { status: 400 });

  const actor = externalActor(cred);
  const rootDecisionClass = normalizeDecisionClass(body.rootDecisionClass ?? body.decisionClass);
  const humanApprovalRequired = Boolean(rootDecisionClass);
  const result = await createActionProposal({
    proposalType: 'external_agent_proposal',
    actorId: actor,
    title,
    objective: summary,
    status: 'proposed',
    payload: {
      summary,
      requested_action: body.action ?? null,
      source: 'external_agent_gateway',
      credential_label: cred.label || 'external-agent',
      submitted_at: new Date().toISOString(),
      human_approval_required: humanApprovalRequired,
      rootDecisionClass,
      decisionClass: rootDecisionClass ?? 'OPERATIONAL_WORK',
      authorityMode: rootDecisionClass ? 'ROOT_DECISION_REQUIRED' : 'CONTINUE_WITHIN_EXISTING_AUTHORITY',
      communicationBoundary: 'A proposal is operational work by default. Only explicit institutional change, material capability implementation/change, or learning promotion becomes a sovereign ROOT decision.',
    },
  });
  if (!result.ok) return NextResponse.json(result, { status: 500 });

  return NextResponse.json({
    ok: true,
    data: result.data,
    decisionClass: rootDecisionClass ?? 'OPERATIONAL_WORK',
    rootDecisionRequired: humanApprovalRequired,
    message: rootDecisionClass
      ? 'Cambio institucional registrado para decisión ROOT. La decisión no ejecuta ni canoniza por sí sola.'
      : 'Trabajo operativo registrado. SFI puede continuar dentro de la autoridad existente y debe exponer progreso, evidencia y recibos sin pedir permiso rutinario.',
  }, { status: 201 });
}
