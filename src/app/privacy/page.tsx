import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy & External Agent Data Policy',
  description: 'Privacy, analytics, consent and governed external-agent data policy for System Friction Institute.',
  alternates: { canonical: '/privacy' },
};

const sections = [
  {
    title: '1. Alcance',
    body: [
      'Esta política describe cómo System Friction Institute (SFI) trata datos asociados con sus superficies públicas, analítica web, interfaces autenticadas y External Agent Gateway.',
      'SFI separa observación, evidencia, inferencia, propuesta, autorización, ejecución y retorno. La existencia de un registro técnico no convierte por sí misma ese registro en evidencia de una persona, organización o fenómeno.',
    ],
  },
  {
    title: '2. Datos que pueden procesarse',
    body: [
      'En superficies públicas pueden procesarse datos técnicos de navegación, página visitada, fecha/hora, dispositivo o navegador, origen de campaña y eventos de uso del instrumento, sujeto a la configuración de consentimiento aplicable.',
      'En superficies autenticadas o agentic/API pueden procesarse identificadores técnicos del principal o agente, tenant o workspace cuando exista, scopes autorizados, operación solicitada, timestamps, identificadores de objetos SFI, referencias de evidencia, resultados de runtime y trazas de auditoría.',
      'Las credenciales de acceso se utilizan para autenticar y autorizar operaciones. SFI no debe exponer tokens, service-role secrets ni credenciales en respuestas públicas, reportes o recursos indexables.',
    ],
  },
  {
    title: '3. External Agent Gateway',
    body: [
      'Los clientes de IA autorizados pueden utilizar el gateway externo de SFI para observar superficies permitidas, proponer acciones, realizar acciones internas ya autorizadas y operar funciones del Method Lab según scopes y autoridad.',
      'Las propuestas externas no se autoaprueban. La aprobación y la promoción canónica permanecen decisiones de gobernanza separadas. Las operaciones de laboratorio que requieren root_delegate conservan trazabilidad y provenance.',
      'SFI puede registrar actorId, label de credencial, scopes, operación, objeto afectado, evidencia referenciada, resultado y timestamps con fines de seguridad, auditoría, calibración y continuidad institucional.',
    ],
  },
  {
    title: '4. Method Lab, Cognitive Twin y aprendizaje',
    body: [
      'Una observación persistida en Method Lab puede incorporarse al ledger epistemológico con provenance. Los análisis, evaluaciones del Cognitive Twin, predicciones y outcomes pueden conservarse para reconstrucción longitudinal y calibración.',
      'El Cognitive Twin no debe promover automáticamente una inferencia a hecho canónico. El aprendizaje institucional se basa en retorno observable, comparación con outcomes, error, evidencia y gobernanza, no únicamente en texto generado por un modelo.',
    ],
  },
  {
    title: '5. Google Analytics y consentimiento',
    body: [
      'SFI utiliza Google Analytics 4 para medir navegación y uso de superficies públicas. La configuración implementa Consent Mode v2 con analytics_storage, ad_storage, ad_user_data y ad_personalization denegados por defecto hasta que exista una elección de consentimiento.',
      'Cuando una persona acepta o rechaza, SFI actualiza ese estado de consentimiento. La analítica pública no debe enviar como parámetros texto libre de evidencia, objetivos privados, nombres, correos, identificadores de cuenta ni contenido autenticado.',
      'Los datos y la modelización disponibles para Google dependen del consentimiento, la configuración de Google y la jurisdicción aplicable. La configuración técnica no sustituye obligaciones legales que puedan corresponder a una organización o territorio determinado.',
    ],
  },
  {
    title: '6. Finalidades',
    body: [
      'Los datos se procesan para operar SFI, autenticar y autorizar agentes, mantener seguridad y auditoría, reconstruir historia de decisiones, medir desempeño técnico, evaluar predicciones, producir reportes gobernados y mejorar instrumentos mediante outcomes documentados.',
      'SFI no utiliza una señal pública aislada para inferir estados psicológicos no declarados ni debe convertir métricas de atención en autoridad, causalidad o validación metodológica.',
    ],
  },
  {
    title: '7. Compartición y proveedores',
    body: [
      'SFI puede utilizar proveedores técnicos necesarios para hosting, base de datos, observabilidad, analítica, modelos de lenguaje o ejecución de infraestructura. Cada proveedor recibe únicamente el contexto necesario para la operación correspondiente, según configuración y permisos disponibles.',
      'Una integración externa autorizada, incluido un cliente de IA, actúa dentro de sus scopes. El acceso de un agente a una superficie no implica acceso a ROOT, datos privados, evidencia restringida o autoridad de ejecución no concedida.',
    ],
  },
  {
    title: '8. Retención, auditoría y seguridad',
    body: [
      'Los periodos de retención pueden variar según la clase de registro. Evidencia, decisiones, retornos, predicciones y eventos de auditoría pueden conservarse longitudinalmente cuando son necesarios para trazabilidad, investigación, seguridad o gobernanza.',
      'SFI aplica separación de autoridad, scopes, trazabilidad de operaciones y registro de provenance. Ningún mecanismo técnico elimina por completo el riesgo; los controles se revisan conforme cambia la infraestructura.',
    ],
  },
  {
    title: '9. Derechos, solicitudes y contacto',
    body: [
      'Las solicitudes relacionadas con acceso, corrección, eliminación, consentimiento o tratamiento de datos pueden dirigirse mediante la superficie de contacto institucional de SFI. La respuesta aplicable dependerá de la naturaleza del dato, la relación con SFI y la normativa correspondiente.',
      'Contacto institucional: https://systemfriction.org/contact',
    ],
  },
  {
    title: '10. Recursos para agentes y modelos',
    body: [
      'Los recursos públicos machine-readable de SFI incluyen /llms.txt, /llms-full.txt, /ai-index.json, /field-schema.json, /openapi.json y /api/external/v1/manifest. Estos recursos describen capacidades públicas y reglas de interpretación; no conceden autorización por sí mismos.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#080806', color: '#d7c29a', padding: 'clamp(32px,6vw,88px) 24px', fontFamily: 'Georgia, Times New Roman, serif' }}>
      <article style={{ maxWidth: 980, margin: '0 auto', border: '1px solid rgba(205,164,93,.24)', background: 'linear-gradient(180deg,rgba(24,20,13,.72),rgba(8,8,6,.94))', boxShadow: '0 30px 90px rgba(0,0,0,.45)', padding: 'clamp(28px,5vw,68px)' }}>
        <p style={{ margin: 0, color: '#a9864d', letterSpacing: '.24em', fontSize: 12 }}>SYSTEM FRICTION INSTITUTE · GOVERNANCE</p>
        <h1 style={{ margin: '14px 0 10px', color: '#e1bd79', fontSize: 'clamp(34px,5vw,64px)', fontWeight: 400, lineHeight: 1.04 }}>Privacy & External Agent Data Policy</h1>
        <p style={{ margin: '0 0 36px', maxWidth: 760, color: '#b9aa8e', fontFamily: 'system-ui, sans-serif', lineHeight: 1.7 }}>Privacidad, consentimiento, analítica y tratamiento de datos para superficies humanas y agentes externos de SFI.</p>

        <div style={{ borderTop: '1px solid rgba(205,164,93,.18)' }}>
          {sections.map((section) => (
            <section key={section.title} style={{ padding: '28px 0', borderBottom: '1px solid rgba(205,164,93,.14)' }}>
              <h2 style={{ margin: '0 0 14px', color: '#d3ad6a', fontSize: 20, fontWeight: 400, letterSpacing: '.04em' }}>{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} style={{ margin: '10px 0', color: '#c6baa4', fontFamily: 'system-ui, sans-serif', fontSize: 15, lineHeight: 1.75 }}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>

        <footer style={{ paddingTop: 28, color: '#7f725d', fontFamily: 'system-ui, sans-serif', fontSize: 12, lineHeight: 1.7 }}>
          <div>Última actualización: 22 de agosto de 2026.</div>
          <div>Canonical: https://systemfriction.org/privacy</div>
          <div style={{ marginTop: 12 }}>Esta página describe la política operativa pública de SFI y no constituye por sí sola asesoría jurídica ni una certificación de cumplimiento para toda jurisdicción.</div>
        </footer>
      </article>
    </main>
  );
}
