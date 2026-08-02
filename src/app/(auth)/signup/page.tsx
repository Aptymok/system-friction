import { AuthTerminal } from '@/components/auth/AuthTerminal';
import { registerAction } from '@/lib/auth/actions';

type SignupPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

function safeNextPath(value?: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return undefined;
  return value;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);
  return (
    <AuthTerminal
      title="Crear cuenta"
      action={registerAction}
      mode="register"
      error={params.error}
      nextPath={nextPath}
    />
  );
}
