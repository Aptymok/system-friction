import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import UserInterfaceExperience from '@/components/interface/UserInterfaceExperience';
import type { PhenotypeProfile } from '@/lib/user-interface/phenotype';
import { createServerSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'SFI FIELD · Trayectoria guiada y observación privada',
  description: 'Define un objetivo observable, organiza evidencia y construye una trayectoria mediante microejecuciones reversibles y retornos medidos.',
  alternates: { canonical: '/interface' },
};

type PageProps = {
  searchParams?: Promise<{ payment?: string; new?: string }>;
};

function isActiveEntitlement(status: string | null, validUntil: string | null) {
  if (status !== 'active' && status !== 'trialing') return false;
  if (!validUntil) return true;
  return new Date(validUntil).getTime() > Date.now();
}

export default async function InterfacePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  let entitlement = { tier: 'preview', status: 'inactive', active: false };
  let snapshot = {
    caseCount: 0,
    latestCaseId: null as string | null,
    latestMophAt: null as string | null,
    latestMihmAt: null as string | null,
    latestInterventionAt: null as string | null,
    nextReturnAt: null as string | null,
    latestPhenotype: null as PhenotypeProfile | null,
  };

  if (user) {
    const [
      activeWindowQuery,
      declaredAttractorQuery,
      entitlementQuery,
      caseCountQuery,
      latestCaseQuery,
      latestMophQuery,
      latestPhenotypeQuery,
      latestMihmQuery,
      latestInterventionQuery,
      nextReturnQuery,
    ] = await Promise.all([
      supabase.from('field_participant_windows').select('id').eq('owner_id', user.id).eq('status', 'ACTIVE').order('started_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('sfi_user_attractors').select('id').eq('owner_id', user.id).eq('status', 'DECLARED').order('declared_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('sfi_user_entitlements').select('tier,status,valid_until').eq('user_id', user.id).maybeSingle(),
      supabase.from('field_cases').select('id', { count: 'exact', head: true }).eq('owner_id', user.id).is('deleted_at', null),
      supabase.from('field_cases').select('id').eq('owner_id', user.id).is('deleted_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('field_moph_runs').select('case_id,output,completed_at,created_at').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('sfi_user_phenotype_profiles').select('code,label,summary,dimensions,confidence').eq('owner_id', user.id).order('observed_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('field_mihm_readings').select('created_at').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('field_interventions').select('started_at,created_at').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('field_returns').select('expected_at').eq('owner_id', user.id).is('returned_at', null).order('expected_at', { ascending: true }).limit(1).maybeSingle(),
    ]);

    if (activeWindowQuery.data) redirect('/field/participant');
    if (declaredAttractorQuery.data && params?.new !== '1') redirect('/interface/observatory');

    const entitlementRow = entitlementQuery.data;
    entitlement = {
      tier: entitlementRow?.tier ?? 'preview',
      status: entitlementRow?.status ?? 'inactive',
      active: isActiveEntitlement(entitlementRow?.status ?? null, entitlementRow?.valid_until ?? null),
    };

    const storedPhenotype = latestPhenotypeQuery.data
      ? ({
          code: latestPhenotypeQuery.data.code,
          label: latestPhenotypeQuery.data.label,
          summary: latestPhenotypeQuery.data.summary,
          dimensions: latestPhenotypeQuery.data.dimensions,
          confidence: Number(latestPhenotypeQuery.data.confidence ?? 0),
        } as PhenotypeProfile)
      : null;

    snapshot = {
      caseCount: caseCountQuery.count ?? 0,
      latestCaseId: latestMophQuery.data?.case_id ?? latestCaseQuery.data?.id ?? null,
      latestMophAt: latestMophQuery.data?.completed_at ?? latestMophQuery.data?.created_at ?? null,
      latestMihmAt: latestMihmQuery.data?.created_at ?? null,
      latestInterventionAt: latestInterventionQuery.data?.started_at ?? latestInterventionQuery.data?.created_at ?? null,
      nextReturnAt: nextReturnQuery.data?.expected_at ?? null,
      latestPhenotype: storedPhenotype,
    };
  }

  return (
    <UserInterfaceExperience
      authenticated={Boolean(user)}
      userEmail={user?.email ?? null}
      entitlement={entitlement}
      snapshot={snapshot}
      paymentStatus={params?.payment}
    />
  );
}
