export type OrganStatus = 'vivo' | 'parcial' | 'latente' | 'ausente' | 'degradado';

export type OperationalOrgan = {
  id: string;
  name: string;
  status: OrganStatus;
  question: string;
  input: string[];
  output: string[];
  linkedApis: string[];
  nextAction: string;
  risk: 'low' | 'medium' | 'high';
};

export const SFI_OPERATIONAL_ORGANS: OperationalOrgan[] = [
  {
    id: 'scorefriction',
    name: 'ScoreFriction',
    status: 'vivo',
    question: '¿Qué está pasando allá afuera?',
    input: ['APIs', 'tendencias', 'cultura', 'música', 'redes', 'WorldSpect'],
    output: ['métrica total por vector', 'WSV desglosado', 'régimen cultural', 'narrativa puntual'],
    linkedApis: ['/api/scorefriction/state', '/api/scorefriction/worldspect', '/api/worldspect/state'],
    nextAction: 'Conectar estado diario a operational-state y generar salida narrativa única.',
    risk: 'medium',
  },
  {
    id: 'evaluator',
    name: 'Evaluator / MIHM',
    status: 'vivo',
    question: '¿Qué contiene esto?',
    input: ['texto', 'audio', 'video', 'documento', 'emisión'],
    output: ['MIHM variables', 'IHG', 'NTI', 'LTI', 'FS', 'PHI', 'narrativa puntual'],
    linkedApis: ['/api/mihm', '/api/mihm/process', '/api/sfi-engine/evaluate'],
    nextAction: 'Normalizar salida MIHM para que pueda entrar a bitácora y publicador.',
    risk: 'medium',
  },
  {
    id: 'amv_cognitive_twin',
    name: 'AMV + Gemelo Cognitivo',
    status: 'vivo',
    question: '¿Qué significa para este sistema?',
    input: ['emisiones', 'conversaciones', 'bitácoras', 'observaciones', 'archivos'],
    output: ['análisis', 'observación', 'declaración', 'proyección', 'simulación', 'decisión', 'propuesta'],
    linkedApis: ['/api/amv', '/api/amv/state', '/api/cognitive-twin', '/api/twin/state'],
    nextAction: 'Separar observación, inferencia, propuesta y decisión como campos formales.',
    risk: 'medium',
  },
  {
    id: 'longitudinal_observatory',
    name: 'Observatorio Longitudinal',
    status: 'parcial',
    question: '¿Qué se repite?',
    input: ['ScoreFriction', 'MIHM', 'AMV', 'ROOT', 'Atlas', 'bitácoras'],
    output: ['patrones persistentes', 'anomalías', 'atractores', 'tendencias longitudinales'],
    linkedApis: ['/api/scorefriction/longitudinal', '/api/observatory/state', '/api/projections/state'],
    nextAction: 'Construir reducer longitudinal que agregue señales por fecha, fuente, vector y régimen.',
    risk: 'high',
  },
  {
    id: 'laboratory',
    name: 'Laboratorio de Intervención',
    status: 'latente',
    question: '¿Qué pasa si modificamos una variable?',
    input: ['patrones', 'hipótesis', 'riesgos', 'oportunidades'],
    output: ['experimentos', 'protocolos', 'pruebas', 'resultados'],
    linkedApis: ['/api/projections/create', '/api/sandbox/propose-diff', '/api/mutations/propose'],
    nextAction: 'Formalizar protocolo mínimo de hipótesis → intervención → verificación.',
    risk: 'high',
  },
  {
    id: 'archive',
    name: 'Archivo / Memoria',
    status: 'vivo',
    question: '¿Qué no debe perderse?',
    input: ['Atlas', 'evidencia', 'casos', 'documentos', 'bitácoras'],
    output: ['preservación', 'traza', 'hash', 'referencia'],
    linkedApis: ['/api/root/evidence', '/api/sfi/evidence', '/api/sfi/assets'],
    nextAction: 'Vincular todo output operativo a una evidencia o evento trazable.',
    risk: 'low',
  },
  {
    id: 'publisher',
    name: 'Publicador',
    status: 'ausente',
    question: '¿Qué debe salir al mundo?',
    input: ['observaciones', 'anomalías', 'casos', 'dictámenes'],
    output: ['borrador Medium', 'borrador LinkedIn', 'reporte semanal', 'observación pública'],
    linkedApis: ['/api/publisher/draft', '/api/social/post', '/api/cron/publish'],
    nextAction: 'Generar borradores, no publicar automáticamente todavía.',
    risk: 'medium',
  },
  {
    id: 'market',
    name: 'Mercado / Oportunidades',
    status: 'ausente',
    question: '¿Quién necesita esto?',
    input: ['interesados', 'clientes', 'aliados', 'solicitudes', 'conversaciones'],
    output: ['oportunidad registrada', 'riesgo', 'siguiente acción', 'propuesta'],
    linkedApis: ['/api/market/opportunities', '/api/intake'],
    nextAction: 'Registrar actores como Edwing con rol, interés, riesgo y nivel de acceso permitido.',
    risk: 'high',
  },
  {
    id: 'governance',
    name: 'Gobernanza',
    status: 'parcial',
    question: '¿Qué sí y qué no?',
    input: ['solicitudes', 'riesgos', 'activos', 'roles', 'evidencia'],
    output: ['permiso', 'límite', 'rechazo', 'condición', 'nivel de acceso'],
    linkedApis: ['/api/governance/access-request', '/api/governance/acp-seen', '/api/root/state'],
    nextAction: 'Impedir entrega del núcleo generador sin contrato de acceso.',
    risk: 'high',
  },
  {
    id: 'expansion',
    name: 'Expansión',
    status: 'latente',
    question: '¿Cómo crece sin depender del fundador?',
    input: ['publicaciones', 'alianzas', 'clientes', 'operadores', 'casos'],
    output: ['nuevos nodos', 'nuevos operadores', 'nuevos observatorios', 'ingreso recurrente'],
    linkedApis: ['/api/acp/agents', '/api/node/bootstrap', '/api/runtime/bootstrap'],
    nextAction: 'Definir operador limitado antes de habilitar expansión externa.',
    risk: 'high',
  },
];

export function getOperationalRegime(organs: OperationalOrgan[]) {
  const ausente = organs.filter((organ) => organ.status === 'ausente').length;
  const vivo = organs.filter((organ) => organ.status === 'vivo').length;
  if (ausente >= 3) return 'partial';
  if (vivo >= 8) return 'live';
  return 'degraded';
}
