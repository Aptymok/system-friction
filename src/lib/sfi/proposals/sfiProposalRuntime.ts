import type { SfiContrastRuntimeResult } from '@/lib/sfi/contrast/sfiContrastRuntime';
export type SfiProposalRuntimeResult = { [key: string]: any };
import { buildSfiContrastRuntime } from '@/lib/sfi/contrast/sfiContrastRuntime';

function firstText(items: unknown[], fallback: string): string {
  const found = items.find((item: unknown) => typeof item === 'string' && item.length > 0);
  return typeof found === 'string' ? found : fallback;
}

export async function buildSfiProposalRuntime() {
  const contrast = await buildSfiContrastRuntime() as SfiContrastRuntimeResult;

  const risks = Array.isArray(contrast.risks) ? contrast.risks : [];
  const opportunities = Array.isArray(contrast.opportunities) ? contrast.opportunities : [];

  const risk = risks.length > 0 ? 'medium' : 'low';
  const material_type = risks.includes('regimen_mihm_critical') ? 'report' : 'atlas_page';
  const target_medium = material_type === 'report' ? 'internal_log' : 'Atlas';

  return {
    ok: Boolean(contrast.ok),
    status: contrast.status === 'OK' ? 'OK' : 'DEGRADED',
    proposal_id: `proposal-${Date.now()}`,
    title: 'Propuesta SFI derivada de cotejo operativo',
    objective: firstText(opportunities, 'Convertir observación viva en material revisable de baja inyección.'),
    target_medium,
    material_type,
    rationale: {
      matches: contrast.matches ?? [],
      divergences: contrast.divergences ?? [],
      opportunities,
    },
    risk,
    required_inputs: [
      'observacion',
      'vector',
      'mihm',
      'cotejo',
    ],
    expected_output: material_type === 'report'
      ? 'reporte operativo revisable'
      : 'bloque Atlas revisable',
    approval_required: risk !== 'low',
    contrast,
  };
}

