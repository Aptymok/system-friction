function safeInternalPath(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/entry';
  if (value.startsWith('/login') || value.startsWith('/auth-unavailable')) return '/entry';
  return value;
}

export default async function AuthUnavailablePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeInternalPath(Array.isArray(params.next) ? params.next[0] : params.next);

  return (
    <main className="login">
      <section>
        <div className="sigil">SFI.</div>
        <h1>Verificación temporalmente indisponible</h1>
        <p>
          SFI no ha clasificado tu sesión como cerrada ni tu cuenta como no autorizada. El servicio de verificación no respondió a tiempo.
        </p>
        <p>No vuelvas a introducir tu contraseña por este mensaje. Reintenta la superficie cuando el servicio responda.</p>
        <p><a href={next}>REINTENTAR</a></p>
        <p><a href="/field">ABRIR FIELD PÚBLICO</a></p>
      </section>
    </main>
  );
}
