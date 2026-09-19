import { activateContinuityPasswordAction } from '@/lib/auth/actions';

export default async function ContinuityAccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawError = Array.isArray(params.error) ? params.error[0] : params.error;
  const error = rawError === 'rate_limit'
    ? 'Hubo demasiados intentos seguidos. Inténtalo nuevamente más tarde.'
    : rawError === 'auth_unavailable'
      ? 'La activación de continuidad no está disponible en este momento.'
      : rawError
        ? 'El correo o la contraseña no son válidos para una credencial preparada para migración.'
        : '';

  return (
    <main className="login">
      <form action={activateContinuityPasswordAction}>
        <div className="sigil">SFI.</div>
        <h1>Activar continuidad</h1>
        <p>
          Usa esta vía sólo si tu identidad ya fue migrada a Neon y el correo de recuperación no está disponible.
          La contraseña se verifica contra la credencial preparada y se convierte una sola vez al formato nativo de Neon.
        </p>
        <input name="email" type="email" placeholder="correo" autoComplete="username" required />
        <input name="password" type="password" placeholder="contraseña actual" autoComplete="current-password" required />
        <button>ACTIVAR EN NEON</button>
        {error ? <small>{error}</small> : null}
        <small>Esta operación no crea cuentas, perfiles ni autoridad. Sólo migra una credencial previamente preparada.</small>
        <small><a href="/login">Volver al acceso</a></small>
      </form>
    </main>
  );
}
