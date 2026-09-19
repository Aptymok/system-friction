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
      : rawError === 'invalid_or_expired'
        ? 'El código de activación no es válido, ya expiró o ya fue utilizado.'
        : rawError
          ? 'Revisa el código y confirma que las dos contraseñas coincidan.'
          : '';

  return (
    <main className="login">
      <form action={activateContinuityPasswordAction}>
        <div className="sigil">SFI.</div>
        <h1>Activar continuidad</h1>
        <p>
          Define directamente tu credencial de Neon con el código temporal de activación.
          El código se consume una sola vez y no crea una cuenta nueva ni modifica tu autoridad institucional.
        </p>
        <input name="code" type="text" placeholder="código temporal SFI-…" autoComplete="one-time-code" required />
        <input name="password" type="password" placeholder="nueva contraseña" autoComplete="new-password" minLength={12} required />
        <input name="confirmation" type="password" placeholder="repite la contraseña" autoComplete="new-password" minLength={12} required />
        <button>ACTIVAR EN NEON</button>
        {error ? <small>{error}</small> : null}
        <small>La activación sólo inicializa la credencial del usuario Neon ya existente. No cambia user_id, perfil, rol ROOT ni permisos.</small>
        <small><a href="/login">Volver al acceso</a></small>
      </form>
    </main>
  );
}
