import { AuthTerminal } from '@/components/auth/AuthTerminal'
import { resetPasswordAction } from '@/lib/auth/actions'

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  return <AuthTerminal title="Reset de clave" action={resetPasswordAction} mode="reset" error={params.error} />
}
