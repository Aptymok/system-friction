import { readFileSync, writeFileSync } from 'node:fs';

const path = 'public/openapi.json';
const api = JSON.parse(readFileSync(path, 'utf8'));
api.components ??= {};
api.components.schemas ??= {};
api.paths ??= {};

const route = api.paths['/api/external/v1/cognitive']?.post;
if (!route) throw new Error('SFI_OPENAPI_COGNITIVE_ROUTE_MISSING');

const requestSchemaName = 'PersonalCognitiveRequest';
api.components.schemas[requestSchemaName] ??= {
  type: 'object',
  additionalProperties: true,
  properties: {},
};
const schema = api.components.schemas[requestSchemaName];
schema.type ??= 'object';
schema.additionalProperties ??= true;
schema.properties ??= {};

route.requestBody ??= {
  required: true,
  content: { 'application/json': { schema: { $ref: `#/components/schemas/${requestSchemaName}` } } },
};
route.requestBody.content ??= {};
route.requestBody.content['application/json'] ??= {};
route.requestBody.content['application/json'].schema = { $ref: `#/components/schemas/${requestSchemaName}` };

schema.properties.operation = {
  type: 'string',
  enum: ['state', 'patterns', 'propose_pattern', 'confirm_pattern', 'reject_pattern', 'run'],
  description: 'Owner-scoped Personal Cognitive operation. Pattern mutations require lab:write; cognitive execution requires lab:run.',
};
schema.properties.dimension = { type: 'string', enum: ['COGNITION', 'OBSERVATION'] };
schema.properties.category = {
  type: 'string',
  enum: [
    'PROBLEM_DECOMPOSITION',
    'EVIDENCE_SELECTION',
    'ATTENTION_ALLOCATION',
    'SIGNAL_DISCRIMINATION',
    'HYPOTHESIS_FORMATION',
    'RIVAL_GENERATION',
    'DECISION_THRESHOLD',
    'EXECUTION_RHYTHM',
    'CONTRADICTION_RESPONSE',
    'RETURN_CALIBRATION',
    'TEMPORAL_FRAMING',
    'SYSTEM_BOUNDARY_SELECTION',
  ],
};
schema.properties.statement = { type: 'string' };
schema.properties.operationalMeaning = { type: ['string', 'null'] };
schema.properties.useCases = { type: 'array', items: { type: 'string' } };
schema.properties.conditions = { type: 'array', items: { type: 'string' } };
schema.properties.counterSignals = { type: 'array', items: { type: 'string' } };
schema.properties.supportingRunIds = { type: 'array', items: { type: 'string' } };
schema.properties.supportingEvidenceIds = { type: 'array', items: { type: 'string' } };
schema.properties.selfDeclared = {
  type: 'boolean',
  description: 'When true the pattern is stored as DECLARED and does not require recurrence support. It remains a representation, not a proven behavioral invariant.',
};
schema.properties.confidence = { type: 'number', minimum: 0, maximum: 1 };
schema.properties.patternId = { type: 'string' };
schema.properties.note = { type: ['string', 'null'] };

route.summary = 'Read/run Personal Cognitive and govern owner-scoped cognition/observation patterns';
route.description = [
  'OAuth subject-bound Personal Cognitive surface.',
  'state/patterns require lab:read; propose/confirm/reject pattern operations require lab:write; run requires lab:run.',
  'Inferred patterns require at least two distinct owner-scoped run/evidence references before candidacy.',
  'Self-declared patterns are stored as DECLARED, not as proof.',
  'Confirmation accepts the representation for PERSON_CT only.',
  'PERSON_CT cannot become institutional Cognitive Spine state by inheritance; the separate Person→Institution gate remains mandatory.',
].join(' ');
route.responses ??= {};
route.responses['409'] = { description: 'Pattern lacks recurrent support, is already terminal, or conflicts with existing owner-scoped state' };

api['x-sfi-governance'] ??= {};
api['x-sfi-governance'].personCtPatternBoundary =
  'COGNITION and OBSERVATION patterns are private owner-scoped representations. Agent prose does not auto-create a pattern. Inferred candidates require recurrent owned support and person confirmation; self-declarations remain DECLARED. No PERSON_CT pattern enters institutional Cognitive Spine by inheritance.';

writeFileSync(path, `${JSON.stringify(api, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, openapi: path, requestSchema: requestSchemaName, personCtPatterns: true, version: api.info?.version ?? null }));
