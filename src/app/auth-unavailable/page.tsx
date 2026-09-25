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
        <h1>Verification temporarily unavailable</h1>
        <p>
          SFI has not classified your session as closed or your account as unauthorized. The verification service did not respond in time.
        </p>
        <p>Do not re-enter your password because of this message. Retry the surface when the verification service responds.</p>
        <p><a href={next}>RETRY</a></p>
        <p><a href="/field">OPEN PUBLIC FIELD</a></p>
      </section>
    </main>
  );
}
