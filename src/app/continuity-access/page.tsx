import { activateContinuityPasswordAction } from '@/lib/auth/actions';

export default async function ContinuityAccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawError = Array.isArray(params.error) ? params.error[0] : params.error;
  const error = rawError === 'rate_limit'
    ? 'Too many attempts were made in a short period. Try again later.'
    : rawError === 'auth_unavailable'
      ? 'Continuity activation is not available at this time.'
      : rawError === 'invalid_or_expired'
        ? 'The activation code is invalid, expired or has already been used.'
        : rawError
          ? 'Check the code and confirm that both passwords match.'
          : '';

  return (
    <main className="login">
      <form action={activateContinuityPasswordAction}>
        <div className="sigil">SFI.</div>
        <h1>Activate continuity</h1>
        <p>
          Set your Neon credential directly with the temporary activation code.
          The code is consumed once and does not create a new account or modify your institutional authority.
        </p>
        <input name="code" type="text" placeholder="temporary SFI code…" autoComplete="one-time-code" required />
        <input name="password" type="password" placeholder="new password" autoComplete="new-password" minLength={12} required />
        <input name="confirmation" type="password" placeholder="repeat password" autoComplete="new-password" minLength={12} required />
        <button>ACTIVATE IN NEON</button>
        {error ? <small>{error}</small> : null}
        <small>Activation only initializes the credential for the existing Neon user. It does not change user_id, profile, ROOT role or permissions.</small>
        <small><a href="/login">Back to sign in</a></small>
      </form>
    </main>
  );
}
