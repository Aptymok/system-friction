export default function UnauthorizedPage() {
  return (
    <main className="login">
      <section>
        <div className="sigil">SFI.</div>
        <h1>Institutional access required</h1>
        <p>
          This session does not have the verified authority required for that SFI surface.
          Access has not been granted and no institutional role or data was changed.
        </p>
        <p>Use an account with the required institutional permissions, or request access from the authorized administrator.</p>
        <p><a href="/logout">SIGN OUT / CHANGE ACCOUNT</a></p>
        <p><a href="/observatory">OPEN PUBLIC OBSERVATORY</a></p>
      </section>
    </main>
  );
}
