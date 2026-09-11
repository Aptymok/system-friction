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
        <p>Escribe el correo de tu cuenta. Si existe una cuenta activa, recibirás un enlace seguro para definir una nueva contraseña.</p>
        <input name="email" type="email" placeholder="correo" autoComplete="email" required />
        <button>ENVIAR ENLACE</button>
        {state === 'sent' ? <small>Si la cuenta existe, el enlace fue solicitado. Revisa tu correo.</small> : null}
        {error === 'rate_limit' ? <small>Hubo demasiados intentos seguidos. Inténtalo nuevamente más tarde.</small> : null}
        {error === 'supabase_no_configurado' ? <small>El servicio de acceso no está disponible.</small> : null}
        <small><a href="/login">Volver al acceso</a></small>
      </form>
    </main>
  );
}
