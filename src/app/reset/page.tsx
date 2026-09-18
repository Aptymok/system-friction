import { PasswordResetSurface } from '@/components/sfi/PasswordResetSurface';

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawMode = value(params.mode);
  return (
    <PasswordResetSurface
      mode={rawMode === 'invite' ? 'invite' : 'recovery'}
      token={value(params.token)}
      error={value(params.error)}
    />
  );
}
