// src/app/unauthorized/page.tsx
export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-void text-paper">
      <div className="terminal-panel max-w-md p-8 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold">Umbral ROOT</p>
        <h1 className="mt-3 font-display text-2xl text-red-500">Acceso bloqueado</h1>
        <p className="mt-4 text-sm text-paper/80">Acceso bloqueado porque esta sesion no tiene permiso raiz.</p>
        <p className="mt-3 text-xs text-paper/55">
          Accion siguiente: volver al umbral, iniciar sesion con permiso raiz o revisar si la sesion expiro.
        </p>
        <a href="/" className="mt-6 inline-block text-gold underline">Volver al umbral</a>
      </div>
    </div>
  );
}
