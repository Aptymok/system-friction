import { LoginSurface } from '@/components/sfi/LoginSurface';

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}

function safeNext(input: string | undefined) {
  if (!input || !input.startsWith('/') || input.startsWith('//')) return '/entry';
  return input;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <LoginSurface
      error={value(params.error)}
      state={value(params.state)}
      next={safeNext(value(params.next))}
    />
  );
}
