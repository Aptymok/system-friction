import { readFileSync, writeFileSync } from 'node:fs';

const path = 'public/openapi.json';
const api = JSON.parse(readFileSync(path, 'utf8'));
api.components ??= {};
api.components.schemas ??= {};
api.paths ??= {};

const signalRequest = api.components.schemas.SignalRequest;
if (!signalRequest?.properties) throw new Error('SFI_OPENAPI_SIGNAL_REQUEST_MISSING');

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
].join(' ');
signalPath.responses ??= {};
signalPath.responses['409'] = { description: 'Clarification, object observation, same-cycle resume validation or methodological closure is incomplete' };
signalPath.responses['424'] = { description: 'Required public evidence could not be acquired sufficiently' };

api['x-sfi-governance'] ??= {};
api['x-sfi-governance'].universalCycleBoundary =
  'SOURCE/OBSERVATION/DERIVATION/INFERENCE/SIMULATION/RETURN/CONTRAST/CLOSURE remain distinct. Same-cycle rerun preserves prior history. AI synthesis is inference only. Closure completeness does not canonize truth.';
api['x-sfi-governance'].preferredObjectFlow = [
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
];

writeFileSync(path, `${JSON.stringify(api, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, openapi: path, universalCycle: true, sameCycleResume: true, aiSynthesis: true, closureGate: true, version: api.info?.version ?? null }));
