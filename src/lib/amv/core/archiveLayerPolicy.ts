import type { AmvEvidenceTrust } from './evidenceTypes'

export type AmvArchiveLayer =
  | 'sfi_archive'
  | 'living_observatory'
  | 'attractor'
  | 'sandbox'
  | 'technical_audit'

export type AmvArchiveLayerPolicy = {
  layer: AmvArchiveLayer
  purpose: string
  allowedEvidenceTrust: AmvEvidenceTrust[]
  canGovernPrimaryExperience: boolean
  canFeedRegime: boolean
}

export const AMV_ARCHIVE_LAYER_POLICY: Record<AmvArchiveLayer, AmvArchiveLayerPolicy> = {
  sfi_archive: {
    layer: 'sfi_archive',
    purpose: 'Corpus, documentos fundacionales, patrones historicos y memoria no activa.',
    allowedEvidenceTrust: ['verified', 'declared', 'audit', 'unknown'],
    canGovernPrimaryExperience: false,
    canFeedRegime: false,
  },
  living_observatory: {
    layer: 'living_observatory',
    purpose: 'Senales activas, evidencia vigente, WSV, MIHM y mutaciones abiertas.',
    allowedEvidenceTrust: ['verified', 'declared', 'inferred'],
    canGovernPrimaryExperience: true,
    canFeedRegime: true,
  },
  attractor: {
    layer: 'attractor',
    purpose: 'Elementos con peso direccional suficiente para afectar tendencia.',
    allowedEvidenceTrust: ['verified'],
    canGovernPrimaryExperience: true,
    canFeedRegime: true,
  },
  sandbox: {
    layer: 'sandbox',
    purpose: 'Pruebas, simulaciones, fixtures y datos sin origen suficiente.',
    allowedEvidenceTrust: ['simulated', 'sandbox', 'unknown'],
    canGovernPrimaryExperience: false,
    canFeedRegime: false,
  },
  technical_audit: {
    layer: 'technical_audit',
    purpose: 'Logs, trazabilidad, eventos internos y linaje tecnico secundario.',
    allowedEvidenceTrust: ['audit', 'verified', 'unknown'],
    canGovernPrimaryExperience: false,
    canFeedRegime: false,
  },
}

export function canTrustEnterArchiveLayer(trust: AmvEvidenceTrust, layer: AmvArchiveLayer) {
  return AMV_ARCHIVE_LAYER_POLICY[layer].allowedEvidenceTrust.includes(trust)
}
