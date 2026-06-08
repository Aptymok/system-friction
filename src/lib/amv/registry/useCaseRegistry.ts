export type AmvUseCase = {
  id: string
  label: string
  scopeHint: string
  boundary: string
}

export const AMV_USE_CASES: AmvUseCase[] = [
  ['cultura-antes-mercado', 'cultura antes del mercado', 'scorefriction'],
  ['institucion-contemplativa', 'institucion contemplativa', 'governance-reality'],
  ['dolencia-social-creativa', 'dolencia social como insumo creativo', 'scorefriction'],
  ['crisis-disonancia-externa', 'crisis por disonancia externa', 'signal-vane'],
  ['fenomeno-sin-nombre', 'fenomeno sin nombre', 'cluster-atlas'],
  ['deuda-realidad', 'deuda de realidad personal/institucional', 'governance-reality'],
  ['intervencion-minima', 'intervencion minima topologica', 'signal-vane'],
  ['arte-dirigido-campo', 'arte dirigido por campo', 'scorefriction'],
  ['gobernanza-agentes', 'gobernanza de agentes', 'governance-reality'],
  ['inversion-atractores', 'inversion en atractores', 'cluster-atlas'],
  ['simulacion-social', 'simulacion social', 'cognitive-twin-engine'],
  ['alerta-temprana-publica', 'alerta temprana publica', 'signal-vane'],
  ['auditoria-narrativa', 'auditoria de narrativa institucional', 'governance-reality'],
  ['riesgo-acoplamiento', 'riesgo de acoplamiento externo', 'cluster-atlas'],
  ['deteccion-eyector', 'deteccion de eyector institucional', 'governance-reality'],
].map(([id, label, scopeHint]) => ({
  id,
  label,
  scopeHint,
  boundary: 'Caso de uso declarativo; requiere evidencia visible antes de reporte fuerte.',
}))

export function listAmvUseCases() {
  return AMV_USE_CASES
}
