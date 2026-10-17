import { VerifyEmailSurface } from '@/components/sfi/VerifyEmailSurface';

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = value(params.next);
  return <VerifyEmailSurface
    next={next?.startsWith('/') && !next.startsWith('//') && !next.startsWith('/verify') ? next : '/entry'}
    state={value(params.state)}
    error={value(params.error)}
  />;
}
