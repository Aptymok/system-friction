import { AuthTerminal } from '@/components/auth/AuthTerminal'
import { registerAction } from '@/lib/auth/actions'

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  return <AuthTerminal title="Registrar nodo persistente" action={registerAction} mode="register" error={params.error} />
}
