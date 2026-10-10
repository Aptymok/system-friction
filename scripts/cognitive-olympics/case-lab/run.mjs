// SFI CHRONOS local laboratory lane. No network, database, canonical writers or institutional execution.
// All generated reconstruction/forecast content is hypothetical and must never enter Reality Chain as evidence.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MODES = Object.freeze(['backcast', 'forecast']);
const CLASSES = new Set(['INFERRED', 'SIMULATED']);
const OUTCOMES = new Set(['HYPOTHETICAL', 'POSSIBLE', 'UNRESOLVED']);

export function assertFixture(fixture) {
  if (!fixture || fixture.contract !== 'SFI-CHRONOS-SYNTHETIC-CASE-1.0') throw new Error('WRONG_LAB_FIXTURE_CONTRACT');
  if (fixture.status !== 'SYNTHETIC_EXERCISE_ONLY' || fixture.epistemicClass !== 'SIMULATED') throw new Error('NOT_SYNTHETIC');
  const b = fixture.boundaries || {};
  for (const flag of ['syntheticNeverEvidence', 'historicalReplayNotProspective']) if (b[flag] !== true) throw new Error('SAFETY_BOUNDARY_MISSING:' + flag);
  for (const flag of ['realityChainAdmission','canonicalMutation','governanceAuthority','worldReturnMinting','executionAllowed','publishAsObserved']) {
    if (b[flag] !== false) throw new Error('FORBIDDEN_SAFETY_CAPABILITY:' + flag);
  }
  for (const name of ['initial', 'authority', 'return']) {
    const anchor = fixture.anchors?.[name];
    if (!anchor || anchor.class !== 'SIMULATED' || !anchor.id?.startsWith('LAB-SYN-')) throw new Error('UNSAFE_ANCHOR:' + name);
  }
  if (!fixture.realReference || fixture.realReference.classification !== 'ARTIFACT_EXISTENCE_ONLY') throw new Error('REAL_REFERENCE_BOUNDARY_MISSING');
  if (fixture.realReference.realEventOccurred !== 'UNVERIFIED_FROM_METADATA_ALONE') throw new Error('REAL_EVENT_WRONGLY_VERIFIED');
  return fixture;
}

export function buildLabInput(fixture, mode) {
  assertFixture(fixture);
  if (!MODES.includes(mode)) throw new Error('MODE_NOT_SUPPORTED');
  // Backcast may examine the FICTIONAL terminal return. Forecast cannot.
  const allowed = mode === 'backcast' ? ['initial','authority','return'] : ['initial','authority'];
  const cutoff = mode === 'backcast' ? fixture.cutoffs.reconstruction : fixture.cutoffs.forecast;
  for (const name of allowed) if (Date.parse(fixture.anchors[name].at) > Date.parse(cutoff)) {
    throw new Error('POST_CUTOFF_ANCHOR:' + name);
  }
  return {
    contract: fixture.contract,
    caseId: fixture.id,
    title: fixture.title,
    exercise: mode === 'backcast' ? 'RETRODICTION_OF_MISSING_STEPS' : 'RETROSPECTIVE_FORECAST_EXERCISE',
    cutoff,
    epistemicClass: 'SIMULATED',
    evidenceRefs: [],
    // This object deliberately contains no real observations or subsequent recording metadata.
    anchors: Object.fromEntries(allowed.map(name => [name, fixture.anchors[name]])),
    instructions: mode === 'backcast'
      ? 'Propose rival inferential paths and possible intervening executions. Do not claim any candidate really occurred.'
      : 'From prior fictional anchors only, predict a near-future outcome in conditional language. No hindsight, no claim of real prospective success.',
    restrictions: ['NO_REALITY_CHAIN','NO_OBSERVED_EVIDENCE','NO_CANONICAL_PROMOTION','NO_REAL_EXECUTION','NO_EXTERNAL_RETURN']
  };
}

export function buildBaselineCandidate(input) {
  const refs = Object.values(input.anchors).map(anchor => anchor.id);
  if (input.exercise === 'RETRODICTION_OF_MISSING_STEPS') return {
    candidateId: 'LAB-HEURISTIC-BACKCAST-001',
    producedBy: 'DETERMINISTIC_BASELINE_NOT_LLM',
    phase: input.exercise,
    inferences: [
      { id: 'H1', epistemicClass: 'INFERRED', certainty: 'HYPOTHETICAL', basisRefs: refs, proposition: 'A scheduling and participant-preparation path could connect the fictional plan and authorized rehearsal to the fictional terminal return.' },
      { id: 'H2', epistemicClass: 'INFERRED', certainty: 'POSSIBLE', basisRefs: refs, proposition: 'An earlier test session or alternative workflow could produce a similar terminal description without the originally planned presentation happening.' }
    ],
    executionCandidates: [
      { id: 'A1', epistemicClass: 'SIMULATED', executionState: 'NOT_EXECUTED', basisRefs: refs, proposedAction: 'Hypothetical: prepare virtual session materials and convene an authorized test.' },
      { id: 'A2', epistemicClass: 'SIMULATED', executionState: 'NOT_EXECUTED', basisRefs: refs, proposedAction: 'Hypothetical: launch a simulated remote session and close the exercise.' }
    ]
  };
  return {
    candidateId: 'LAB-HEURISTIC-FORECAST-001',
    producedBy: 'DETERMINISTIC_BASELINE_NOT_LLM',
    phase: input.exercise,
    inferences: [
      { id: 'F1', epistemicClass: 'INFERRED', certainty: 'POSSIBLE', basisRefs: refs, proposition: 'A virtual event may happen near the planned date, conditional on an actual host and execution confirmation.' },
      { id: 'F2', epistemicClass: 'INFERRED', certainty: 'POSSIBLE', basisRefs: refs, proposition: 'An audiovisual artifact might be created during a rehearsal or event; it would not alone establish delivery at the scheduled time.' }
    ],
    executionCandidates: []
  };
}

export function validateCandidate(candidate, input) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) throw new Error('CANDIDATE_NOT_OBJECT');
  if (candidate.phase !== input.exercise) throw new Error('CANDIDATE_PHASE_MISMATCH');
  if (!Array.isArray(candidate.inferences) || candidate.inferences.length < 1) throw new Error('INFERENCES_REQUIRED');
  if (!Array.isArray(candidate.executionCandidates)) throw new Error('EXECUTION_CANDIDATES_REQUIRED');
  const refs = new Set(Object.values(input.anchors).map(anchor => anchor.id));
  for (const h of candidate.inferences) {
    if (h.epistemicClass !== 'INFERRED' || !OUTCOMES.has(h.certainty)) throw new Error('INFERENCE_MUST_BE_HYPOTHETICAL');
    if (typeof h.proposition !== 'string' || !h.proposition.trim()) throw new Error('INFERENCE_TEXT_REQUIRED');
    if (!Array.isArray(h.basisRefs) || h.basisRefs.some(ref => !refs.has(ref))) throw new Error('INFERENCE_REFERENCES_UNKNOWN_OR_FUTURE');
  }
  for (const a of candidate.executionCandidates) {
    if (a.epistemicClass !== 'SIMULATED' || a.executionState !== 'NOT_EXECUTED') throw new Error('EXECUTION_CLAIM_NOT_ALLOWED');
    if (typeof a.proposedAction !== 'string' || !a.proposedAction.trim()) throw new Error('ACTION_TEXT_REQUIRED');
    if (!Array.isArray(a.basisRefs) || a.basisRefs.some(ref => !refs.has(ref))) throw new Error('ACTION_REFERENCES_UNKNOWN_OR_FUTURE');
  }
  for (const k of ['evidence','evidenceRefs','observedReturn','authorityGrant','realExecution','canonicalState','realityChainRecord']) {
    if (Object.hasOwn(candidate,k)) throw new Error('FORBIDDEN_EVIDENCE_OR_AUTHORITY_FIELD:' + k);
  }
  return candidate;
}

export function resultEnvelope(input,candidate,reference=null) {
  validateCandidate(candidate,input);
  const payload = { input, candidate };
  const hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  const referenceReading = reference === null ? {
    status: 'WITHHELD', title: 'OBSERVACIÓN: PRESENTACIÓN DE SFI · JUAN MARÍN · AI WEEK NYC',
    observationEligible: false
  } : {
    status: 'EXTERNAL_METADATA_ONLY',
    title: reference.title,
    artifact: reference.artifact,
    artifactCreatedAt: reference.artifactCreatedAt,
    scheduledStart: reference.scheduledStart,
    discrepancy: reference.discrepancy,
    realEventOccurred: 'UNVERIFIED_FROM_METADATA_ALONE',
    observationEligible: false,
    reason: 'Independent artifact metadata does not verify the full advertised presentation or its planned schedule.'
  };
  return {
    contract:'SFI-CHRONOS-SYNTHETIC-CASE-RUN-1.0',
    researchUse:'LAB_ONLY',
    mode: input.exercise,
    evidenceClass:'SIMULATED',
    scientificValidation:'NOT_ESTABLISHED',
    timelineAuthenticity:'RETROSPECTIVE_REPLAY_NOT_PROSPECTIVE',
    engine: candidate.producedBy || 'EXTERNAL_CANDIDATE_UNVERIFIED',
    sha256: hash,
    input,
    candidate,
    terminalObservation: referenceReading,
    executionPerformed:false,
    realityChainEligible:false,
    canMintReturn:false,
    canonicalMutation:false,
    nextRequirement:'Obtain independent, time-consistent source evidence before any real-world claim.'
  };
}

export function executeLocalCase(fixture,mode,{candidate=null,reveal=false}={}) {
  const input = buildLabInput(fixture,mode);
  const chosen = candidate ?? buildBaselineCandidate(input);
  return resultEnvelope(input,chosen,reveal?fixture.realReference:null);
}

function main() {
  const args = process.argv.slice(2);
  const index=args.indexOf('--mode');
  const mode=index >= 0 ? args[index+1] : 'backcast';
  const candidateIndex=args.indexOf('--candidate');
  const fixture=JSON.parse(readFileSync(new URL('./aiweeknyc.case.json',import.meta.url),'utf8'));
  const candidate=candidateIndex >= 0 ? JSON.parse(readFileSync(args[candidateIndex+1],'utf8')) : null;
  const result=executeLocalCase(fixture,mode,{candidate,reveal:args.includes('--reveal')});
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) main();
