import type { Metadata } from 'next';
import { WorldFieldObservatory } from '@/components/field/map/WorldFieldObservatory';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Campo Mundial · señales localizadas · SFI',
  description: 'Exploración localizada de señales, eventos y tensiones observadas por System Friction Institute.',
};

export default function FieldMapPage() {
  return <WorldFieldObservatory />;
}
