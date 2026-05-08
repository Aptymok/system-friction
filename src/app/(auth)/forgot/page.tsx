import { AuthTerminal } from '@/components/auth/AuthTerminal'
import { forgotPasswordAction } from '@/lib/auth/actions'

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ error?: string; state?: string }> }) {
  const params = await searchParams
  return <AuthTerminal title="Recuperar acceso" action={forgotPasswordAction} mode="forgot" error={params.error} state={params.state === 'sent' ? 'Se envio enlace de recuperacion.' : undefined} />
}
