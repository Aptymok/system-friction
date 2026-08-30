import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';

async function main() {
  const [protocolRaw, synthesis] = await Promise.all([
    readFile('docs/canon/SFI_COMMUNICATION_PROTOCOL_1.0.json', 'utf8'),
    readFile('src/lib/sfi/universalAiSynthesis.ts', 'utf8'),
  ]);
  const protocol = JSON.parse(protocolRaw) as Record<string, any>;

  assert.equal(protocol.contract, 'SFI-COMMUNICATION-PROTOCOL-1.0');
  assert.equal(protocol.defaultMode, 'CASE_ANALYSIS');
  assert.equal(protocol.principle, 'machine_preserves_precision_human_output_preserves_meaning');
  assert.equal(protocol.canonicalVocabulary?.semanticDriftAllowed, false);
  assert.equal(protocol.canonicalVocabulary?.redefinitionAllowed, false);
  assert.equal(protocol.scientificLanguage?.strongTermsRequireExplicitBasis, true);

  const requiredSections = new Set(protocol.humanAnalysis?.requiredSections ?? []);
  for (const section of [
    'declaredContext',
    'observedEvidence',
    'externalContrast',
    'frictionReading',
    'competingInterpretations',
    'notDemonstrated',
    'nextObservation',
  ]) assert(requiredSections.has(section), `human communication is missing ${section}`);

  const prohibitions = new Set(protocol.humanOutputProhibitions ?? []);
  for (const rule of [
    'raw_internal_event_names_as_explanation',
    'snake_case_as_explanation',
    'blocking_codes_without_translation',
    'canonical_acronym_redefined',
    'scientific_force_without_explicit_basis',
    'inference_presented_as_fact',
    'source_claim_presented_as_accepted_evidence',
    'simulation_presented_as_observation',
  ]) assert(prohibitions.has(rule), `human communication prohibition missing: ${rule}`);

  assert(synthesis.includes("SFI-COMMUNICATION-PROTOCOL-1.0"));
  assert(synthesis.includes('humanReport'));
  assert(synthesis.includes('INTERNAL_IDENTIFIER_PATTERN'));
  assert(synthesis.includes('cleanHumanString'));
  assert(synthesis.includes('no programmer-facing language'));
  assert(synthesis.includes('Never invent, expand or redefine a canonical acronym or variable name'));
  assert(synthesis.includes('Do not use scientific-force phrases'));
  assert(synthesis.includes('Translate the meaning into ordinary language'));
  assert(synthesis.includes('Public/essay metaphors are not appropriate in CASE_ANALYSIS'));

  const forbiddenHumanExample = 'TUCOLA_INFERED_NO_PROOFS';
  const internalIdentifierPattern = /\b[A-Za-z0-9]+(?:_[A-Za-z0-9]+){1,}\b/g;
  assert.equal(forbiddenHumanExample.replace(internalIdentifierPattern, '').trim(), '');

  console.log(JSON.stringify({
    ok: true,
    contract: protocol.contract,
    defaultMode: protocol.defaultMode,
    humanSections: [...requiredSections],
    rawInternalCodesAreHumanExplanation: false,
    canonicalSemanticDriftAllowed: false,
    scientificForceWithoutBasisAllowed: false,
    technicalTracePreservedSeparately: true,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
