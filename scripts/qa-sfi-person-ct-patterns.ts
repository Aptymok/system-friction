import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';

async function text(path: string) { return readFile(path, 'utf8'); }

function blockBetween(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert(start >= 0 && end > start, `unable to isolate ${startMarker} block`);
  return source.slice(start, end);
}

async function main() {
  const [ledger, route, gate, runtimeProfile, projectionProfile, openapiMerge, interactionPolicy, manifest, bootstrap] = await Promise.all([
    text('src/lib/sfi/personal/cognitivePatternLedger.ts'),
    text('src/app/api/external/v1/cognitive/route.ts'),
    text('src/core/cognitive-spine/gates/personInstitutionGate.ts'),
    text('src/core/cognitive-spine/profiles/runtimeGeneral.ts'),
    text('src/core/cognitive-spine/contracts/projectionProfile.ts'),
    text('scripts/merge-openapi-person-ct.mjs'),
    text('src/lib/sfi/humanInteractionPolicy.ts'),
    text('src/app/api/external/v1/manifest/route.ts'),
    text('src/app/api/external/v1/bootstrap/route.ts'),
  ]);

  assert(ledger.includes("export type PersonPatternDimension = 'COGNITION' | 'OBSERVATION'"));
  assert(ledger.includes("'OBSERVED_RECURRENT'"));
  assert(ledger.includes("'SELF_DECLARED'"));
  assert(ledger.includes("support.supportCount < 2"), 'inferred PERSON_CT pattern must require recurrence support');
  assert(ledger.includes(".eq('owner_id', ownerId).in('id', uniqueRuns)"));
  assert(ledger.includes(".eq('owner_id', ownerId).in('id', uniqueEvidence)"));
  assert(ledger.includes("eventName: 'SFI_PERSON_CT_PATTERN_CANDIDATE_RECORDED'"));
  assert(ledger.includes("eventName: confirmed ? 'SFI_PERSON_CT_PATTERN_CONFIRMED' : 'SFI_PERSON_CT_PATTERN_REJECTED'"));
  assert(ledger.includes("institutionalInheritance: 'DENIED_BY_DEFAULT'"));
  assert(ledger.includes('PERSON_CT_PATTERN_ALREADY_TERMINAL'));
  assert(ledger.includes("sourceClass === 'SELF_DECLARED' ? 'declared' : 'inferred'"));

  assert(route.includes("credential.authMethod !== 'oauth' || !credential.subjectId"));
  assert(route.includes("'learn_declared_pattern'"));
  assert(route.includes("if (['propose_pattern', 'confirm_pattern', 'reject_pattern', 'learn_declared_pattern'].includes(operation)) return 'lab:write'"));
  assert(route.includes("if (operation === 'run') return 'lab:run'"));
  assert(route.includes("operation === 'patterns'"));
  assert(route.includes("operation === 'propose_pattern'"));
  assert(route.includes("operation === 'learn_declared_pattern'"));
  assert(route.includes('selfDeclared: true'));
  assert(route.includes("disposition: 'CONFIRMED'"));
  assert(route.includes('Explicit owner request to learn/remember/apply this personal interaction rule.'));
  assert(route.includes("operation === 'confirm_pattern' || operation === 'reject_pattern'"));
  assert(route.includes('A run does not automatically create a PERSON_CT pattern'));

  assert(interactionPolicy.includes("contract: 'SFI-HUMAN-INTERACTION-POLICY-1.0'"));
  assert(interactionPolicy.includes("defaultAudience: 'HUMAN'"));
  assert(interactionPolicy.includes("'WHAT_IS_HAPPENING'"));
  assert(interactionPolicy.includes("'WHY_IT_MATTERS'"));
  assert(interactionPolicy.includes("'WHO_MUST_ACT'"));
  assert(interactionPolicy.includes("'AVAILABLE_OPTIONS'"));
  assert(interactionPolicy.includes("'CONSEQUENCES'"));
  assert(interactionPolicy.includes("'WHAT_HAPPENS_NEXT'"));
  assert(interactionPolicy.includes("'backend implementation jargon'"));
  assert(interactionPolicy.includes('Technical implementation detail is secondary'));
  assert(interactionPolicy.includes('A human cannot exercise meaningful authority over a system state they cannot interpret.'));
  assert(interactionPolicy.includes('explicit request to remember/learn/apply an interaction rule'));
  assert(interactionPolicy.includes('PERSON_CT and is private to the authenticated owner'));
  assert(interactionPolicy.includes('it is not proof of a universal or permanent cognitive trait'));
  assert(manifest.includes('interactionPolicy: SFI_HUMAN_INTERACTION_POLICY'));
  assert(manifest.includes("explicitOwnerLearningOperation: 'learn_declared_pattern'"));
  assert(bootstrap.includes('interactionPolicy: SFI_HUMAN_INTERACTION_POLICY'));
  assert(bootstrap.includes('Human-facing interaction must follow interactionPolicy'));
  assert(bootstrap.includes('learn_declared_pattern operation'));
  assert(bootstrap.includes("'X-SFI-Human-Interaction': SFI_HUMAN_INTERACTION_POLICY.contract"));

  assert(gate.includes('Personal cognitive content does not become institutional state by inheritance'));
  assert(gate.includes("input.disposition === 'ADMITTED'"));
  assert(gate.includes('Boolean(canonicalRecordRef)'));
  assert(gate.includes('Boolean(epistemicAssessmentRef)'));

  const allowedKindsBlock = blockBetween(runtimeProfile, 'allowedRefKinds:', 'deniedRefKinds:');
  const deniedKindsBlock = blockBetween(runtimeProfile, 'deniedRefKinds:', 'fieldVisibilityRules:');
  assert(!allowedKindsBlock.includes("'PERSON_CT'"), 'PERSON_CT must never be allowlisted in runtime general context');
  assert(deniedKindsBlock.includes("'PERSON_CT'"), 'runtime projection must explicitly deny PERSON_CT refs');
  assert(runtimeProfile.includes("personCtInheritance: 'DENIED'"), 'runtime profile must deny PERSON_CT inheritance at field-policy level');
  assert(projectionProfile.includes('return profile.allowedRefKinds.includes(kind) && !profile.deniedRefKinds.includes(kind)'), 'projection evaluator must enforce deny after allow');
  assert(projectionProfile.includes('COGNITIVE_SPINE_PROFILE_ALLOW_DENY_OVERLAP'), 'profile validation must reject contradictory allow/deny configuration');

  assert(openapiMerge.includes("enum: ['state', 'patterns', 'propose_pattern', 'learn_declared_pattern', 'confirm_pattern', 'reject_pattern', 'run']"));
  assert(openapiMerge.includes("enum: ['COGNITION', 'OBSERVATION']"));
  assert(openapiMerge.includes('at least two distinct owner-scoped run/evidence references'));
  assert(openapiMerge.includes('learn_declared_pattern may be used only when the authenticated person explicitly asks'));
  assert(openapiMerge.includes('humanInteractionBoundary'));
  assert(openapiMerge.includes('personCtPatternBoundary'));

  console.log(JSON.stringify({
    ok: true,
    contract: 'SFI-PERSON-CT-PATTERN-QA-1.3',
    invariants: {
      cognitionObservationSeparated: true,
      inferredPatternNeedsRecurrence: true,
      supportMustBeOwned: true,
      runDoesNotAutoLearnPattern: true,
      explicitOwnerLearningMayConfirmInOneOperation: true,
      userResolutionRequiredForInference: true,
      humanFirstInteractionPolicy: true,
      technicalDetailSecondaryByDefault: true,
      gptBootstrapCarriesInteractionPolicy: true,
      runtimeProjectionDeniesPersonCt: true,
      personCtAbsentFromRuntimeAllowlist: true,
      projectionDenyOverridesAllow: true,
      personCtInstitutionalInheritance: false,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
