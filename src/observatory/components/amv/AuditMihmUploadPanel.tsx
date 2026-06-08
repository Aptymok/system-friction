import { buildAuditMihmUploadContract } from '@/lib/amv/core/auditUploadContract'
import { ObjectUploadContractPanel } from './ObjectUploadContractPanel'

export function AuditMihmUploadPanel() {
  return <ObjectUploadContractPanel contract={buildAuditMihmUploadContract()} />
}
