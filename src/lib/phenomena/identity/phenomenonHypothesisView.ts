import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { getPhenomenonState } from '@/lib/ppoi/ppoiService';

/**
 * Phenomenon Hypothesis View — capa de LECTURA, no de escritura.
 *
 * No reemplaza ppoi_hypotheses, studio_hypotheses ni el pipeline de
 * cultural-lab. No los fusiona en una tabla nueva. Solo cambia la pregunta
 * que se le puede hacer al sistema: en vez de consultar cada módulo por
 * separado, se consulta "¿qué observadores tienen algo que decir sobre
 * este fenómeno?" y esta capa va a buscar la respuesta a cada uno donde
 * ya vive.
 *
 * El puente entre PPOI y Studio es el que ya existe:
 * ppoi_phenomena.related_studio_object_id. No se inventó ninguno nuevo.
 */

export type ObservedHypothesis = {
  fuente: 'PPOI' | 'STUDIO' | 'CULTURAL';
  disponible: boolean;
  razonNoDisponible?: string;
  items: Array<{
    id: string;
    resumen: string;
    detalle: string | null;
    severidadOAccion: string | null;
    creadaEn: string | null;
  }>;
};

export type PhenomenonHypothesisView = {
  phenomenonId: string;
  relatedStudioObjectId: string | null;
  observadores: ObservedHypothesis[];
};

export async function getPhenomenonHypothesisView(
  ownerId: string,
  phenomenonId: string,
): Promise<PhenomenonHypothesisView> {
  const state = await getPhenomenonState(ownerId, phenomenonId);
  const relatedStudioObjectId =
    (state.phenomenon as unknown as { related_studio_object_id?: string | null })
      .related_studio_object_id ?? null;

  const observadores: ObservedHypothesis[] = [];

  // --- Observador 1: PPOI (ciclo de vida del fenómeno) ---
  const ppoiHypothesis = state.currentHypothesis as Record<string, unknown> | null;
  observadores.push({
    fuente: 'PPOI',
    disponible: Boolean(ppoiHypothesis),
    razonNoDisponible: ppoiHypothesis ? undefined : 'Todavía no hay hipótesis PPOI — falta recalibrar con evidencia.',
    items: ppoiHypothesis
      ? [
          {
            id: String(ppoiHypothesis.id ?? 'ppoi-current'),
            resumen: `Dirección: ${String(ppoiHypothesis.direction ?? 'sin dato')}`,
            detalle: (ppoiHypothesis.rationale as string) ?? null,
            severidadOAccion: null,
            creadaEn: (ppoiHypothesis.created_at as string) ?? null,
          },
        ]
      : [],
  });

  // --- Observador 2: Studio (hipótesis técnicas del objeto vinculado) ---
  if (relatedStudioObjectId) {
    try {
      const client = createServiceSupabaseClient();
      const { data, error } = await client
        .from('studio_hypotheses')
        .select('id, origin, severity, statement, recommended_change, created_at')
        .eq('object_id', relatedStudioObjectId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw new Error(error.message);

      observadores.push({
        fuente: 'STUDIO',
        disponible: Boolean(data && data.length),
        razonNoDisponible: data && data.length ? undefined : 'El objeto de Studio vinculado todavía no tiene hipótesis generadas.',
        items: (data ?? []).map((row) => ({
          id: String(row.id),
          resumen: `[${row.origin}] ${String(row.statement ?? '')}`.slice(0, 200),
          detalle: (row.recommended_change as string) ?? null,
          severidadOAccion: (row.severity as string) ?? null,
          creadaEn: (row.created_at as string) ?? null,
        })),
      });
    } catch (err) {
      observadores.push({
        fuente: 'STUDIO',
        disponible: false,
        razonNoDisponible: err instanceof Error ? err.message : 'No se pudo leer Studio.',
        items: [],
      });
    }
  } else {
    observadores.push({
      fuente: 'STUDIO',
      disponible: false,
      razonNoDisponible: 'Este fenómeno no tiene un objeto de Studio vinculado (related_studio_object_id vacío).',
      items: [],
    });
  }

  // --- Observador 3: Cultural-lab (hipótesis de género/campo emergente) ---
  // El pipeline de cultural-lab (emergenceAgent, projectionAgent, etc.) hoy
  // NO persiste su resultado en ninguna tabla — corre en memoria y devuelve
  // el trace directo al que lo llamó (ver src/lib/studio/cultural-lab/pipeline.ts).
  // No hay nada que leer todavía. Esto se resuelve en la Fase B ("completar
  // cultural-lab con datos reales"), no aquí — reportarlo como no
  // disponible es la respuesta honesta, no un hueco a rellenar con datos
  // inventados.
  observadores.push({
    fuente: 'CULTURAL',
    disponible: false,
    razonNoDisponible: 'El pipeline de cultural-lab no persiste resultados todavía (no guarda en base de datos) — pendiente para Fase B.',
    items: [],
  });

  return {
    phenomenonId,
    relatedStudioObjectId,
    observadores,
  };
}
