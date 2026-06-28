import { AuthTerminal } from '@/components/auth/AuthTerminal';
import { registerAction } from '@/lib/auth/actions';

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <AuthTerminal title="Crear cuenta" action={registerAction} mode="register" error={params.error} />;
}
