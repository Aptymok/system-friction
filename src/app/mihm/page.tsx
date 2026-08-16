import { InstitutionalCinematicView } from '@/components/sfi/cinematic/InstitutionalCinematicView';
import { readInstitutionalViewState } from '@/lib/sfi/institutionalViewState';

export const dynamic = 'force-dynamic';

export default async function MihmPage() {
  const state = await readInstitutionalViewState({ entityId: 'mihm', entityType: 'STATE', label: 'MIHM institutional state' });
  return <InstitutionalCinematicView state={state} focus="MIHM" brand="SFI · MIHM" subtitle="MULTIDIMENSIONAL INSTITUTIONAL STATE" />;
}
