export type LaboratoryViewMode = 'CLUSTER' | 'HIERARCHY' | 'MESH' | 'RADIAL' | 'TEMPORAL' | 'WORLD';

export type LaboratoryViewModeConfig = {
  id: LaboratoryViewMode;
  label: string;
  symbol: string;
  description: string;
};

export const laboratoryViewModes: LaboratoryViewModeConfig[] = [
  { id: 'CLUSTER', label: 'Cluster', symbol: '⬡', description: 'por afinidad' },
  { id: 'HIERARCHY', label: 'Jerarquia', symbol: '⊤', description: 'por nivel' },
  { id: 'MESH', label: 'Malla', symbol: '⊞', description: 'alta densidad' },
  { id: 'RADIAL', label: 'Radial', symbol: '◎', description: 'orbital' },
  { id: 'TEMPORAL', label: 'Temporal', symbol: '→', description: 'secuencial' },
  { id: 'WORLD', label: 'Mundo', symbol: '⊕', description: 'contexto global' },
];

export function visibleLaboratoryViewMode(mode: LaboratoryViewMode) {
  return laboratoryViewModes.find((item) => item.id === mode)?.label || mode;
}
