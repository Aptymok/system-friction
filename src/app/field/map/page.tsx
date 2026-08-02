import type { Metadata } from 'next';
import { WorldFieldObservatory } from '@/components/field/map/WorldFieldObservatory';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'WORLD Field Observatory · System Friction Institute',
  description: 'Authenticated WORLD observatory for real observations, systemic-friction readings, hypotheses, automatic calibration and learning.',
  robots: { index: false, follow: false },
};

export default function FieldMapPage() {
  return <WorldFieldObservatory />;
}
