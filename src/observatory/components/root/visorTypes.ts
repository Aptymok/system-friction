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
};

export const VISOR_CONTEXTS: VisorContextItem[] = [
  { key: 'bitacoras', label: 'Bitacoras', description: 'Entradas de usuario, sistema y agentes.', children: ['Usuario', 'Sistema', 'Agentes'] },
  { key: 'atlas', label: 'Atlas', description: 'Registros activos, cerrados y archivados.', children: ['Activos', 'Cerrados', 'Archivados'] },
  { key: 'workbook', label: 'Workbook', description: 'Ideas, hipotesis y pendientes aun no promovidos.', children: ['Ideas', 'Hipotesis', 'Pendientes'] },
  { key: 'amc', label: 'AMC', description: 'Mutaciones, cambios y transiciones observables.', children: ['Mutaciones', 'Cambios', 'Transiciones'] },
  { key: 'attractors', label: 'Atractores', description: 'Atractores en diseno, activos o congelados.', children: ['En diseno', 'Activos', 'Congelados'] },
  { key: 'evidence', label: 'Evidencia', description: 'Evidencia sin validar, validada y persistente.', children: ['Sin validar', 'Validada', 'Persistente'] },
  { key: 'folders', label: 'Folders', description: 'Carpetas operativas disponibles para consulta.', children: ['Atlas', 'Cuadernillo', 'Twin', 'ACP'] },
  { key: 'acp', label: 'ACP', description: 'Estado de gobierno y autorizacion ACP.', children: ['Propuestas', 'Decisiones', 'Cierres'] },
  { key: 'ledger', label: 'Ledger', description: 'Rastro de eventos, decisiones y registros.', children: ['Eventos', 'Propuestas', 'Resultados'] },
  { key: 'nodes', label: 'Nodes', description: 'Catalogo nodal y relaciones disponibles.', children: ['Operativos', 'Latentes', 'Degradados'] },
];

export function findVisorContext(key: VisorContextKey) {
  return VISOR_CONTEXTS.find((context) => context.key === key) ?? VISOR_CONTEXTS[0];
}
