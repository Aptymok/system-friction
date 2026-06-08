export const AMV_OBSERVABLE_OBJECTS = [
  'persona',
  'cancion',
  'demo',
  'artista',
  'campana',
  'institucion',
  'cluster',
  'fenomeno',
  'senal',
  'documento',
  'evidencia',
  'decision',
  'accion',
  'red',
  'especie',
  'municipio',
  'ecosistema',
] as const

export type AmvObservableObjectType = (typeof AMV_OBSERVABLE_OBJECTS)[number]

export type AmvObservableObjectDefinition = {
  id: AmvObservableObjectType
  label: string
  minimumEvidence: string
}

export const AMV_OBSERVABLE_OBJECT_DEFINITIONS: Record<AmvObservableObjectType, AmvObservableObjectDefinition> = {
  persona: { id: 'persona', label: 'Persona', minimumEvidence: 'Identidad declarada u observacion con origen.' },
  cancion: { id: 'cancion', label: 'Cancion', minimumEvidence: 'Archivo, URL, letra, demo o metadata declarada.' },
  demo: { id: 'demo', label: 'Demo', minimumEvidence: 'Version, fuente, fecha o archivo identificado.' },
  artista: { id: 'artista', label: 'Artista', minimumEvidence: 'Nombre operativo, obra, registro o fuente externa.' },
  campana: { id: 'campana', label: 'Campana', minimumEvidence: 'Objetivo, canal, ventana y evidencia de ejecucion.' },
  institucion: { id: 'institucion', label: 'Institucion', minimumEvidence: 'Entidad identificable, documento, contacto o fuente publica.' },
  cluster: { id: 'cluster', label: 'Cluster', minimumEvidence: 'Nodos relacionados y criterio de agrupacion.' },
  fenomeno: { id: 'fenomeno', label: 'Fenomeno', minimumEvidence: 'Patron persistente con repeticion o impacto visible.' },
  senal: { id: 'senal', label: 'Senal', minimumEvidence: 'Origen, timestamp y descripcion de entrada.' },
  documento: { id: 'documento', label: 'Documento', minimumEvidence: 'Ruta, URL, checksum, titulo o fuente.' },
  evidencia: { id: 'evidencia', label: 'Evidencia', minimumEvidence: 'Origen conocido y nivel de confianza declarado.' },
  decision: { id: 'decision', label: 'Decision', minimumEvidence: 'Actor, timestamp, razon y consecuencia esperada.' },
  accion: { id: 'accion', label: 'Accion', minimumEvidence: 'Ejecutor, testigo, fecha y resultado observable.' },
  red: { id: 'red', label: 'Red', minimumEvidence: 'Nodos, relaciones y criterio de enlace.' },
  especie: { id: 'especie', label: 'Especie', minimumEvidence: 'Identificacion, fuente y contexto de observacion.' },
  municipio: { id: 'municipio', label: 'Municipio', minimumEvidence: 'Nombre, fuente geografica o documento publico.' },
  ecosistema: { id: 'ecosistema', label: 'Ecosistema', minimumEvidence: 'Limite observado, componentes y fuente.' },
}

export function isAmvObservableObjectType(value: unknown): value is AmvObservableObjectType {
  return typeof value === 'string' && AMV_OBSERVABLE_OBJECTS.includes(value as AmvObservableObjectType)
}
