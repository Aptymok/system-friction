import { AMV_USE_CASES } from '../registry/useCaseRegistry'

export function getUseCaseTemplate(id: string) {
  return AMV_USE_CASES.find((useCase) => useCase.id === id)
}
