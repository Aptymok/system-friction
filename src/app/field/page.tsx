import type { Metadata } from 'next';
import { FieldOperationalConsole } from '@/components/field/FieldOperationalConsole';
import { readPublicObservatoryState } from '@/lib/observatory/public/readPublicObservatoryState';
import { createServerSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'FIELD · MOP-H 72-hour operational cycle',
  description: 'Declare a stuck system, seal a governed minimal intervention and return with evidence for MIHM, WorldSpect and World Vector contrast.',
  alternates: { canonical: '/field' },
};

export default async function FieldPage() {
  const supabase = await createServerSupabaseClient();
  const [{ data: auth }, worldState] = await Promise.all([
    supabase.auth.getUser(),
    readPublicObservatoryState().catch(() => null),
  ]);

  const dominantDomains = worldState
    ? worldState.vectors
      .filter((item) => item.active)
      .sort((left, right) => right.value - left.value)
      .slice(0, 4)
      .map((item) => ({ label: item.label, value: item.value }))
    : [];

  return (
    <FieldOperationalConsole
      authenticated={Boolean(auth.user)}
      world={{
        observedAt: worldState?.publicContract.observedAt ?? null,
        regime: worldState?.wsv.regime ?? 'MISSING',
        wsv: worldState?.wsv.globalIndex ?? null,
        tension: worldState?.wsv.tension ?? null,
        confidence: worldState?.dailyReading.confidence ?? null,
        dominantDomains,
        warning: worldState && worldState.publicContract.sourceState !== 'observed'
          ? `SOURCE ${worldState.publicContract.sourceState.toUpperCase()}`
          : null,
      }}
    />
  );
}
