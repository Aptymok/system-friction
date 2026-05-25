import { createObservationSourceDescriptor } from '@/observatory/source/sourceStateTypes';
import type { MihmDraftReview, SocialDraft } from './socialDraftTypes';

type MihmDraftContext = {
  objective?: string | null;
  evidencePresent?: boolean;
  assetState?: {
    IHG?: number | null;
    NTI_obs?: number | null;
    LDI_hours?: number | null;
    PHI_SF?: number | null;
    regime?: string | null;
  } | null;
};

function clamp(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

function visibleRisk(score: number | null): MihmDraftReview['riskLevel'] {
  if (score === null) return 'unknown';
  if (score >= 0.68) return 'high';
  if (score >= 0.38) return 'medium';
  return 'low';
}

export function analyzeDraftWithMihm(draft: SocialDraft, context: MihmDraftContext = {}): MihmDraftReview {
  const text = draft.text.trim();
  const words = text ? text.split(/\s+/).length : 0;
  const hasObjective = Boolean((draft.objective || context.objective || '').trim());
  const hasEvidence = Boolean(context.evidencePresent);
  const ldi = context.assetState?.LDI_hours;
  const phi = context.assetState?.PHI_SF;

  const clarityScore = text
    ? clamp((words >= 8 ? 0.34 : 0.16) + (words <= 90 ? 0.3 : 0.12) + (/[.!?]$/.test(text) ? 0.12 : 0) + (hasObjective ? 0.18 : 0))
    : null;
  const traceScore = clamp((hasObjective ? 0.36 : 0.12) + (hasEvidence ? 0.34 : 0) + (draft.network !== 'unknown' ? 0.16 : 0));
  const frictionScore = clamp((clarityScore === null ? 0.55 : 1 - clarityScore) + (traceScore < 0.4 ? 0.18 : 0) + (typeof ldi === 'number' && ldi > 72 ? 0.16 : 0) + (typeof phi === 'number' && phi < 0.3 ? 0.12 : 0));
  const suggestedFixes = [
    clarityScore !== null && clarityScore < 0.55 ? 'Reducir la pieza a una afirmacion verificable.' : '',
    traceScore < 0.45 ? 'Anclar origen, evidencia o intencion antes de aprobar.' : '',
    frictionScore > 0.65 ? 'Bajar impacto y pedir revision humana.' : '',
  ].filter(Boolean);

  return {
    clarityScore,
    traceScore,
    frictionScore,
    riskLevel: visibleRisk(frictionScore),
    suggestedFixes,
    visibleReading: `Veo:\nHay un borrador social en preparacion.\n\nSignifica:\n${traceScore < 0.45 ? 'La trazabilidad todavia es limitada.' : 'La pieza tiene origen operativo suficiente.'}\n\nSigue:\n${suggestedFixes[0] || 'Revisar WorldSpect antes de aprobar.'}`,
    sourceDescriptor: createObservationSourceDescriptor({
      sourceState: 'MIHM_INTERNAL',
      confidence: 'limited',
      isExternal: false,
      isSimulated: false,
    }),
  };
}
