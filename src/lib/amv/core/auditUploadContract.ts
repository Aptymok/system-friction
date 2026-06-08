import { buildUploadContract } from './uploadContract'

export function buildAuditMihmUploadContract() {
  return {
    ...buildUploadContract('audit_mihm'),
    requiredEvidence: ['objeto MIHM', 'campo observado', 'fuente', 'timestamp', 'criterio de auditoria'],
  }
}
