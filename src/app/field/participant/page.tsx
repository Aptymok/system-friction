import type { Metadata } from 'next';
import { ParticipantWindowConsole } from '@/components/field/ParticipantWindowConsole';
import { SfiSurfaceGuide } from '@/components/sfi/SfiSurfaceGuide';
import { createServerSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'FIELD · ventana de observación longitudinal · SFI',
  description: 'Conserva apariciones durante una ventana longitudinal sin convertirlas inmediatamente en diagnóstico o conclusión.',
  alternates: { canonical: '/field/participant' },
};

export default async function ParticipantFieldPage() {
  const supabase = await createServerSupabaseClient();
  const { data: auth } = await supabase.auth.getUser();

  return (
    <>
      <SfiSurfaceGuide
        current="field"
        eyebrow="SFI · ventana de observación"
        title="Conserva lo que aparece. La interpretación puede esperar."
        description="Durante esta ventana sólo se registra la aparición y, cuando esté disponible, su contexto. La repetición, la persistencia y los cambios posteriores serán los que permitan formular una lectura más sólida."
      />
      <ParticipantWindowConsole authenticated={Boolean(auth.user)} />
    </>
  );
}
