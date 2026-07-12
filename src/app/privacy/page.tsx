import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacidad, evidencia y analítica',
  description: 'Política de privacidad de System Friction Institute para cuentas, evidencia, Studio, FIELD, auditoría y Google Analytics 4.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#060605] px-6 py-14 text-[#d8d2c2]">
      <article className="mx-auto max-w-4xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#c8a951]">Privacidad · evidencia · trazabilidad</p>
        <h1 className="mt-5 text-4xl font-semibold text-[#f5eedc]">Política de privacidad.</h1>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-[#9f9788]">
          System Friction Institute separa analítica pública, identidad de cuenta, evidencia privada, auditoría operativa y resultados de investigación. La existencia de un registro técnico no autoriza su publicación ni lo convierte automáticamente en evidencia de un fenómeno.
        </p>

        <div className="mt-10 space-y-9 leading-7 text-[#9f9788]">
          <section>
            <h2 className="text-xl text-[#f5eedc]">1. Responsable y alcance</h2>
            <p className="mt-3">Esta política aplica a systemfriction.org y a sus superficies públicas, autenticadas y privadas: Observatory, World Vector, FIELD, MOP-H, Studio, Atlas/Reference Bank y ROOT.</p>
          </section>

          <section>
            <h2 className="text-xl text-[#f5eedc]">2. Categorías de datos</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Cuenta: correo, identificadores de autenticación, permisos y estado de sesión.</li>
              <li>FIELD y MOP-H: objetivos declarados, descripción del sistema, intentos, evidencia, hipótesis, retorno y resultados.</li>
              <li>Studio: archivos, textos, imágenes, audio, video, features, síntesis MIHM, proyecciones y evidencias derivadas.</li>
              <li>Atlas/Reference Bank: casos, cohortes, T0, predicciones, outcomes, errores y relaciones explícitas de evidencia.</li>
              <li>ROOT: auditorías, aprobaciones, mutaciones, errores, acciones y trazas de gobernanza.</li>
              <li>Analítica pública: ruta visitada y eventos de navegación o uso del instrumento sin texto libre ni identidad privada.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl text-[#f5eedc]">3. Evidencia y clases epistémicas</h2>
            <p className="mt-3">La evidencia puede ser observada, declarada, derivada, inferida, proyectada, simulada, señal débil, faltante o archivada. Un dato faltante permanece MISSING. No se convierte silenciosamente en cero, promedio o certeza.</p>
            <p className="mt-3">Eventos de acceso como <code className="text-[#c8a951]">me.read</code> son trazas de gobernanza. No prueban por sí mismos una hipótesis cultural, organizacional, musical o social.</p>
          </section>

          <section>
            <h2 className="text-xl text-[#f5eedc]">4. Consentimiento para personas y organizaciones</h2>
            <p className="mt-3">Los objetos de clase persona, organización o movimiento requieren consentimiento explícito documentado antes de entrar a observación estructural. SFI no debe inferir diagnósticos, motivaciones privadas ni estados psicológicos no declarados.</p>
          </section>

          <section id="cookies">
            <h2 className="text-xl text-[#f5eedc]">5. Google Analytics 4</h2>
            <p className="mt-3">El sitio utiliza el flujo GA4 <code className="text-[#c8a951]">G-7YKTPLX3QD</code> para medir vistas de página, navegación interna y eventos operativos no sensibles. Las señales publicitarias y de personalización se encuentran desactivadas desde la etiqueta del sitio.</p>
            <p className="mt-3">No deben enviarse a Google Analytics: nombres, correos, teléfonos, textos de evidencia, objetivos declarados, contenido de Studio, identificadores de usuario, actor IDs, payloads de auditoría ni parámetros que permitan identificar a una persona.</p>
            <p className="mt-3">Los parámetros permitidos se limitan a categorías como ruta, hub, etapa del flujo, tipo de instrumento y estado agregado. La medición mejorada de Google puede registrar interacciones públicas como vistas, desplazamiento, enlaces y video según la configuración del flujo.</p>
          </section>

          <section>
            <h2 className="text-xl text-[#f5eedc]">6. Search Console e indexación</h2>
            <p className="mt-3">El dominio utiliza verificación de Google Search Console, sitemap, robots y archivos de contexto para buscadores y sistemas de IA. Estas superficies describen únicamente rutas públicas. ROOT, Studio, operador, APIs y telemetría permanecen excluidos de rastreo.</p>
          </section>

          <section>
            <h2 className="text-xl text-[#f5eedc]">7. Finalidades</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Prestar y proteger las funciones de cuenta.</li>
              <li>Ejecutar mediciones, hipótesis e intervenciones solicitadas.</li>
              <li>Conservar trazabilidad y reconstruir decisiones.</li>
              <li>Comparar predicciones con resultados reales.</li>
              <li>Detectar fallos, abuso, degradación y problemas de seguridad.</li>
              <li>Mejorar navegación y comprensión de las superficies públicas.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl text-[#f5eedc]">8. Publicación y acceso</h2>
            <p className="mt-3">La evidencia privada no se publica automáticamente. Observatory solo debe presentar observaciones públicas admisibles. FIELD pertenece a la cuenta participante. Studio conserva objetos privados. ROOT es una consola restringida de gobernanza.</p>
          </section>

          <section>
            <h2 className="text-xl text-[#f5eedc]">9. Retención, corrección y eliminación</h2>
            <p className="mt-3">La retención depende de la finalidad del registro, del consentimiento, de la necesidad de auditoría y del estado del caso. Puede solicitarse acceso, corrección o eliminación mediante <a className="text-[#c8a951] underline" href="/contact">/contact</a> o escribiendo a aptymok@gmail.com.</p>
          </section>

          <section id="condiciones">
            <h2 className="text-xl text-[#f5eedc]">10. Límites de uso</h2>
            <p className="mt-3">El sistema produce observaciones e hipótesis operativas. No sustituye asesoría legal, médica o financiera. Las predicciones no calibradas son provisionales. Toda intervención externa requiere decisión humana y evidencia de retorno.</p>
          </section>

          <section>
            <h2 className="text-xl text-[#f5eedc]">11. Actualización</h2>
            <p className="mt-3">Última actualización: 12 de julio de 2026. Los cambios sustantivos se reflejan en esta página y en los contratos públicos de máquina.</p>
          </section>
        </div>
      </article>
    </main>
  );
}
