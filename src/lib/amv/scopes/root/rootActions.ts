import type { AmvDecision } from '../../core/amvTypes'

export type RootAction = {
  id: string
  label: string
  route: string
  risk: AmvDecision['risk']
}

export const ROOT_ACTIONS: RootAction[] = [
  {
    id: 'root.observe',
    label: 'Observar evidencia visible',
    route: 'Revisar evidencia visible antes de ejecutar cambios.',
    risk: 'low',
  },
  {
    id: 'root.close',
    label: 'Cerrar con criterio verificable',
    route: 'Cerrar solo si hay evento, evidencia y criterio de salida.',
    risk: 'medium',
  },
  {
    id: 'root.freeze',
    label: 'Congelar riesgo',
    route: 'Bloquear ejecucion y sostener revision humana.',
    risk: 'hard_stop',
  },
]

export function dominantRootAction(risk: AmvDecision['risk']): RootAction {
  if (risk === 'hard_stop' || risk === 'high') return ROOT_ACTIONS[2]
  if (risk === 'medium') return ROOT_ACTIONS[1]
  return ROOT_ACTIONS[0]
}
