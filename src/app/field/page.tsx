import type { Metadata } from 'next';
import { InstituteWorkspace } from '@/components/field/InstituteWorkspace';
import { readPublicObservatoryState } from '@/lib/observatory/public/readPublicObservatoryState';
import { createServerSupabaseClient } from '@/runtime/supabase/server';
import { listOperationalCases, listOperationalTenants } from '@/lib/sfi/case-platform/repository';
import { SFI_SERVICE_PROFILES } from '@/core/case-platform/serviceProfiles';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'FIELD · System Friction Institute',
  description: 'Enter a personal or tenant-scoped system, connect sources, preserve evidence and execute governed observation before intervention.',
  alternates: { canonical: '/field' },
};

export default async function FieldPage() {
  const supabase = await createServerSupabaseClient();
  const [{ data: auth }, worldState] = await Promise.all([
    supabase.auth.getUser(),
    readPublicObservatoryState().catch(() => null),
  ]);

  const user = auth.user ?? null;
  const [tenants, cases] = user
    ? await Promise.all([
        listOperationalTenants(user.id).catch(() => []),
        listOperationalCases(user.id).catch(() => []),
      ])
    : [[], []];

  return (
    <InstituteWorkspace
      authenticated={Boolean(user)}
      initialTenants={tenants}
      initialCases={cases}
      profiles={SFI_SERVICE_PROFILES.map((profile) => ({
        id: profile.id,
        label: profile.label,
        acceptedSubjects: profile.acceptedSubjects,
        requiredSources: profile.requiredSources,
        requiredAnalyses: profile.requiredAnalyses,
        metricProfile: profile.metricProfile,
      }))}
      world={{
        observedAt: worldState?.publicContract.observedAt ?? null,
        regime: worldState?.wsv.regime ?? 'MISSING',
        wsv: worldState?.wsv.globalIndex ?? null,
        tension: worldState?.wsv.tension ?? null,
        confidence: worldState?.dailyReading.confidence ?? null,
        warning: worldState && worldState.publicContract.sourceState !== 'observed'
          ? `SOURCE ${worldState.publicContract.sourceState.toUpperCase()}`
          : null,
      }}
    />
  );
}
