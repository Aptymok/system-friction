import { redirect } from 'next/navigation'
import { ThresholdAccess } from '@/components/auth/ThresholdAccess'
import { createServerSupabaseClient } from '@/runtime/supabase/server'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  const supabase = await createServerSupabaseClient()
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) redirect('/terminal')
  } catch {
    // A corrupt Supabase refresh cookie must not prevent rendering the threshold.
  }
  return <ThresholdAccess error={params.error} />
}
