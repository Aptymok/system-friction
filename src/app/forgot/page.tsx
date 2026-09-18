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
        <h1>Restablecer acceso</h1>
        <p>Escribe el correo de tu cuenta institucional. Si existe en la capa de continuidad, recibirás un enlace seguro para definir una contraseña.</p>
        <input name="email" type="email" placeholder="correo" autoComplete="email" required />
        <button>ENVIAR ENLACE</button>
        {state === 'sent' ? <small>Si la cuenta existe, el enlace fue solicitado. Revisa tu correo.</small> : null}
        {error === 'rate_limit' ? <small>Hubo demasiados intentos seguidos. Inténtalo nuevamente más tarde.</small> : null}
        {error === 'auth_unavailable' ? <small>El servicio de acceso de continuidad no está disponible en este momento.</small> : null}
        <small><a href="/login">Volver al acceso</a></small>
      </form>
    </main>
  );
}
