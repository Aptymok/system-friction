export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#060605] px-6 py-14 text-[#d8d2c2]">
      <article className="mx-auto max-w-4xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">Privacidad</p>
        <h1 className="mt-5 text-4xl font-semibold text-[#f5eedc]">Politica de privacidad.</h1>
        <div className="mt-8 space-y-7 leading-7 text-[#9f9788]">
          <section><h2 className="text-xl text-[#f5eedc]">Datos recolectados</h2><p>Podemos procesar cuenta, email, objetivos declarados, evidencias subidas, logs operativos, interacciones, material de studio y metadata de proyectos.</p></section>
          <section><h2 className="text-xl text-[#f5eedc]">Evidencia</h2><p>La evidencia se usa para evaluar tareas, sostener decisiones y evitar cierres simbolicos. No se publica sin aprobacion.</p></section>
          <section><h2 className="text-xl text-[#f5eedc]">Studio</h2><p>Melodias, beats, referencias, notas de proyecto y senales de Instagram manuales son material privado. Studio no publica ni envia mensajes automaticamente.</p></section>
          <section><h2 className="text-xl text-[#f5eedc]">Logs operativos</h2><p>Los logs ayudan a reconstruir decisiones, errores, bloqueos y acciones. ROOT conserva supervision privada.</p></section>
          <section id="cookies"><h2 className="text-xl text-[#f5eedc]">Cookies y analitica basica</h2><p>Se usan cookies de sesion y, si se configura, analitica basica. No se deben usar para exponer evidencia privada.</p></section>
          <section id="centro"><h2 className="text-xl text-[#f5eedc]">Acceso, eliminacion y contacto</h2><p>Solicita acceso, correccion o eliminacion desde `/contact` o escribiendo a aptymok@gmail.com.</p></section>
          <section id="condiciones"><h2 className="text-xl text-[#f5eedc]">Condiciones</h2><p>El sistema produce evaluaciones operativas, no asesorias legales, medicas o financieras. Las acciones externas requieren decision humana.</p></section>
        </div>
      </article>
    </main>
  );
}
