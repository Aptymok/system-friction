import { forgotPasswordAction } from '@/lib/auth/actions';

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const state = Array.isArray(params.state) ? params.state[0] : params.state;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;

  return (
    <main className="login">
      <form action={forgotPasswordAction}>
        <div className="sigil">SFI.</div>
        <h1>Recover access</h1>
        <p className="loginLead">Enter the email address associated with your SFI account. If the account can receive email, we will send a secure link to set a valid password.</p>
        <input name="email" type="email" placeholder="email" autoComplete="email" required />
        <button>SEND LINK</button>

        {state === 'sent' ? <div className="authNotice">If the account exists, the recovery link was requested. Check your email.</div> : null}
        {error === 'rate_limit' ? <div className="authMessage">Too many attempts were made in a short period. Try again later.</div> : null}
        {error === 'auth_unavailable' ? <div className="authMessage">The access system could not process recovery at this time.</div> : null}

        <div className="loginSupport">
          <a href="/login">Back to sign in</a>
          <a className="loginSupportSecondary" href="/continuity-access">I do not have access to the institutional email account</a>
        </div>
      </form>
    </main>
  );
}
