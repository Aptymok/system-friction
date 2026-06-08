import type { AmvDecision, AmvVisibleResponse } from './amvTypes'

function sentence(value: string, fallback: string) {
  const clean = value.replace(/\s+/g, ' ').trim()
  if (!clean) return fallback
  return clean.length > 180 ? `${clean.slice(0, 177).trim()}...` : clean
}

export function compressAmvResponse(decision: AmvDecision): AmvVisibleResponse {
  return {
    evento: sentence(decision.event, 'Senal recibida.'),
    resultado: sentence(decision.result, 'Lectura estable.'),
    efecto: sentence(decision.effect, 'No se ejecutan cambios sin evidencia suficiente.'),
    ventana: sentence(decision.window, 'Revisar en el siguiente ciclo operativo.'),
    ruta_unica: sentence(decision.route, 'Mantener observacion y no abrir rutas paralelas.'),
  }
}
