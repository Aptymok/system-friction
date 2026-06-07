export type VisorContextKey =
  | 'bitacoras'
  | 'atlas'
  | 'workbook'
  | 'amc'
  | 'attractors'
  | 'evidence'
  | 'folders'
  | 'acp'
  | 'ledger'
  | 'nodes';

export type VisorContextItem = {
  key: VisorContextKey;
  label: string;
  description: string;
  children: string[];
};

export type VisorChatMessage = {
  role: 'user' | 'visor';
  text: string;
  classification?: string;
};

export type VisorSnapshot = {
  proposals: number;
  nodes: number;
  documents: number;
  patterns: number;
  events: number;
};

export const VISOR_CONTEXTS: VisorContextItem[] = [
  { key: 'bitacoras', label: 'Bitacoras', description: 'Entradas visibles con origen, capa y siguiente accion.', children: ['Usuario', 'Sistema', 'Agentes'] },
  { key: 'atlas', label: 'Atlas', description: 'Registros activos, cerrados y archivados sin mezclar capas.', children: ['Activos', 'Cerrados', 'Archivados'] },
  { key: 'workbook', label: 'Cuadernillo', description: 'Ideas, hipotesis y pendientes no promovidos.', children: ['Ideas', 'Hipotesis', 'Pendientes'] },
  { key: 'amc', label: 'Mutaciones', description: 'Cambios y transiciones observables.', children: ['Mutaciones', 'Cambios', 'Transiciones'] },
  { key: 'attractors', label: 'Atractores', description: 'Direcciones propuestas, activas o congeladas.', children: ['En diseno', 'Activos', 'Congelados'] },
  { key: 'evidence', label: 'Evidencia', description: 'Rastros sin validar, validados o persistentes.', children: ['Sin validar', 'Validada', 'Persistente'] },
  { key: 'folders', label: 'Carpetas', description: 'Espacios operativos disponibles para consulta.', children: ['Atlas', 'Cuadernillo', 'Twin', 'ACP'] },
  { key: 'acp', label: 'ACP', description: 'Gobierno, autorizacion y cierre.', children: ['Propuestas', 'Decisiones', 'Cierres'] },
  { key: 'ledger', label: 'Indice de rastros', description: 'Eventos, propuestas y resultados visibles.', children: ['Eventos', 'Propuestas', 'Resultados'] },
  { key: 'nodes', label: 'Nodos', description: 'Catalogo nodal y relaciones disponibles.', children: ['Operativos', 'Latentes', 'Degradados'] },
];

export function findVisorContext(key: VisorContextKey) {
  return VISOR_CONTEXTS.find((context) => context.key === key) ?? VISOR_CONTEXTS[0];
}
