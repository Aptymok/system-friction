import type { Metadata } from 'next';
import { FieldMapConsole } from '@/components/field/map/FieldMapConsole';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'FIELD Map · System Friction Institute',
  description: 'Authenticated geographic field of persisted SFI FIELD observations. No simulated nodes or inferred coordinates.',
  robots: { index: false, follow: false },
};

export default function FieldMapPage() {
  return <FieldMapConsole />;
}
