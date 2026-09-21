import { loginAction } from '@/lib/auth/actions';

function readableAuthError(error?: string) {
  if (!error) return '';
  const normalized = error.toLowerCase();
  if (normalized.includes('rate_limit')) {
    return 'Hubo demasiados intentos seguidos. Inténtalo nuevamente más tarde.';
  }
  if (normalized.includes('auth_unavailable') || normalized.includes('unavailable') || normalized.includes('failed')) {
    return 'El sistema de acceso no pudo verificar tu identidad en este momento.';
  }
  if (normalized.includes('continuity_identity_missing') || normalized.includes('continuity_profile_missing')) {
    return 'Tu cuenta institucional existe, pero su acceso todavía no terminó de activarse.';
  }
  if (normalized.includes('activation_required')) {
    return 'Tu cuenta existe, pero necesita definir una credencial válida para el acceso actual.';
  }
  if (
    normalized.includes('invalid') ||
    normalized.includes('credential') ||
    normalized.includes('password') ||
    normalized.includes('not found') ||
    normalized.includes('user not found')
  ) {
    return 'El correo o la contraseña no son válidos.';
  }
  return 'No fue posible completar el acceso.';
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
        <p className="loginLead">Ingresa con el correo y la contraseña de tu cuenta SFI.</p>
        <input type="hidden" name="next" value={next} />
        <input name="email" type="email" placeholder="correo" autoComplete="username" required />
        <input name="password" type="password" placeholder="contraseña" autoComplete="current-password" required />
        <button>ENTRAR</button>

        {state === 'password_reset' ? <div className="authNotice">Contraseña actualizada. Ya puedes ingresar.</div> : null}
        {state === 'continuity_activated' ? <div className="authNotice">Acceso activado. Ya puedes ingresar.</div> : null}
        {readable ? <div className="authMessage" role="alert">{readable}</div> : null}

        <div className="loginSupport">
          <a href="/forgot">¿No puedes entrar? Recuperar acceso</a>
        </div>

        <div className="loginMeta">
          <span>La autenticación identifica tu cuenta; no modifica tu autoridad institucional.</span>
          <a href="/field">FIELD es público y no requiere iniciar sesión.</a>
        </div>
      </form>
    </main>
  );
}
