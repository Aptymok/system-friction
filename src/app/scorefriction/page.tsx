import { ScoreFrictionFieldExperience } from '@/scorefriction/components/ScoreFrictionFieldExperience';
import CanonicalWorldSpectStatus from '@/components/worldspect/CanonicalWorldSpectStatus';

export const dynamic = 'force-dynamic';

export default function ScoreFrictionPage() {
  return (
    <>
      <CanonicalWorldSpectStatus surface="scorefriction" />
      <ScoreFrictionFieldExperience />
    </>
  );
}

