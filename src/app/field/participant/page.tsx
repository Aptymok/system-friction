import type { Metadata } from 'next';
import { ParticipantWindowConsole } from '@/components/field/ParticipantWindowConsole';
import { createServerSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Participant Field - 72-hour marks - System Friction Institute',
  description:
    'Record repeated thoughts, events or marks during a 72-hour window without technical interpretation by default.',
  alternates: { canonical: '/field/participant' },
};

export default async function ParticipantFieldPage() {
  const supabase = await createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();

  return <ParticipantWindowConsole authenticated={Boolean(auth.user)} />;
}
