import { resetPasswordAction } from '@/lib/auth/actions';

function readableResetError(error?: string) {
  if (!error) return '';
  const normalized = error.toLowerCase();
  if (normalized.includes('invalid') || normalized.includes('token') || normalized.includes('expired')) {
    return 'El enlace no es válido o ya expiró. Solicita uno nuevo.';
  }
  if (normalized.includes('entrada_invalida')) {
    return 'Usa una contraseña válida, confirma que coincida y abre esta página desde el enlace recibido por correo.';
  }
  return 'No fue posible actualizar la contraseña. Solicita un enlace nuevo.';
}

export function PasswordResetSurface({
  mode,
  token,
  error,
}: {
  mode: 'invite' | 'recovery';
  token?: string;
  error?: string;
}) {
  const readable = readableResetError(error);
  return (
    <main className="login">
      <form action={resetPasswordAction}>
        <div className="sigil">SFI.</div>
        <h1>{mode === 'invite' ? 'Activar acceso' : 'Nueva contraseña'}</h1>
        <p>
          {token
            ? 'Identidad verificada mediante enlace seguro. Define una contraseña para la capa de continuidad.'
            : 'Abre esta página desde el enlace de recuperación enviado a tu correo.'}
        </p>
        <input type="hidden" name="token" value={token || ''} />
        <input name="password" type="password" placeholder="nueva contraseña" autoComplete="new-password" minLength={12} required disabled={!token} />
        <input name="confirmation" type="password" placeholder="repite la contraseña" autoComplete="new-password" minLength={12} required disabled={!token} />
        <button disabled={!token}>{mode === 'invite' ? 'ACTIVAR CUENTA' : 'GUARDAR CONTRASEÑA'}</button>
        {readable ? <small>{readable}</small> : null}
        {!token ? <small><a href="/forgot">Solicitar un enlace nuevo</a></small> : null}
        <small>SFI nunca necesita conocer ni enviarte la contraseña que elijas.</small>
      </form>
    </main>
  );
}
