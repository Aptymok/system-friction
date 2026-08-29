import { readFileSync, writeFileSync } from 'node:fs';

const path = 'public/openapi.json';
const api = JSON.parse(readFileSync(path, 'utf8'));
api.components ??= {};
api.components.schemas ??= {};
api.paths ??= {};

const signalRequest = api.components.schemas.SignalRequest;
if (!signalRequest?.properties) throw new Error('SFI_OPENAPI_SIGNAL_REQUEST_MISSING');

// GPT/Action clients must be able to transport the same structured-result
// contract that the backend accepts. Generic additionalProperties-only objects
// are intentionally avoided here because some Action compilers collapse them
// out of the callable tool surface.
api.components.schemas.StructuredResultObject = {
  type: 'object',
  description: 'Sanitized identity/provenance envelope for the materially inspected object. Raw content, bytes, blobs and base64 are forbidden.',
  properties: {
    objectKey: { type: 'string', description: 'Stable methodological object identity used to match/open/resume cycles.' },
    id: { type: 'string' },
    kind: { type: 'string', description: 'Representation kind such as dataset, document, text, image, audio, video, json, csv or conversation.' },
    name: { type: 'string' },
    mimeType: { type: 'string' },
    logicalFilename: { type: 'string', description: 'Logical/original filename when known.' },
    observedTransportFilename: { type: 'string', description: 'Filename exposed by the transport/client; preserve alias differences rather than silently renaming.' },
    size: { type: 'integer', minimum: 0 },
    objectHash: { type: 'string', description: 'Client-computed material/content fingerprint when available; SHA-256 is preferred.' },
    contentHash: { type: 'string', description: 'Alias for a material/content fingerprint when objectHash is not used.' },
    fingerprint: { type: 'string', description: 'Alternative client content fingerprint.' },
    contentHashBasis: { type: 'string', description: 'Hash basis such as SHA256 or CLIENT_CONTENT_FINGERPRINT. Reference identity must remain distinct from content identity.' },
    materialIdentityVerified: { type: 'boolean' },
    sourceUrl: { type: 'string' },
    assetRef: { type: 'string' },
    metadata: {
      type: 'object',
      description: 'Sanitized non-raw metadata only.',
      additionalProperties: true,
    },
    provenance: {
      type: 'object',
      description: 'Sanitized provenance/lineage metadata. Do not place raw object content here.',
      properties: {
        sourceRef: { type: 'string' },
        caseId: { type: 'string' },
        acquisitionMethod: { type: 'string' },
        observedAt: { type: 'string' },
        logicalFilename: { type: 'string' },
        observedTransportFilename: { type: 'string' },
      },
      additionalProperties: true,
    },
  },
  additionalProperties: true,
};

api.components.schemas.StructuredEpistemicEntry = {
  type: 'object',
  required: ['statement'],
  properties: {
    statement: { type: 'string' },
    basis: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    refs: { type: 'array', items: { type: 'string' } },
  },
  additionalProperties: false,
};

api.components.schemas.StructuredEpistemicPartition = {
  type: 'object',
  description: 'Keep observed/declared/derived/inferred/simulated/missing categories distinct. Nothing in this object is automatically ACCEPTED EVIDENCE.',
  properties: {
    observed: { type: 'array', items: { $ref: '#/components/schemas/StructuredEpistemicEntry' } },
    declared: { type: 'array', items: { $ref: '#/components/schemas/StructuredEpistemicEntry' } },
    derived: { type: 'array', items: { $ref: '#/components/schemas/StructuredEpistemicEntry' } },
    inferred: { type: 'array', items: { $ref: '#/components/schemas/StructuredEpistemicEntry' } },
    simulated: { type: 'array', items: { $ref: '#/components/schemas/StructuredEpistemicEntry' } },
    missing: { type: 'array', items: { $ref: '#/components/schemas/StructuredEpistemicEntry' } },
    unresolved: { type: 'array', items: { $ref: '#/components/schemas/StructuredEpistemicEntry' } },
  },
  additionalProperties: false,
};

api.components.schemas.StructuredHypothesis = {
  type: 'object',
  required: ['statement'],
  properties: {
    id: { type: 'string' },
    statement: { type: 'string' },
    role: { type: 'string', enum: ['primary', 'rival'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    supportRefs: { type: 'array', items: { type: 'string' } },
    contradictionRefs: { type: 'array', items: { type: 'string' } },
    discriminatingTest: { type: 'string' },
  },
  additionalProperties: true,
};

api.components.schemas.StructuredRisk = {
  type: 'object',
  required: ['statement'],
  properties: {
    id: { type: 'string' },
    statement: { type: 'string' },
    likelihood: { type: 'number', minimum: 0, maximum: 1 },
    impact: { type: 'number', minimum: 0, maximum: 1 },
    basis: { type: 'string' },
    refs: { type: 'array', items: { type: 'string' } },
  },
  additionalProperties: true,
};

api.components.schemas.StructuredMeasurementBundle = {
  type: 'object',
  description: 'Sanitized material measurements. Use the explicit common fields when applicable and custom only for additional bounded measurements.',
  properties: {
    summary: { type: 'string' },
    sheetCount: { type: 'integer', minimum: 0 },
    rowCount: { type: 'integer', minimum: 0 },
    analyzableRowCount: { type: 'integer', minimum: 0 },
    malformedRows: { type: 'integer', minimum: 0 },
    headers: { type: 'array', items: { type: 'string' } },
    fields: { type: 'array', items: { type: 'string' } },
    timeCoverage: {
      type: 'object',
      properties: {
        start: { type: 'string' },
        end: { type: 'string' },
        basis: { type: 'string' },
      },
      additionalProperties: true,
    },
    missingness: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field: { type: 'string' },
          missing: { type: 'integer', minimum: 0 },
          share: { type: 'number', minimum: 0, maximum: 1 },
        },
        additionalProperties: true,
      },
    },
    categories: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          dimension: { type: 'string' },
          value: { type: 'string' },
          count: { type: 'integer', minimum: 0 },
          share: { type: 'number', minimum: 0, maximum: 1 },
        },
        additionalProperties: true,
      },
    },
    temporalConsistency: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          leftColumn: { type: 'string' },
          rightColumn: { type: 'string' },
          comparableRows: { type: 'integer', minimum: 0 },
          violations: { type: 'integer', minimum: 0 },
          violationShare: { type: 'number', minimum: 0, maximum: 1 },
          interpretation: { type: 'string' },
        },
        additionalProperties: true,
      },
    },
    durations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          startColumn: { type: 'string' },
          endColumn: { type: 'string' },
          comparableRows: { type: 'integer', minimum: 0 },
          negativeRows: { type: 'integer', minimum: 0 },
          medianHours: { type: 'number' },
          p90Hours: { type: 'number' },
          meanHours: { type: 'number' },
          maxHours: { type: 'number' },
        },
        additionalProperties: true,
      },
    },
    recurrence: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          count: { type: 'integer', minimum: 0 },
          share: { type: 'number', minimum: 0, maximum: 1 },
          basis: { type: 'string' },
        },
        additionalProperties: true,
      },
    },
    measurementLimitations: { type: 'array', items: { type: 'string' } },
    custom: { type: 'object', additionalProperties: true },
  },
  additionalProperties: true,
};

api.components.schemas.StructuredPerturbation = {
  type: 'object',
  properties: {
    action: { type: 'string' },
    rationale: { type: 'string' },
    reversibility: { type: 'string' },
    riskLevel: { type: 'string' },
    expectedEffect: { type: 'string' },
    constraints: { type: 'array', items: { type: 'string' } },
  },
  additionalProperties: true,
};

api.components.schemas.StructuredPrediction = {
  type: 'object',
  properties: {
    statement: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    expectedSignals: { type: 'array', items: { type: 'string' } },
    contradictionSignals: { type: 'array', items: { type: 'string' } },
    observationWindow: { type: 'string' },
  },
  additionalProperties: true,
};

api.components.schemas.StructuredAnalysisResult = {
  type: 'object',
  required: ['measurements', 'epistemicPartition'],
  description: 'Sanitized structured analysis returned by an authorized extractor. This is a DERIVED result, not ACCEPTED EVIDENCE or canonical truth.',
  properties: {
    summary: { type: 'string' },
    measurements: { $ref: '#/components/schemas/StructuredMeasurementBundle' },
    epistemicPartition: { $ref: '#/components/schemas/StructuredEpistemicPartition' },
    hypotheses: { type: 'array', items: { $ref: '#/components/schemas/StructuredHypothesis' } },
    rivals: { type: 'array', items: { $ref: '#/components/schemas/StructuredHypothesis' } },
    risks: { type: 'array', items: { $ref: '#/components/schemas/StructuredRisk' } },
    invariants: { type: 'array', items: { type: 'string' } },
    perturbation: { $ref: '#/components/schemas/StructuredPerturbation' },
    prediction: { $ref: '#/components/schemas/StructuredPrediction' },
    unresolved: { type: 'array', items: { type: 'string' } },
    metadata: { type: 'object', additionalProperties: true },
  },
  additionalProperties: true,
};

api.components.schemas.StructuredResultAnalyzer = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    provider: { type: 'string' },
    model: { type: 'string' },
    method: { type: 'string' },
    version: { type: 'string' },
  },
  additionalProperties: true,
};

api.components.schemas.StructuredResultRequest = {
  type: 'object',
  required: ['object', 'result'],
  description: 'Persist one sanitized structured material-analysis result. object/result are mandatory; raw content must never be embedded.',
  properties: {
    cycleId: { type: 'string' },
    question: { type: 'string' },
    objective: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    lineage: { type: 'array', items: { type: 'string' } },
    object: { $ref: '#/components/schemas/StructuredResultObject' },
    result: { $ref: '#/components/schemas/StructuredAnalysisResult' },
    analyzer: { $ref: '#/components/schemas/StructuredResultAnalyzer' },
  },
  additionalProperties: false,
};

const structuredResultPath = api.paths['/api/external/v1/result']?.post;
if (!structuredResultPath) throw new Error('SFI_OPENAPI_STRUCTURED_RESULT_PATH_MISSING');
structuredResultPath.summary = 'Persist a sanitized structured material-analysis result without raw object persistence';
structuredResultPath.description = [
  'Persists one structured DERIVED analysis result associated with a cycle/object.',
  'The Action surface explicitly exposes object identity/provenance, measurements, epistemic partition, primary/rival hypotheses, risks, invariants and optional perturbation/prediction.',
  'Raw binary/file/bytes/blob/base64 content remains forbidden and is stripped server-side.',
  'This operation does not create ACCEPTED EVIDENCE, canonical truth, RETURN, closure or learning promotion.',
].join(' ');

signalRequest.properties.continueWithOpenCycles = {
  type: 'boolean',
  description: 'Explicitly allow an independent parallel cycle for the same object. Do not use this to continue the same methodological question; use resumeCycleId instead.',
};
signalRequest.properties.resumeCycleId = {
  type: 'string',
  description: 'Open universal cycle id to reuse when a capability was remediated or a new observation for the same object becomes available. The existing logbook and prior failed/degraded runs are preserved.',
};
signalRequest.properties.resumeReason = {
  type: 'string',
  description: 'Reason for same-cycle rerun, for example CAPABILITY_REMEDIATION_OR_NEW_OBSERVATION.',
};
signalRequest.properties.aiSynthesis = {
  type: 'boolean',
  default: true,
  description: 'Run one bounded governed AI synthesis after deterministic cognitive execution. Set false only when deterministic outputs alone are desired.',
};
signalRequest.properties.closure = {
  type: 'object',
  additionalProperties: true,
  description: 'Methodological closure envelope. Contrastable/longitudinal/intervention cycles require primary+rival hypothesis, prediction, expected/contradiction signals, observation window, observed return, contrast, updated confidence, outcome and learning candidate. DESCRIPTIVE_DELIMITED may close with explicit conclusion plus limitations/missing evidence.',
};

const signalPath = api.paths['/api/external/v1/signal']?.post;
if (!signalPath) throw new Error('SFI_OPENAPI_SIGNAL_PATH_MISSING');
signalPath.summary = 'Resolve, observe, run, resume, contrast and close a governed universal SFI cycle';
signalPath.description = [
  'Supports status/intake/run/return/close for institutional signal cycles.',
  'Intake returns unresolved questions, material-observation sufficiency, evidence requirements and any suggested same-object resume cycle.',
  'Run fails closed before cognitive inference when the object lacks material observation or required public evidence.',
  'Use resumeCycleId to rerun the same open cycle after ingestion/capability remediation; prior runs remain in the same logbook.',
  'A bounded AI synthesis may generate falsifiable primary/rival hypotheses and discriminating predictions after deterministic execution.',
  'Return is contrasted against predictions. Close is rejected until the methodological closure envelope is sufficient.',
  'Closure does not enter institutional learning automatically; learning remains quarantined until governed ROOT promotion.',
].join(' ');
signalPath.responses ??= {};
signalPath.responses['409'] = { description: 'Clarification, object observation, same-cycle resume validation or methodological closure is incomplete' };
signalPath.responses['424'] = { description: 'Required public evidence could not be acquired sufficiently' };

api.paths['/api/external/v1/bootstrap'] = {
  get: {
    operationId: 'getSfiCognitiveBootstrap',
    summary: 'Hydrate the authorized AI client with the current governed SFI cognitive contract',
    description: 'Returns a versioned compact context capsule: constitution hash/reference, ontology, epistemic rules, methodology, learning policy, sealed Cognitive Spine snapshot identity, bounded memory/approved decisions, promoted calibrated learning and current open-cycle state. Prior context remains context, not a new observation.',
    'x-sfi-scope': 'observe',
    security: [{ sfiOAuth: ['observe'] }],
    parameters: [{
      name: 'caseId',
      in: 'query',
      required: false,
      schema: { type: 'string' },
      description: 'Optional current case identifier used to bind the bootstrap capsule to the caller workflow. It does not expand visibility by itself.',
    }],
    responses: {
      '200': { description: 'Versioned SFI cognitive bootstrap capsule', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericResponse' } } } },
      '401': { description: 'Unauthorized or observe scope missing' },
      '503': { description: 'Bootstrap materialization failed; caller must not silently substitute an unversioned persona prompt' },
    },
  },
};

api['x-sfi-governance'] ??= {};
api['x-sfi-governance'].universalCycleBoundary =
  'SOURCE/OBSERVATION/DERIVATION/INFERENCE/SIMULATION/RETURN/CONTRAST/CLOSURE remain distinct. Same-cycle rerun preserves prior history. AI synthesis is inference only. Closure completeness does not canonize truth.';
api['x-sfi-governance'].learningQuarantineBoundary =
  'SFI_STRUCTURED_ANALYSIS_RESULT_RECEIVED and closed cycles do not directly enter the Cognitive Spine. TEST_SYNTHETIC, FAILED_EXPERIMENT and unpromoted OPERATIONAL_EVIDENCE remain outside institutional learning. Only ROOT-governed SFI_UNIVERSAL_LEARNING_PROMOTED records derived from CALIBRATED_RETURN may enter the universal-cycle learning source plane.';
api['x-sfi-governance'].cognitiveBootstrapBoundary =
  'Bootstrap exposes a sealed bounded institutional context for an authorized session. It does not mint evidence, authorize actions, inherit PERSON_CT into institutional state, or promote learning.';
api['x-sfi-governance'].structuredResultActionBoundary =
  'The structured-result Action schema must expose the backend-required object + result payload, including measurements and epistemic partition. Tool-schema truncation is a blocking contract failure, not permission to degrade the payload into lineage or metadata.';
api['x-sfi-governance'].preferredObjectFlow = [
  'cognitive-bootstrap',
  'case-intake-resolution',
  'execution-contract or governed ingestion',
  'material-observation hydration',
  'sufficiency gate',
  'evidence requirement resolution',
  'bounded public source acquisition when required',
  'minimum relevant cognitive runtime',
  'bounded AI synthesis',
  'return',
  'contrast/calibration',
  'methodological closure',
  'learning quarantine',
  'ROOT learning promotion when eligible',
];

writeFileSync(path, `${JSON.stringify(api, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  openapi: path,
  universalCycle: true,
  structuredResultActionContract: true,
  sameCycleResume: true,
  aiSynthesis: true,
  closureGate: true,
  cognitiveBootstrap: true,
  learningQuarantine: true,
  version: api.info?.version ?? null,
}));
