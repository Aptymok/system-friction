// src/app/unauthorized/page.tsx
export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-void text-paper">
      <div className="terminal-panel p-8 text-center">
        <h1 className="font-display text-2xl text-red-500">Acceso Denegado</h1>
        <p className="mt-4">No tienes permisos para ver esta sección.</p>
        <a href="/" className="mt-6 inline-block text-gold underline">Volver al inicio</a>
      </div>
    </div>
  );
}
