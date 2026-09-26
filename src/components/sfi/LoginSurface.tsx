import { loginAction } from '@/lib/auth/actions';

function readableAuthError(error?: string) {
  if (!error) return '';
  const normalized = error.toLowerCase();
  if (normalized.includes('rate_limit')) {
    return 'Too many attempts were made in a short period. Try again later.';
  }
  if (normalized.includes('auth_unavailable') || normalized.includes('unavailable') || normalized.includes('failed')) {
    return 'The access system could not verify your identity at this time.';
  }
  if (normalized.includes('continuity_identity_missing') || normalized.includes('continuity_profile_missing')) {
    return 'Your institutional account exists, but its access has not finished activating.';
  }
  if (normalized.includes('activation_required')) {
    return 'Your account exists, but it needs a valid credential for the current access method.';
  }
  if (
    normalized.includes('invalid') ||
    normalized.includes('credential') ||
    normalized.includes('password') ||
    normalized.includes('not found') ||
    normalized.includes('user not found')
  ) {
    return 'The email address or password is invalid.';
  }
  return 'Access could not be completed.';
}

export function LoginSurface({
  error,
  next = '/entry',
  state,
}: {
  error?: string;
  next?: string;
  state?: string;
}) {
  const readable = readableAuthError(error);
  return (
    <main className="login">
      <form action={loginAction}>
        <div className="sigil">SFI.</div>
        <h1>Institute access</h1>
        <p className="loginLead">Sign in with the email address and password associated with your SFI account.</p>
        <input type="hidden" name="next" value={next} />
        <input name="email" type="email" placeholder="email" autoComplete="username" required />
        <input name="password" type="password" placeholder="password" autoComplete="current-password" required />
        <button>SIGN IN</button>

        {state === 'password_reset' ? <div className="authNotice">Password updated. You can now sign in.</div> : null}
        {state === 'continuity_activated' ? <div className="authNotice">Access activated. You can now sign in.</div> : null}
        {readable ? <div className="authMessage" role="alert">{readable}</div> : null}

        <div className="loginSupport">
          <a href="/forgot">Cannot sign in? Recover access</a>
        </div>

        <div className="loginMeta">
          <span>Authentication identifies your account; it does not modify your institutional authority.</span>
          <a href="/observatory">OBSERVATORY is public and does not require sign-in.</a>
        </div>
      </form>
    </main>
  );
}
