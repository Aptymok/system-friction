import { registerAction } from '@/lib/auth/actions';

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = value(params.error);
  const next = value(params.next);
  const safeNext = next?.startsWith('/') && !next.startsWith('//') ? next : '/entry';
  return (
    <main className="login">
      <form action={registerAction}>
        <div className="sigil">SFI.</div>
        <h1>Create your account</h1>
        <p className="loginLead">
          Register your personal SFI identity. Institutional observer/operator
          permissions are assigned separately and are never granted by signup.
        </p>
        <input type="hidden" name="next" value={safeNext}/>
        <input name="email" type="email" placeholder="email" autoComplete="email" required/>
        <input name="password" type="password" placeholder="create password (12+ characters)"
          autoComplete="new-password" minLength={12} required/>
        <button type="submit">CREATE ACCOUNT</button>
        {error ? <div className="authMessage" role="alert">The account could not be registered.
          Check the details, email availability, or delivery limits and retry.</div> : null}
        <div className="loginSupport">
          <a href="/login">Already have an account? Sign in</a>
        </div>
        <div className="loginMeta">
          <span>Personal registration does not confer ROOT, institutional appointment or governance authority.</span>
        </div>
      </form>
    </main>
  );
}
