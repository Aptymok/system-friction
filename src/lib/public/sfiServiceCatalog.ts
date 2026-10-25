import { SFI_SERVICE_PROFILES } from '@/core/case-platform/serviceProfiles';
import type { SfiServiceProfileId } from '@/core/contracts/commercial';

// Human-readable editorial projection of the ten existing canonical profiles.
// Descriptions follow the SFI Institutional and Master Operational Atlases (2026).
// This is an invitation to request an assessment, not a public execution grant.
export type SfiServiceArea = 'ia' | 'operaciones' | 'memoria' | 'investigacion';
type ServiceCopy = {
  slug:string; number:string; group:SfiServiceArea; title:string;
  question:string; summary:string; audience:string; inputs:string;
  deliverable:string; limits:string;
};
const serviceCopy:Record<SfiServiceProfileId,ServiceCopy> = {
  "AI_GOVERNANCE_ASSURANCE": {
    "slug": "evaluacion-de-decisiones-con-ia",
    "number": "01",
    "group": "ia",
    "title": "Evaluación de decisiones con IA",
    "question": "¿Puedes explicar cómo una recomendación de IA se convirtió en una decisión?",
    "summary": "Reconstruimos la información, las autorizaciones y los resultados que rodean una decisión asistida por inteligencia artificial.",
    "audience": "Responsables de riesgo, auditoría interna y gobernanza de IA.",
    "inputs": "La decisión, su contexto temporal, las fuentes consultadas y los responsables.",
    "deliverable": "Cronología de la decisión, matriz de autoridad, contradicciones, pruebas faltantes e informe revisable.",
    "limits": "No constituye certificación, dictamen jurídico ni prueba automática de causalidad."
  },
  "AI_IMPLEMENTATION_DIAGNOSTIC": {
    "slug": "diagnostico-de-sistemas-con-ia",
    "number": "02",
    "group": "ia",
    "title": "Diagnóstico de sistemas con IA",
    "question": "¿El modelo parece funcionar, pero falla cuando entra en operación?",
    "summary": "Distinguimos problemas de datos, búsqueda, integraciones, permisos y procesos antes de atribuir el fallo al modelo.",
    "audience": "Equipos técnicos, responsables de producto, MLOps y operaciones.",
    "inputs": "Descripción del sistema, ejemplos de fallos y registros autorizados.",
    "deliverable": "Mapa de dependencias, hipótesis de fallo, prueba reproducible cuando sea posible y recomendaciones priorizadas.",
    "limits": "No garantiza reparación automática ni cambios en producción."
  },
  "AI_ADOPTION_INTEGRATION": {
    "slug": "adopcion-de-ia-en-procesos",
    "number": "03",
    "group": "ia",
    "title": "Adopción responsable de IA",
    "question": "¿Te conviene integrar IA o existe una alternativa más simple?",
    "summary": "Estudiamos el trabajo real, sus excepciones y costes para identificar intervenciones útiles y reversibles.",
    "audience": "Dirección de operaciones, transformación y responsables de procesos.",
    "inputs": "Mapa del proceso, tiempos, costes aproximados y restricciones de operación.",
    "deliverable": "Mapa de oportunidades, comparación de alternativas, riesgos y plan de piloto medible.",
    "limits": "El retorno económico proyectado no equivale a ahorro observado."
  },
  "SERVICE_OBSERVABILITY": {
    "slug": "diagnostico-de-servicios",
    "number": "04",
    "group": "operaciones",
    "title": "Diagnóstico de servicios y soporte",
    "question": "¿Los tickets se cierran, pero los problemas vuelven a aparecer?",
    "summary": "Relacionamos incidencias, activos, proveedores y periodos para encontrar recurrencias que las métricas aisladas ocultan.",
    "audience": "Responsables de servicio, soporte, SRE, ITSM y SLA.",
    "inputs": "Muestra autorizada de tickets, fechas, activos, proveedores y SLA.",
    "deliverable": "Mapa de recurrencia, problemas candidatos, cronología e indicadores para reobservación.",
    "limits": "No sustituye el gestor de tickets ni remedia servicios automáticamente."
  },
  "CONTRACT_WARRANTY_ASSURANCE": {
    "slug": "contratos-y-garantias",
    "number": "05",
    "group": "operaciones",
    "title": "Evaluación de contratos y garantías",
    "question": "¿Es posible comprobar qué se pactó y qué ocurrió durante la prestación?",
    "summary": "Relacionamos obligaciones documentadas con incidencias, activos, garantías y respuesta de proveedores.",
    "audience": "Áreas de compras, gestión de proveedores y cumplimiento contractual.",
    "inputs": "Contratos, anexos, hitos, garantías y registros de servicio autorizados.",
    "deliverable": "Matriz de obligaciones, cronología, discrepancias y evidencia pendiente.",
    "limits": "No emite dictámenes legales ni declara unilateralmente incumplimientos."
  },
  "TENDER_ASSURANCE": {
    "slug": "licitaciones-y-ofertas",
    "number": "06",
    "group": "operaciones",
    "title": "Revisión de licitaciones y ofertas",
    "question": "¿Puedes justificar cada evaluación frente a requisitos previamente fijados?",
    "summary": "Ayudamos a comparar ofertas contra criterios congelados, con referencia documental y estados indeterminados cuando faltan pruebas.",
    "audience": "Equipos de adquisiciones y responsables de evaluación.",
    "inputs": "Bases, requisitos, propuestas y documentos de evaluación autorizados.",
    "deliverable": "Matriz requisito–propuesta, evidencia por página, contradicciones y puntos por aclarar.",
    "limits": "SFI no adjudica ni reemplaza la autoridad de las personas evaluadoras."
  },
  "ENTERPRISE_MEMORY": {
    "slug": "memoria-organizacional",
    "number": "07",
    "group": "memoria",
    "title": "Memoria organizacional",
    "question": "¿Tu organización pierde contexto cuando cambian personas o proyectos?",
    "summary": "Ordenamos acontecimientos, relaciones y documentos para conservar una historia consultable y trazable de decisiones.",
    "audience": "Operaciones, dirección de programas y gestión del conocimiento.",
    "inputs": "Registros organizacionales autorizados, fechas, decisiones y documentos de contexto.",
    "deliverable": "Mapa temporal, relaciones documentadas, procedencia y plan de continuidad de conocimiento.",
    "limits": "Las conexiones entre registros no prueban causalidad; cada cliente conserva su separación."
  },
  "COGNITIVE_RECONSTRUCTION": {
    "slug": "conocimiento-experto",
    "number": "08",
    "group": "memoria",
    "title": "Preservación de conocimiento experto",
    "question": "¿Qué conocimiento se pierde cuando una persona clave deja de participar?",
    "summary": "Documentamos procedimientos, criterios y cambios en el conocimiento experto mediante reconstrucciones contrastables.",
    "audience": "Líderes de conocimiento, investigación, sucesión y formación.",
    "inputs": "Material aportado voluntariamente, ejemplos, autorizaciones y criterios de contraste.",
    "deliverable": "Mapa de operaciones cognitivas, reconstrucción temporal y pruebas de consistencia.",
    "limits": "Una representación computacional no es una copia de la conciencia ni de la identidad."
  },
  "SYSTEM_OBSERVATORY": {
    "slug": "observacion-de-sistemas",
    "number": "09",
    "group": "investigacion",
    "title": "Observación de sistemas complejos",
    "question": "¿Qué relaciones explican el comportamiento de un sistema a lo largo del tiempo?",
    "summary": "Organizamos señales y registros para observar dependencias, fricciones, cambios e incertidumbre.",
    "audience": "Investigadores, responsables de sistemas y organizaciones.",
    "inputs": "Eventos, indicadores y fuentes operativas con fechas y definiciones.",
    "deliverable": "Mapa de relaciones, línea base, trayectorias y límites de interpretación.",
    "limits": "Observar una correlación no demuestra por sí misma una causa."
  },
  "CUSTOM_RESEARCH": {
    "slug": "investigacion-a-medida",
    "number": "10",
    "group": "investigacion",
    "title": "Investigación a medida",
    "question": "¿Tienes una pregunta importante que no encaja en un diagnóstico estándar?",
    "summary": "Definimos una pregunta, un corpus y un método apropiado para producir resultados que puedan revisarse y refutarse.",
    "audience": "Instituciones académicas, equipos de investigación y organizaciones.",
    "inputs": "Pregunta delimitada, material disponible, restricciones y finalidad.",
    "deliverable": "Protocolo específico, hallazgos, contradicciones, limitaciones y entrega acordada.",
    "limits": "No fabricamos significancia ni prometemos resultados positivos."
  }
};

export const SFI_SERVICE_AREAS:ReadonlyArray<{id:SfiServiceArea;label:string;description:string}> = [
  {id:'ia',label:'Inteligencia artificial',description:'Entender, evaluar e integrar decisiones y sistemas con IA.'},
  {id:'operaciones',label:'Operaciones y organizaciones',description:'Examinar servicios, contratos y procesos de evaluación.'},
  {id:'memoria',label:'Conocimiento y memoria',description:'Conservar hechos, relaciones y conocimiento experto.'},
  {id:'investigacion',label:'Sistemas e investigación',description:'Observar fenómenos y formular preguntas comprobables.'},
];

const order:SfiServiceProfileId[] = [
  "AI_GOVERNANCE_ASSURANCE",
  "AI_IMPLEMENTATION_DIAGNOSTIC",
  "AI_ADOPTION_INTEGRATION",
  "SERVICE_OBSERVABILITY",
  "CONTRACT_WARRANTY_ASSURANCE",
  "TENDER_ASSURANCE",
  "ENTERPRISE_MEMORY",
  "COGNITIVE_RECONSTRUCTION",
  "SYSTEM_OBSERVATORY",
  "CUSTOM_RESEARCH"
];
export const SFI_PUBLIC_SERVICES = order.map((id)=>{
  const profile=SFI_SERVICE_PROFILES.find((item)=>item.id===id);
  if(!profile) throw new Error('SFI_SERVICE_PROFILE_MISSING:'+id);
  return {canonicalId:id,profile, ...serviceCopy[id]};
});
export type SfiPublicService = (typeof SFI_PUBLIC_SERVICES)[number];
export function serviceBySlug(slug:string):SfiPublicService|null {
  return SFI_PUBLIC_SERVICES.find((item)=>item.slug===slug)??null;
}
export const SFI_PUBLIC_INQUIRY_EMAIL='jmarin@systemfriction.org' as const;
// The address is already published at /juan. No new CRM endpoint or credential.
