import type { FieldCommandMode } from '@/observatory/components/field/fieldOntology';

export type SurfaceNode = {
  id: string;
  labelVisible: string;
  labelInternal: string;
  commandMode: FieldCommandMode;
  mapsTo: string[];
};

export const surfaceNodes: SurfaceNode[] = [
  { id: 'surface.ruta', labelVisible: 'Ruta', labelInternal: 'Project Manager', commandMode: 'project_manager', mapsTo: ['project_manager'] },
  { id: 'surface.retorno', labelVisible: 'Retorno', labelInternal: 'Social Resonance', commandMode: 'social', mapsTo: ['social'] },
  { id: 'surface.pieza', labelVisible: 'Pieza', labelInternal: 'Media', commandMode: 'media', mapsTo: ['media'] },
  { id: 'surface.registro', labelVisible: 'Registro', labelInternal: 'Bitacora', commandMode: 'logbook', mapsTo: ['logbook'] },
  { id: 'surface.estabilidad', labelVisible: 'Estabilidad', labelInternal: 'MIHM', commandMode: 'mihm', mapsTo: ['mihm'] },
  { id: 'surface.lectura', labelVisible: 'Lectura', labelInternal: 'AMV', commandMode: 'amv', mapsTo: ['amv'] },
  { id: 'surface.mundo', labelVisible: 'Mundo', labelInternal: 'WorldSpect', commandMode: 'ontology', mapsTo: ['worldspect'] },
  { id: 'surface.caso', labelVisible: 'Caso', labelInternal: 'SFI-EVAL-ASSET', commandMode: 'asset_eval', mapsTo: ['asset_eval'] },
  { id: 'surface.ventana', labelVisible: 'Ventana', labelInternal: 'Calendar', commandMode: 'calendar', mapsTo: ['calendar'] },
  { id: 'surface.evidencia', labelVisible: 'Evidencia', labelInternal: 'Evidence', commandMode: 'evidence', mapsTo: ['evidence'] },
  { id: 'surface.estado', labelVisible: 'Estado', labelInternal: 'MIHM/AMV', commandMode: 'mihm', mapsTo: ['mihm', 'amv'] },
  { id: 'surface.hecho', labelVisible: 'Hecho', labelInternal: 'Evidence/Logbook', commandMode: 'evidence', mapsTo: ['evidence', 'logbook'] },
  { id: 'surface.repeticion', labelVisible: 'Repeticion', labelInternal: 'Longitudinal', commandMode: 'longitudinal', mapsTo: ['longitudinal'] },
  { id: 'surface.carga', labelVisible: 'Carga', labelInternal: 'MIHM', commandMode: 'mihm', mapsTo: ['mihm'] },
  { id: 'surface.contenido', labelVisible: 'Contenido', labelInternal: 'Media/MIHM', commandMode: 'media', mapsTo: ['media', 'mihm'] },
  { id: 'surface.riesgo', labelVisible: 'Riesgo', labelInternal: 'MIHM', commandMode: 'mihm', mapsTo: ['mihm'] },
  { id: 'surface.coherencia', labelVisible: 'Coherencia', labelInternal: 'MIHM', commandMode: 'mihm', mapsTo: ['mihm'] },
  { id: 'surface.limite', labelVisible: 'Limite', labelInternal: 'MIHM/Evidence', commandMode: 'evidence', mapsTo: ['mihm', 'evidence'] },
  { id: 'surface.friccion', labelVisible: 'Friccion', labelInternal: 'MIHM', commandMode: 'mihm', mapsTo: ['mihm'] },
  { id: 'surface.latencia', labelVisible: 'Latencia', labelInternal: 'Calendar/Longitudinal', commandMode: 'calendar', mapsTo: ['calendar', 'longitudinal'] },
  { id: 'surface.senal', labelVisible: 'Senal', labelInternal: 'Evidence', commandMode: 'evidence', mapsTo: ['evidence'] },
  { id: 'surface.responsabilidad', labelVisible: 'Responsabilidad', labelInternal: 'Ownership', commandMode: 'project_manager', mapsTo: ['project_manager', 'evidence'] },
  { id: 'surface.recuperacion', labelVisible: 'Recuperacion', labelInternal: 'Intervention/Project Manager', commandMode: 'intervention', mapsTo: ['intervention', 'project_manager'] },
  { id: 'surface.marco', labelVisible: 'Marco', labelInternal: 'Institutional Review', commandMode: 'ontology', mapsTo: ['institutional_review'] },
  { id: 'surface.competencia', labelVisible: 'Competencia', labelInternal: 'Evidence', commandMode: 'evidence', mapsTo: ['evidence'] },
  { id: 'surface.arquitectura', labelVisible: 'Arquitectura', labelInternal: 'System Audit', commandMode: 'ontology', mapsTo: ['system_audit'] },
  { id: 'surface.repo', labelVisible: 'Repo', labelInternal: 'Trace/System Audit', commandMode: 'ontology', mapsTo: ['trace', 'system_audit'] },
  { id: 'surface.persistencia', labelVisible: 'Persistencia', labelInternal: 'Runtime Status', commandMode: 'ontology', mapsTo: ['runtime', 'status'] },
  { id: 'surface.pruebas', labelVisible: 'Pruebas', labelInternal: 'System Audit', commandMode: 'ontology', mapsTo: ['system_audit'] },
  { id: 'surface.intencion', labelVisible: 'Intencion', labelInternal: 'User Intent', commandMode: 'twin', mapsTo: ['twin'] },
  { id: 'surface.siguiente_paso', labelVisible: 'Siguiente paso', labelInternal: 'Next Action', commandMode: 'intervention', mapsTo: ['intervention'] },
  { id: 'surface.continuidad', labelVisible: 'Continuidad', labelInternal: 'Memory Continuity', commandMode: 'longitudinal', mapsTo: ['longitudinal'] },
  { id: 'surface.pendiente', labelVisible: 'Pendiente', labelInternal: 'Open Loop', commandMode: 'longitudinal', mapsTo: ['longitudinal'] },
  { id: 'surface.origen', labelVisible: 'Origen', labelInternal: 'Trace Origin', commandMode: 'evidence', mapsTo: ['evidence'] },
  { id: 'surface.tono', labelVisible: 'Tono', labelInternal: 'World Tone', commandMode: 'ontology', mapsTo: ['worldspect'] },
  { id: 'surface.ruido', labelVisible: 'Ruido', labelInternal: 'World Noise', commandMode: 'ontology', mapsTo: ['worldspect'] },
  { id: 'surface.presion', labelVisible: 'Presion', labelInternal: 'World Pressure', commandMode: 'ontology', mapsTo: ['worldspect'] },
  { id: 'surface.pulso', labelVisible: 'Pulso', labelInternal: 'World Pulse', commandMode: 'ontology', mapsTo: ['worldspect'] },
];

export function findSurfaceNodeByVisibleLabel(label: string) {
  return surfaceNodes.find((node) => node.labelVisible.toLowerCase() === label.toLowerCase());
}
