import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'WORLD Field Observatory · System Friction Institute',
  description: 'Authenticated planetary observatory for real persisted observations, SFI readings, hypotheses, calibration and learning.',
  robots: { index: false, follow: false },
};

export default function FieldMapPage() {
  return (
    <main className="relative h-screen w-full overflow-hidden bg-black">
      <iframe
        src="/field/world-observatory/index.html"
        title="SFI WORLD Field Observatory"
        className="absolute inset-0 h-full w-full border-0"
        allow="fullscreen"
      />
    </main>
  );
}
