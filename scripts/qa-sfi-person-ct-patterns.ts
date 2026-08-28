import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';

async function text(path: string) { return readFile(path, 'utf8'); }

async function main() {
  const [ledger, route, gate, runtimeProfile, projectionProfile, openapiMerge] = await Promise.all([
    text('src/lib/sfi/personal/cognitivePatternLedger.ts'),
    text('src/app/api/external/v1/cognitive/route.ts'),
    text('src/core/cognitive-spine/gates/personInstitutionGate.ts'),
    text('src/core/cognitive-spine/profiles/runtimeGeneral.ts'),
    text('src/core/cognitive-spine/contracts/projectionProfile.ts'),
    text('scripts/merge-openapi-person-ct.mjs'),
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
  assert(route.includes("if (['propose_pattern', 'confirm_pattern', 'reject_pattern'].includes(operation)) return 'lab:write'"));
  assert(route.includes("if (operation === 'run') return 'lab:run'"));
  assert(route.includes("operation === 'patterns'"));
  assert(route.includes("operation === 'propose_pattern'"));
  assert(route.includes("operation === 'confirm_pattern' || operation === 'reject_pattern'"));
  assert(route.includes('A run does not automatically create a PERSON_CT pattern'));

  assert(gate.includes('Personal cognitive content does not become institutional state by inheritance'));
  assert(gate.includes("input.disposition === 'ADMITTED'"));
  assert(gate.includes('Boolean(canonicalRecordRef)'));
  assert(gate.includes('Boolean(epistemicAssessmentRef)'));

  assert(runtimeProfile.includes("deniedRefKinds: ['PERSON_CT']"), 'runtime projection must explicitly deny PERSON_CT refs');
  assert(runtimeProfile.includes("personCtInheritance: 'DENIED'"), 'runtime profile must deny PERSON_CT inheritance at field-policy level');
  assert(!runtimeProfile.match(/allowedRefKinds:\s*\[[\s\S]*?'PERSON_CT'/), 'PERSON_CT must never be allowlisted in runtime general context');
  assert(projectionProfile.includes('return profile.allowedRefKinds.includes(kind) && !profile.deniedRefKinds.includes(kind)'), 'projection evaluator must enforce deny after allow');
  assert(projectionProfile.includes('COGNITIVE_SPINE_PROFILE_ALLOW_DENY_OVERLAP'), 'profile validation must reject contradictory allow/deny configuration');

  assert(openapiMerge.includes("enum: ['state', 'patterns', 'propose_pattern', 'confirm_pattern', 'reject_pattern', 'run']"));
  assert(openapiMerge.includes("enum: ['COGNITION', 'OBSERVATION']"));
  assert(openapiMerge.includes('at least two distinct owner-scoped run/evidence references'));
  assert(openapiMerge.includes('personCtPatternBoundary'));

  console.log(JSON.stringify({
    ok: true,
    contract: 'SFI-PERSON-CT-PATTERN-QA-1.1',
    invariants: {
      cognitionObservationSeparated: true,
      inferredPatternNeedsRecurrence: true,
      supportMustBeOwned: true,
      runDoesNotAutoLearnPattern: true,
      userResolutionRequired: true,
      runtimeProjectionDeniesPersonCt: true,
      projectionDenyOverridesAllow: true,
      personCtInstitutionalInheritance: false,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
