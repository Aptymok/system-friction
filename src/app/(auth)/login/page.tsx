import { redirect } from 'next/navigation'
import { ThresholdAccess } from '@/components/auth/ThresholdAccess'
import { createServerSupabaseClient } from '@/runtime/supabase/server'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/terminal')
  return <ThresholdAccess error={params.error} />
}
