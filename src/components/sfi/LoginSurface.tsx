import { loginAction } from '@/lib/auth/actions';

function readableAuthError(error?: string) {
  if (!error) return '';
  const normalized = error.toLowerCase();
  if (
    normalized.includes('invalid') ||
    normalized.includes('credential') ||
    normalized.includes('password') ||
    normalized.includes('not found') ||
    normalized.includes('user not found')
  ) {
    return 'El correo o la contraseña no son válidos.';
  }
  if (normalized.includes('continuity_profile_missing')) {
    return 'La identidad fue reconocida, pero no existe un perfil institucional de continuidad asociado.';
  }
  if (normalized.includes('rate_limit')) {
    return 'Hubo demasiados intentos seguidos. Inténtalo nuevamente más tarde.';
  }
  if (normalized.includes('unavailable') || normalized.includes('failed')) {
    return 'El servicio de acceso de continuidad no está disponible en este momento.';
  }
  return error;
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
        <h1>Acceso al instituto</h1>
        <p>Acceso institucional mediante correo y contraseña. SFI verifica primero la identidad primaria y utiliza la capa de continuidad como respaldo; la autoridad permanece en el perfil institucional de SFI.</p>
        <input type="hidden" name="next" value={next} />
        <input name="email" type="email" placeholder="correo" autoComplete="username" required />
        <input name="password" type="password" placeholder="contraseña" autoComplete="current-password" required />
        <button>ENTRAR</button>
        {state === 'password_reset' ? <small>Contraseña actualizada. Ya puedes ingresar.</small> : null}
        {readable ? <small>{readable}</small> : null}
        <small><a href="/forgot">¿Primera vez en la continuidad o olvidaste tu contraseña? Define el acceso por correo.</a></small>
        <small>
          La autenticación no concede por sí sola autoridad ROOT ni capacidad para modificar el canon institucional.
        </small>
        <small><a href="/field">FIELD es público y no requiere iniciar sesión.</a></small>
      </form>
    </main>
  );
}
