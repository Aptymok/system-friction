import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SFI_GENAI_TELEMETRY_CONTRACT,
  compactObservedGenAiTelemetry,
  mapGenAiTelemetryToOpenTelemetry,
  normalizeObservedGenAiTelemetry,
} from '../src/lib/sfi/cognitive-runtime/genAiTelemetry';
import {
  SFI_GENAI_ASSURANCE_CONTRACT,
  deriveGenAiAssuranceMetrics,
} from '../src/lib/sfi/cognitive-runtime/genAiAssurance';
import { projectExecutionRecordFromEvent } from '../src/lib/sfi/cognitive-runtime/executionRecords';

const openai = normalizeObservedGenAiTelemetry({
  ok: true,
  provider: 'openai',
  model: 'gpt-observed',
  usage: { prompt_tokens: 120, completion_tokens: 30, total_cost_usd: 0.0042 },
  latencyMs: 840,
});
assert.equal(openai.contractVersion, SFI_GENAI_TELEMETRY_CONTRACT);
assert.deepEqual(openai.provider, { value: 'openai', observation: 'OBSERVED' });
assert.deepEqual(openai.inputTokens, { value: 120, observation: 'OBSERVED' });
assert.deepEqual(openai.outputTokens, { value: 30, observation: 'OBSERVED' });
assert.deepEqual(openai.providerCost, { value: 0.0042, observation: 'OBSERVED' });
assert.equal(openai.providerCostCurrency.observation, 'NOT_OBSERVED', 'currency must not be invented from a *_usd field');
assert.deepEqual(openai.latencyMs, { value: 840, observation: 'OBSERVED' });

const anthropic = normalizeObservedGenAiTelemetry({
  ok: true,
  provider: 'anthropic',
  model: 'claude-observed',
  usage: { input_tokens: 91, output_tokens: 17 },
  latencyMs: 510,
});
assert.equal(anthropic.inputTokens.value, 91);
assert.equal(anthropic.outputTokens.value, 17);
assert.equal(anthropic.providerCost.observation, 'NOT_OBSERVED');

const gemini = normalizeObservedGenAiTelemetry({
  ok: true,
  provider: 'gemini',
  model: 'gemini-observed',
  usage: { promptTokenCount: 88, candidatesTokenCount: 19 },
  latencyMs: 440,
});
assert.equal(gemini.inputTokens.value, 88);
assert.equal(gemini.outputTokens.value, 19);

const ollama = normalizeObservedGenAiTelemetry({
  ok: true,
  provider: 'ollama',
  model: 'llama-observed',
  usage: { prompt_eval_count: 64, eval_count: 22 },
  latencyMs: 1200,
});
assert.equal(ollama.inputTokens.value, 64);
assert.equal(ollama.outputTokens.value, 22);

const unavailable = normalizeObservedGenAiTelemetry({
  ok: false,
  provider: 'degraded',
  model: 'unavailable',
  usage: { prompt_tokens: 999, completion_tokens: 999, cost: 999 },
  latencyMs: 5,
});
assert.equal(unavailable.provider.observation, 'NOT_OBSERVED');
assert.equal(unavailable.model.observation, 'NOT_OBSERVED');
assert.equal(unavailable.inputTokens.observation, 'NOT_OBSERVED');
assert.equal(unavailable.providerCost.observation, 'NOT_OBSERVED');
assert.equal(unavailable.latencyMs.observation, 'NOT_OBSERVED', 'failed routing duration must not masquerade as observed provider latency');

const compact = compactObservedGenAiTelemetry(openai);
assert.equal(compact.telemetryContractVersion, SFI_GENAI_TELEMETRY_CONTRACT);
assert.equal(compact.observedInputTokens, 120);
assert.equal(compact.observedProviderCost, 0.0042);

const otel = mapGenAiTelemetryToOpenTelemetry(openai);
assert.equal(otel.mappingAuthority, 'INTEROPERABILITY_ONLY');
assert.equal(otel.contentCaptured, false);
assert.equal(otel.attributes['gen_ai.provider.name'], 'openai');
assert.equal(otel.attributes['gen_ai.response.model'], 'gpt-observed');
assert.equal(otel.attributes['gen_ai.usage.input_tokens'], 120);
assert.equal(otel.attributes['gen_ai.usage.output_tokens'], 30);
assert.deepEqual(otel.metrics['gen_ai.client.operation.duration'], { value: 0.84, unit: 's' });
assert.ok(!Object.keys(otel.attributes).some((key) => /prompt|input\.messages|output\.messages|content/i.test(key)), 'OTel interoperability mapping must not emit prompt/output content');

const execution = projectExecutionRecordFromEvent({
  event_id: 'evt-m5-observed',
  event_name: 'SFI_AGENT_EXECUTED',
  occurred_at: '2026-09-03T01:00:00.000Z',
  source: { sourceId: 'risk_agent', sourceType: 'runtime' },
  payload: {
    executionId: 'RUN-M5-OBSERVED',
    llmProvider: 'openai',
    llmModel: 'gpt-observed',
    aiGovernance: { disposition: 'ALLOW_ANALYSIS_ONLY', risk: 'LOW', reasons: [] },
    metadata: {
      agentInsight: {
        epistemicClass: 'INFERENCE',
        status: 'COMPLETE',
        summary: 'Bounded observed telemetry test.',
        observations: [], hypotheses: [], contradictions: [], missingEvidence: ['external outcome pending'], recommendations: [],
        confidence: 0.6,
        generatedAt: '2026-09-03T01:00:01.000Z',
      },
      llmRuntime: {
        telemetryContractVersion: SFI_GENAI_TELEMETRY_CONTRACT,
        observedProvider: 'openai',
        observedModel: 'gpt-observed',
        observedInputTokens: 120,
        observedOutputTokens: 30,
        observedProviderCost: 0.0042,
        observedLatencyMs: 840,
      },
    },
  },
});
assert.ok(execution);
assert.equal(execution.telemetry.inputTokens.observation, 'OBSERVED');
assert.equal(execution.telemetry.inputTokens.value, 120);
assert.equal(execution.telemetry.outputTokens.value, 30);
assert.equal(execution.telemetry.providerCost.value, 0.0042);
assert.equal(execution.telemetry.latencyMs.value, 840);

const contrast = {
  event_id: 'evt-return-contrast-m5',
  event_name: 'SFI_UNIVERSAL_RETURN_CONTRASTED',
  epistemic_class: 'derived',
  payload: {
    calibrationStatus: 'CONTRAST_RECORDED',
    classification: 'CONTRADICTED',
    classificationConfidence: 0.81,
    returnTraceability: 'VERIFIED_EVIDENCE_LINKED',
  },
};
const assuranceWithoutFalsePositive = deriveGenAiAssuranceMetrics([execution], [contrast], { agentId: 'risk_agent' });
assert.equal(assuranceWithoutFalsePositive.contractVersion, SFI_GENAI_ASSURANCE_CONTRACT);
assert.equal(assuranceWithoutFalsePositive.telemetryCoverage.provider.value, 1);
assert.equal(assuranceWithoutFalsePositive.telemetryCoverage.inputTokens.value, 1);
assert.equal(assuranceWithoutFalsePositive.quality.structuredInferenceCompletionRate.value, 1);
assert.equal(assuranceWithoutFalsePositive.evidenceSufficiency.insufficient, 1);
assert.equal(assuranceWithoutFalsePositive.returnCalibration.calibratedContrasts, 1);
assert.equal(assuranceWithoutFalsePositive.returnCalibration.contradicted, 1);
assert.equal(assuranceWithoutFalsePositive.falsePositive.rate.observation, 'NOT_OBSERVED', 'CONTRADICTED must never be silently converted into a false positive');
assert.equal(assuranceWithoutFalsePositive.boundaries.returnCalibrationAutomaticallyAttributedToAgent, false);

const assuranceWithExplicitFalsePositive = deriveGenAiAssuranceMetrics([execution], [
  contrast,
  { event_name: 'SFI_EXPLICIT_QUALITY_OBSERVATION', epistemic_class: 'observed', payload: { falsePositive: true } },
  { event_name: 'SFI_EXPLICIT_QUALITY_OBSERVATION', epistemic_class: 'observed', payload: { falsePositive: false } },
]);
assert.equal(assuranceWithExplicitFalsePositive.falsePositive.rate.observation, 'OBSERVED');
assert.equal(assuranceWithExplicitFalsePositive.falsePositive.rate.value, 0.5);
assert.equal(assuranceWithExplicitFalsePositive.falsePositive.observations, 2);

const telemetrySource = readFileSync('src/lib/sfi/cognitive-runtime/genAiTelemetry.ts', 'utf8');
const assuranceSource = readFileSync('src/lib/sfi/cognitive-runtime/genAiAssurance.ts', 'utf8');
const dossierSource = readFileSync('src/lib/sfi/cognitive-runtime/agentDossierRead.ts', 'utf8');
const agentClient = readFileSync('src/infrastructure/ai/agentLlmClient.ts', 'utf8');
const runtimeWriter = readFileSync('src/lib/sfi/cognitive-runtime/runtimeAgentExecutor.ts', 'utf8');
const recordsRoute = readFileSync('src/app/api/root/cognitive-runtime/records/route.ts', 'utf8');

assert.match(agentClient, /normalizeObservedGenAiTelemetry/);
assert.match(agentClient, /result\.usage/);
assert.match(agentClient, /result\.latency_ms/);
assert.doesNotMatch(agentClient, /observedInputTokens:\s*null/);
assert.doesNotMatch(agentClient, /observedOutputTokens:\s*null/);
assert.doesNotMatch(agentClient, /observedProviderCost:\s*null/);
assert.match(runtimeWriter, /recordAgentExecutionEvent/);
assert.match(runtimeWriter, /llmRuntime:\s*metadata\.llmRuntime/);
assert.match(recordsRoute, /readAgentExecutionDossier/);
assert.doesNotMatch(recordsRoute, /readGenAiAssuranceMetrics|readExecutionRecords|readAgentExecutionStates/,'records route must not reintroduce parallel event readers');
assert.match(dossierSource, /deriveGenAiAssuranceMetrics/);
assert.match(dossierSource, /overlappingEventNames:\s*0/);
assert.match(dossierSource, /duplicateEventReads:\s*0/);
assert.match(recordsRoute, /telemetryIsEvidence:\s*false/);
assert.match(recordsRoute, /openTelemetryIsTruthAuthority:\s*false/);
assert.doesNotMatch(telemetrySource + assuranceSource, /create table|usage_ledger|appendEpistemicEvent|recordAgentExecutionEvent/i, 'M5 must not create a second telemetry ledger or writer');

console.log(JSON.stringify({
  ok: true,
  telemetryContract: SFI_GENAI_TELEMETRY_CONTRACT,
  assuranceContract: SFI_GENAI_ASSURANCE_CONTRACT,
  observedTokensNormalized: true,
  providerCostEstimated: false,
  failedRouteLatencyPromotedToProviderLatency: false,
  openTelemetryAuthority: 'INTEROPERABILITY_ONLY',
  promptOutputContentCaptured: false,
  falsePositiveWithoutExplicitObservation: 'NOT_OBSERVED',
  returnCalibrationDerivedFromObservedContrast: true,
  duplicateTelemetryLedgerCreated: false,
  duplicateDossierEventReads: 0,
}, null, 2));
