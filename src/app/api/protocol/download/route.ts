import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { generateSystemProtocol } from '@/lib/actions/generate-protocol';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) return new NextResponse("No autorizado", { status: 401 });

  const data = await generateSystemProtocol(session.user.id);
  const { dictamen } = data;

  // Inyectamos los datos en tu Template HTML
  const htmlContent = `
    <div class="relacion-critica">"${dictamen.fractura}"</div>
    <div class="metric-val c-gold">${dictamen.verdad_score}%</div>
    <div class="relacion-critica" style="font-size: 16pt;">"${dictamen.accion_inmediata}"</div>
    `;

  return new NextResponse(htmlContent, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': 'attachment; filename=Dictamen_Ontologico_SFI.html',
    },
  });
}