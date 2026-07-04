import StudioFieldClient from '@/components/studio/StudioFieldClient';
import StudioStartProtocol from '@/components/studio/StudioStartProtocol';

export const dynamic = 'force-dynamic';

export default function StudioPage() {
  return (
    <>
      <StudioStartProtocol />
      <div id="studio-console">
        <StudioFieldClient />
      </div>
    </>
  );
}
