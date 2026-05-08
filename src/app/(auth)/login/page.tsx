import { AuthTerminal } from '@/components/auth/AuthTerminal'
import { loginAction } from '@/lib/auth/actions'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  return <AuthTerminal title="Sincronizar identidad" action={loginAction} mode="login" error={params.error} />
}
