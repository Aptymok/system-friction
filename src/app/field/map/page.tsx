import type { Metadata } from 'next';
import { WorldFieldShell } from '@/components/field/map/WorldFieldShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'WORLD FIELD · Planetary Friction Map · System Friction Institute',
  description: 'Authenticated planetary field for persisted observations, systemic friction, trajectories, hypotheses and observer-relative overlays.',
  robots: { index: false, follow: false },
};

export default function FieldMapPage() {
  return <WorldFieldShell />;
}
