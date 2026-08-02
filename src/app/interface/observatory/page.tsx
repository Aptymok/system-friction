import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import UserAttractorFieldExperience from '@/components/interface/UserAttractorFieldExperience';
import { readPublicObservatoryState } from '@/lib/observatory/public/readPublicObservatoryState';
import { createServerSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mi observatorio · Atractor y trayectoria · SFI',
  description: 'Observatorio privado del atractor declarado, evidencia, perturbaciones y trayectoria longitudinal.',
  alternates: { canonical: '/interface/observatory' },
  robots: { index: false, follow: false },
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function isEntitlementActive(status: string | null, validUntil: string | null) {
  if (status !== 'active' && status !== 'trialing') return false;
  if (!validUntil) return true;
  return new Date(validUntil).getTime() > Date.now();
}

export default async function UserObservatoryPage() {
  const supabase = await createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect('/login?next=%2Finterface%2Fobservatory');

  const { data: activeWindow } = await supabase
    .from('field_participant_windows')
    .select('id')
    .eq('owner_id', user.id)
    .eq('status', 'ACTIVE')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (activeWindow) redirect('/field/participant');

  const { data: attractor } = await supabase
    .from('sfi_user_attractors')
    .select('*')
    .eq('owner_id', user.id)
    .eq('status', 'DECLARED')
    .order('declared_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!attractor) redirect('/interface');

  const [
    caseQuery,
    entitlementQuery,
    nodesQuery,
    edgesQuery,
    assessmentsQuery,
    nextReturnQuery,
    worldState,
  ] = await Promise.all([
    supabase.from('field_cases').select('id,title,status,created_at').eq('id', attractor.case_id).eq('owner_id', user.id).single(),
    supabase.from('sfi_user_entitlements').select('tier,status,valid_until').eq('user_id', user.id).maybeSingle(),
    supabase.from('sfi_user_graph_nodes').select('id,node_type,label,summary,weight,is_central,metadata,observed_at').eq('owner_id', user.id).eq('case_id', attractor.case_id).order('observed_at', { ascending: true }).limit(120),
    supabase.from('sfi_user_graph_edges').select('id,source_node_id,target_node_id,relation,strength,direction,curvature').eq('owner_id', user.id).eq('case_id', attractor.case_id).order('created_at', { ascending: true }).limit(240),
    supabase.from('sfi_user_evidence_assessments').select('id,status,reason,next_action,confidence,created_at').eq('owner_id', user.id).eq('case_id', attractor.case_id).order('created_at', { ascending: false }).limit(8),
    supabase.from('field_returns').select('expected_at').eq('owner_id', user.id).eq('case_id', attractor.case_id).is('returned_at', null).order('expected_at', { ascending: true }).limit(1).maybeSingle(),
    readPublicObservatoryState().catch(() => null),
  ]);

  if (!caseQuery.data) redirect('/interface');

  const entitlementRow = entitlementQuery.data;
  const entitlement = {
    active: isEntitlementActive(entitlementRow?.status ?? null, entitlementRow?.valid_until ?? null),
    tier: entitlementRow?.tier ?? 'preview',
    status: entitlementRow?.status ?? 'inactive',
  };
  const perturbation = record(attractor.perturbation);
  const nodes = (nodesQuery.data ?? []).map((node) => ({
    id: node.id,
    node_type: node.node_type as 'attractor' | 'mark' | 'event' | 'evidence' | 'intervention' | 'return' | 'learning',
    label: node.label,
    summary: node.summary,
    weight: Number(node.weight ?? 0.5),
    is_central: Boolean(node.is_central),
    metadata: record(node.metadata),
    observed_at: node.observed_at,
  }));
  const edges = (edgesQuery.data ?? []).map((edge) => ({
    id: edge.id,
    source_node_id: edge.source_node_id,
    target_node_id: edge.target_node_id,
    relation: edge.relation,
    strength: Number(edge.strength ?? 0.5),
    direction: edge.direction,
    curvature: Number(edge.curvature ?? 0),
  }));

  return (
    <UserAttractorFieldExperience
      userEmail={user.email ?? null}
      entitlement={entitlement}
      caseData={{
        id: caseQuery.data.id,
        title: caseQuery.data.title,
        status: caseQuery.data.status,
        createdAt: caseQuery.data.created_at,
      }}
      attractor={{
        id: attractor.id,
        code: attractor.code,
        label: attractor.label,
        summary: attractor.summary,
        objective: attractor.objective,
        direction: attractor.direction,
        confidence: Number(attractor.confidence ?? 0),
        perturbation: {
          title: typeof perturbation.title === 'string' ? perturbation.title : undefined,
          instruction: typeof perturbation.instruction === 'string' ? perturbation.instruction : undefined,
          verificationWindow: typeof perturbation.verificationWindow === 'string' ? perturbation.verificationWindow : undefined,
          reversible: perturbation.reversible === true,
          interventionId: typeof perturbation.interventionId === 'string' ? perturbation.interventionId : null,
        },
      }}
      graph={{ nodes, edges }}
      evidence={(assessmentsQuery.data ?? []).map((item) => ({
        id: item.id,
        status: item.status,
        reason: item.reason,
        next_action: item.next_action,
        confidence: Number(item.confidence ?? 0),
        created_at: item.created_at,
      }))}
      world={{
        regime: worldState?.wsv.regime ?? 'MISSING',
        friction: worldState?.wsv.globalIndex ?? null,
        tension: worldState?.wsv.tension ?? null,
        confidence: worldState?.dailyReading.confidence ?? null,
      }}
      nextReturnAt={nextReturnQuery.data?.expected_at ?? null}
    />
  );
}
