import type { Metadata } from 'next';
import { PpoiConsole } from '@/components/studio/ppoi/PpoiConsole';
import { createServerSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'PPOI - Persistent Phenomena Observation Instrument',
  description: 'Open persistent-phenomenon files, add evidence and emit a PPOI MIHM instrument state.',
};

export default async function PpoiPage() {
  const supabase = await createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();

  return <PpoiConsole authenticated={Boolean(auth.user)} />;
}
