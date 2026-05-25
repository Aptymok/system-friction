import type { PatternRankResult } from '@/observatory/field/patternActivation';
import type { FieldMode } from '@/observatory/field/patternModel';
import { assertObservationClaim } from '@/observatory/source/assertObservationClaim';
import { buildWorldSpectReading } from '@/observatory/worldspect/buildWorldSpectReading';
import { detectWorldSpectTriggers } from '@/observatory/worldspect/detectWorldSpectTriggers';
import { worldSpectTriggers } from '@/observatory/worldspect/worldSpectTriggers';
import type { SocialDraft, WorldSpectDraftReview } from './socialDraftTypes';

type WorldSpectDraftContext = {
  activeNode?: { id?: string | null; label?: string | null; commandMode?: string | null } | string | null;
  fieldMode?: FieldMode | string | null;
  rankedPatterns?: PatternRankResult | null;
  mihmState?: {
    IHG?: number | null;
    NTI_obs?: number | null;
    LDI_hours?: number | null;
    PHI_SF?: number | null;
    regime?: string | null;
  } | null;
  recentEvents?: Array<{ event_name?: string; event_type?: string; payload?: Record<string, unknown> }>;
};

export function reviewDraftWithWorldSpect(draft: SocialDraft, context: WorldSpectDraftContext = {}): WorldSpectDraftReview {
  const detection = detectWorldSpectTriggers({
    command: `${draft.text} ${draft.objective} ${draft.network}`,
    activeNode: context.activeNode,
    fieldMode: context.fieldMode,
    rankedPatterns: context.rankedPatterns,
    mihmState: context.mihmState,
    recentEvents: context.recentEvents,
  });
  const trigger = detection.primaryTrigger || worldSpectTriggers.TR_PUBLICATION_INTENT;
  const reading = buildWorldSpectReading({
    trigger,
    variables: detection.variables.length ? detection.variables : trigger.activatesVariables,
    rankedPatterns: context.rankedPatterns,
    activeNode: context.activeNode,
    intent: 'social_draft',
    mihmState: context.mihmState,
    recentEvents: context.recentEvents,
  });
  const claim = assertObservationClaim({
    claim: reading.meaning,
    sourceDescriptor: reading.sourceDescriptor,
    requestedScope: ['platform', 'social'],
  });

  return {
    reading: {
      ...reading,
      meaning: claim.visibleNotice ? `${claim.visibleNotice} ${claim.claim}` : claim.claim,
    },
    visibleReading: `Veo:\n${reading.triggerSummary}\n\nSignifica:\n${claim.visibleNotice ? `${claim.visibleNotice} ${claim.claim}` : claim.claim}\n\nSigue:\n${reading.suggestedAction}`,
    suggestedFixes: [
      'Validar intencion antes de publicacion.',
      'No tratar esta lectura como retorno real.',
    ],
    sourceDescriptor: reading.sourceDescriptor,
  };
}
