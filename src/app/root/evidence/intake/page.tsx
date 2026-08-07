import { requireFounderPage } from '@/lib/root/server';
import { SimpleEvidenceIntake } from '@/components/root/evidence/SimpleEvidenceIntake';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function RootEvidenceIntakePage() {
  await requireFounderPage('/root/evidence/intake');
  return <SimpleEvidenceIntake />;
}
