import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'WORLD FIELD · Planetary Friction Map · System Friction Institute',
  description: 'Authenticated planetary field for persisted observations, systemic friction, trajectories, hypotheses and observer-relative overlays.',
  robots: { index: false, follow: false },
};

const WORLD_FIELD_RUNTIME = '/field/world-observatory/index.html?v=20260802.1919';

export default function FieldMapPage(): never {
  redirect(WORLD_FIELD_RUNTIME);
}
