import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function generateSystemProtocol(userId: string) {
  const supabase = createServerComponentClient({ cookies });

  const { data: intake } = await supabase
    .from('events')
    .select('metadata, created_at')
    .eq('user_id', userId)
    .eq('type', 'INTAKE_DATA')
    .order('created_at', { ascending: false })
    .single();

  if (!intake) throw new Error("Señal no detectada.");

  const r = intake.metadata.responses;

  // LÓGICA MOP-H AUTOMATIZADA
  // OLC-A: Detectar "Gramática de la Evasión" (Si usa verbos en futuro excesivamente)
  const evasionKeywords = ["voy a", "espero", "intentaré", "mañana", "luego"];
  const tieneEvasion = r[0].toLowerCase().split(" ").some((w: string) => evasionKeywords.includes(w));
  
  // OLC-B: Detectar Bifurcación (Duda)
  const tieneDuda = r[3].includes("o") || r[3].includes("tal vez");

  return {
    // Aquí inyectamos el análisis de Gemini/Sistema al Template
    dictamen: {
      fractura: tieneEvasion ? "EVASIÓN T+N DETECTADA: El sistema posterga la ejecución." : "INTENCIÓN BINARIA VALIDADA.",
      friccion_status: tieneDuda ? "BIFURCACIÓN CRÍTICA: Inestabilidad en la toma de decisión." : "ATRACTOR ÚNICO IDENTIFICADO.",
      verdad_score: r[11],
      accion_inmediata: r[8], // P9
      fecha_limite: "72 HORAS (Días Hábiles)",
      respuestas: r // Todas las respuestas para el mapeo del HTML
    }
  };
}