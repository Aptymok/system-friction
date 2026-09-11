import { PasswordResetSurface } from '@/components/sfi/PasswordResetSurface';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  return <PasswordResetSurface mode={rawMode === 'invite' ? 'invite' : 'recovery'} />;
}
