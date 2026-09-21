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
        <h1>Recuperar acceso</h1>
        <p className="loginLead">Escribe el correo de tu cuenta SFI. Si la cuenta puede recibir correo, enviaremos un enlace seguro para definir una contraseña válida.</p>
        <input name="email" type="email" placeholder="correo" autoComplete="email" required />
        <button>ENVIAR ENLACE</button>

        {state === 'sent' ? <div className="authNotice">Si la cuenta existe, el enlace fue solicitado. Revisa tu correo.</div> : null}
        {error === 'rate_limit' ? <div className="authMessage">Hubo demasiados intentos seguidos. Inténtalo nuevamente más tarde.</div> : null}
        {error === 'auth_unavailable' ? <div className="authMessage">El sistema de acceso no pudo procesar la recuperación en este momento.</div> : null}

        <div className="loginSupport">
          <a href="/login">Volver al acceso</a>
          <a className="loginSupportSecondary" href="/continuity-access">No tengo acceso al correo institucional</a>
        </div>
      </form>
    </main>
  );
}
