import { InstitutionalCinematicView } from '@/components/sfi/cinematic/InstitutionalCinematicView';
import { readInstitutionalViewState } from '@/lib/sfi/institutionalViewState';

export const dynamic = 'force-dynamic';

export default async function FrictionExplorerPage() {
  const state = await readInstitutionalViewState({ entityId: 'friction', entityType: 'STATE', label: 'Friction explorer' });
  return <InstitutionalCinematicView state={state} focus="FRICTION" brand="SFI FRICTION" subtitle="FRICTION · CONSTRAINT · FIELD PRESSURE" />;
}
