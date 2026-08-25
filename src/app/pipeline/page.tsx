import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/runtime/supabase/server';
import { PipelineConsole } from '@/components/sfi/PipelineConsole';

export default async function PipelinePage() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect('/login?next=/pipeline');
  return <PipelineConsole />;
}
