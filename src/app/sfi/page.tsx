import { InstitutionalCinematicView } from '@/components/sfi/cinematic/InstitutionalCinematicView';
import { readInstitutionalViewState } from '@/lib/sfi/institutionalViewState';

export const dynamic = 'force-dynamic';

export default async function SfiOperationalPage() {
  const state = await readInstitutionalViewState({ entityId: 'sfi', entityType: 'ORGANIZATION', label: 'System Friction Institute' });
  return <InstitutionalCinematicView state={state} focus="SFI" brand="SYSTEM FRICTION INSTITUTE" subtitle="INSTITUTIONAL OPERATING FIELD" />;
}
