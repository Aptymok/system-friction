export type EvidenceState =
  | 'PUBLICO VERIFICABLE'
  | 'ARCHIVO INTERNO'
  | 'EN REVISION'
  | 'PENDIENTE DE PUBLICACION'
  | 'PILOTO ACTIVO'
  | 'LEGACY / HISTORICO';

export type DocumentaryEvidence = {
  evidenceId: string;
  title: string;
  type: 'document' | 'post' | 'agreement' | 'issue' | 'pr' | 'brief' | 'image' | 'audio' | 'note' | 'event' | 'artifact';
  source: 'black_envelope' | 'notebook' | 'atlas' | 'site' | 'observatory' | 'github' | 'external' | 'manual';
  timestamp: string;
  fieldDensity: number;
  evidenceWeight: number;
  confidence: number;
  regime: 'threshold' | 'audit' | 'observatory' | 'resolution' | 'mutation' | 'projection';
  attractors: string[];
  nodes: string[];
  linkedArtifacts: string[];
  status: 'raw' | 'reviewed' | 'weighted' | 'projected' | 'canonized' | 'rejected' | 'sealed';
  visibility: 'public' | 'licensed' | 'acp' | 'private';
  interpretationLimit: string;
};

export const publicEvidenceStates: Array<{
  title: string;
  state: EvidenceState;
  description: string;
  limit: string;
}> = [
  {
    title: 'Nodo AGS · Aguascalientes',
    state: 'ARCHIVO INTERNO',
    description: 'Caso empirico en preparacion: friccion institucional regional, tension operativa, respuesta estatal y degradacion de coherencia.',
    limit: 'Lectura estructural; no acusacion juridica.',
  },
  {
    title: 'CIMPS · Estrategia de decision organizacional',
    state: 'EN REVISION',
    description: 'Formalizacion academica del marco MIHM aplicado a decision organizacional.',
    limit: 'No se presenta como validacion publicada hasta aceptacion formal.',
  },
  {
    title: 'Unipres Mexicana S.A. de C.V.',
    state: 'PILOTO ACTIVO',
    description: 'Caso ancla para observabilidad organizacional en manufactura: DIOL-SF, SFI-QOM, ScoreFriction y MIHM Engine.',
    limit: 'No se presenta como resultado validado hasta cierre documental.',
  },
  {
    title: 'GitHub Pages · Netlify v1',
    state: 'LEGACY / HISTORICO',
    description: 'Superficies historicas de publicacion y experimentacion del marco.',
    limit: 'Archivo historico; no autoridad canonica vigente.',
  },
];

export const traceArtifacts = [
  {
    name: 'Sobre Negro',
    role: 'Archivo fisico de evidencia no canonizada.',
    function: 'Recibe materia bruta, preserva versiones, desvios, pruebas y residuos. No decide. Contiene.',
  },
  {
    name: 'Notebook',
    role: 'Bitacora de lectura operativa.',
    function: 'La evidencia se toca, compara, contradice, poda y vuelve pregunta. No canoniza. Procesa.',
  },
  {
    name: 'Atlas',
    role: 'Canonizacion visual y estructural.',
    function: 'Convierte fragmento en arquitectura, ordena patrones y estabiliza lenguaje.',
  },
  {
    name: 'Sitio',
    role: 'Umbral publico.',
    function: 'No reemplaza los artefactos: los vuelve observables.',
  },
  {
    name: 'Observatorio',
    role: 'Runtime del campo.',
    function: 'La evidencia deja de ser archivo y empieza a operar.',
  },
];

export const mihmVariables = [
  ['IHG', 'Indice de Homeostasis General', 'Coherencia estructural del sistema.'],
  ['NTI', 'Nodo de Tension Institucional', 'Punto donde la presion se concentra y deforma decisiones.'],
  ['LDI', 'Latencia de Decision Institucional', 'Tiempo entre senal detectada y respuesta efectiva.'],
  ['Phi c', 'Flujo de Coherencia', 'Transferencia de energia estructural entre nodos.'],
  ['epsilon', 'Umbral de Friccion', 'Punto donde la senal deja de informar y empieza a degradar.'],
];

export const attractors = [
  'Autoridad institucional',
  'Reconocimiento externo',
  'Evidencia publica',
  'Validacion academica',
  'Caso organizacional',
  'Recurso economico',
  'Invitacion estrategica',
  'Expansion territorial',
  'Consolidacion del Atlas',
  'Salto de regimen',
];

export const documentaryEvidence: DocumentaryEvidence[] = [
  {
    evidenceId: 'SFI-EVD-0001',
    title: 'SFI-CORE.v2 · Kernel operativo de arquitectura perceptual',
    type: 'document',
    source: 'atlas',
    timestamp: '2026-05-28T00:00:00.000Z',
    fieldDensity: 0.72,
    evidenceWeight: 0.84,
    confidence: 0.76,
    regime: 'observatory',
    attractors: ['Autoridad institucional', 'Evidencia publica', 'Consolidacion del Atlas'],
    nodes: ['ACP', 'INST', 'PERC'],
    linkedArtifacts: ['SFI_CANON_DOCS.html', 'INDEX_PROPOSAL.HTML'],
    status: 'weighted',
    visibility: 'public',
    interpretationLimit: 'Canon perceptual publico; no sustituye governance runtime privado.',
  },
  {
    evidenceId: 'SFI-EVD-0002',
    title: 'SF_nodes + SF_docs · Campo documental MIHM',
    type: 'artifact',
    source: 'observatory',
    timestamp: '2026-05-28T00:00:00.000Z',
    fieldDensity: 0.68,
    evidenceWeight: 0.78,
    confidence: 0.7,
    regime: 'audit',
    attractors: ['Evidencia publica', 'Validacion academica', 'Salto de regimen'],
    nodes: ['INF', 'CULT', 'INST'],
    linkedArtifacts: ['SF_nodes.json', 'SF_docs.js'],
    status: 'reviewed',
    visibility: 'licensed',
    interpretationLimit: 'Repositorio documental vivo; los documentos no publicados se muestran como estructura, no como validacion.',
  },
  {
    evidenceId: 'SFI-EVD-0003',
    title: 'Field Brief 001 · Saturacion de validacion publica',
    type: 'brief',
    source: 'site',
    timestamp: '2026-05-28T00:00:00.000Z',
    fieldDensity: 0.61,
    evidenceWeight: 0.58,
    confidence: 0.62,
    regime: 'threshold',
    attractors: ['Reconocimiento externo', 'Evidencia publica'],
    nodes: ['PERC', 'CULT', 'INF', 'AGT'],
    linkedArtifacts: ['/field/brief/latest'],
    status: 'projected',
    visibility: 'public',
    interpretationLimit: 'Lectura colectiva; no diagnostico individual.',
  },
];

export const regimeMilestones = [
  ['Canonical surface', 'SFI-CORE.v2 publicado + home institucional estable + observatorio publico funcional + ultimo Field Brief visible.'],
  ['Repeatable public authority', '3 Field Briefs publicados + 1 caso con estado de evidencia + 1 ruta organizacional clara.'],
  ['Operational institutional memory', 'Repositorio documental clasifica 50 evidencias + Atlas conecta 12 patrones + observatorio muestra densidad de campo.'],
  ['Sellable institutional product', 'Caso organizacional documentado + reporte exportable + diagnostico reproducible.'],
  ['Expansion regime', 'Autoridad publica repetible + evidencia organizada + canon visible + conversacion institucional real.'],
  ['High-symbolic-capital corridor readiness', 'Expansion institucional + recurso economico + caso publico + validacion academica + campo persistente.'],
];

export function regimeJumpReadiness(metrics: {
  authorityDensity: number;
  evidenceCoherence: number;
  fieldPersistence: number;
  publicObservability: number;
  canonStability: number;
  attractorAlignment: number;
  invitationProbability: number;
}) {
  return (
    metrics.authorityDensity * 0.2
    + metrics.evidenceCoherence * 0.2
    + metrics.fieldPersistence * 0.15
    + metrics.publicObservability * 0.15
    + metrics.canonStability * 0.1
    + metrics.attractorAlignment * 0.1
    + metrics.invitationProbability * 0.1
  );
}

export function regimeLabel(value: number) {
  if (value < 0.4) return 'Campo disperso';
  if (value < 0.6) return 'Campo emergente';
  if (value < 0.75) return 'Campo operativo';
  if (value < 0.85) return 'Campo con autoridad';
  return 'Salto de regimen';
}
