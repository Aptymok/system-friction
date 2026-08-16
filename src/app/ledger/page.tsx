import { InstitutionalCinematicView } from '@/components/sfi/cinematic/InstitutionalCinematicView';
import { readInstitutionalViewState } from '@/lib/sfi/institutionalViewState';

export const dynamic = 'force-dynamic';

export default async function LedgerPage() {
  const state = await readInstitutionalViewState({ entityId: 'ledger', entityType: 'REPORT', label: 'Institutional ledger' });
  return <InstitutionalCinematicView state={state} focus="LEDGER" brand="SFI LEDGER" subtitle="TRACEABILITY · EVIDENCE · PROJECTION · MEMORY" />;
}
