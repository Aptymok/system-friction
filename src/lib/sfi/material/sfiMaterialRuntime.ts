import { buildSfiProposalRuntime, type SfiProposalRuntimeResult } from '@/lib/sfi/proposals/sfiProposalRuntime';

export type SfiMaterialRuntimeResult = {
  status: 'OK' | 'DEGRADED' | 'BLOCKED';
  material_id: string;
  material_type: SfiProposalRuntimeResult['material_type'];
  title: string;
  body: string;
  image_prompt: string | null;
  song_brief: string | null;
  video_shotlist: string | null;
  atlas_block: string | null;
  report: string;
  approval_required: boolean;
  proposal: SfiProposalRuntimeResult;
};

function lines(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : '- Sin elementos adicionales.';
}

export async function buildSfiMaterialRuntime(): Promise<SfiMaterialRuntimeResult> {
  const proposal = await buildSfiProposalRuntime();
  const contrast = proposal.contrast;
  const materialId = `material-${proposal.proposal_id}`;

  const body = [
    `# ${proposal.title}`,
    '',
    `Objetivo: ${proposal.objective}`,
    '',
    `Estado: ${proposal.status}`,
    `Riesgo: ${proposal.risk}`,
    `MIHM: ${contrast.mihm_regime}`,
    `Confianza: ${contrast.confidence.toFixed(3)}`,
    '',
    '## Cotejo',
    'Coincidencias:',
    lines(contrast.matches),
    '',
    'Divergencias:',
    lines(contrast.divergences),
    '',
    'Riesgos:',
    lines(contrast.risks),
    '',
    'Oportunidades:',
    lines(contrast.opportunities),
    '',
    '## Límite',
    lines(contrast.limits),
  ].join('\n');

  const atlasBlock = [
    '[SFI // ATLAS BLOCK // GENERATED MATERIAL]',
    `case_id: ${contrast.case_id ?? 'unknown'}`,
    `observation_id: ${contrast.observation_id ?? 'unknown'}`,
    `vector_id: ${contrast.vector_id ?? 'unknown'}`,
    `mihm_regime: ${contrast.mihm_regime}`,
    `graph_state: ${contrast.graph_state}`,
    `confidence: ${contrast.confidence.toFixed(3)}`,
    '',
    'Lectura:',
    contrast.matches[0] ?? 'Sin lectura suficiente.',
    '',
    'Dirección:',
    contrast.opportunities[0] ?? 'Mantener observación; no escalar sin evidencia adicional.',
  ].join('\n');

  return {
    status: proposal.status === 'OK' ? 'OK' : 'DEGRADED',
    material_id: materialId,
    material_type: proposal.material_type,
    title: proposal.title,
    body,
    image_prompt: 'Campo negro SFI, nodos finos, líneas blancas, foco dorado mínimo; representar una señal cultural convertida en trazabilidad institucional. Sin ornamento, sin exceso cromático.',
    song_brief: 'Estructura sobria: intro de textura baja, pulso contenido, motivo persistente, cierre sin explosión. Letra mínima sobre persistencia, evidencia y Dirección.',
    video_shotlist: 'Duración 12-18s. Plano 1: campo oscuro con nodo activo. Plano 2: línea de evidencia conectándose. Plano 3: salida editorial en dorado mínimo. Movimiento leve, sin glitch excesivo.',
    atlas_block: atlasBlock,
    report: body,
    approval_required: proposal.approval_required,
    proposal,
  };
}


