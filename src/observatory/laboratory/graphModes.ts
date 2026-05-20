export type GraphMode = 'CSCG' | 'HGPM' | 'TGPM' | 'GPM' | 'R_HGN' | 'GCNT' | 'SONG' | 'NGE';

export const graphModeLabels: Record<GraphMode, string> = {
  CSCG: 'Planificacion flexible',
  HGPM: 'Interaccion multiple',
  TGPM: 'Evolucion temporal',
  GPM: 'Subestructura relevante',
  R_HGN: 'Eleccion por entorno',
  GCNT: 'Atencion sobre grafo',
  SONG: 'Auto-organizacion',
  NGE: 'Evolucion de diseno',
};

export function visibleGraphMode(mode: GraphMode) {
  return graphModeLabels[mode];
}
