import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SFI_MODEL_INDEPENDENCE_GATE,
  SFI_OPERATION_MODEL_BROKER_CONTRACT,
  getLlmOperationPlan,
  type LlmRequirements,
} from './providerRouter';
import { llmRequirementsForAgent } from '../sfi/cognitive-runtime/agentModelRequirements';

process.env.OPENAI_API_KEY = 'test-openai';
process.env.ANTHROPIC_API_KEY = 'test-anthropic';
process.env.GEMINI_API_KEY = 'test-gemini';
process.env.GROQ_API_KEY = 'test-groq';
process.env.HUGGINGFACE_API_KEY = 'test-hf';
process.env.OLLAMA_BASE_URL = 'http://127.0.0.1:11434';

const interactive: LlmRequirements = {
  reasoning: false,
  reasoningClass: 'LOW',
  structuredOutput: true,
  web: false,
  multimodal: false,
  computer: false,
  code: false,
  minContextTokens: 0,
  latencyClass: 'INTERACTIVE',
  costClass: 'ECONOMY',
  privacyClass: 'INTERNAL',
  priority: 'speed',
};

const qualityLong: LlmRequirements = {
  reasoning: true,
  reasoningClass: 'HIGH',
  structuredOutput: true,
  web: false,
  multimodal: false,
  computer: false,
  code: false,
  minContextTokens: 100_000,
  latencyClass: 'NORMAL',
  costClass: 'QUALITY',
  privacyClass: 'INTERNAL',
  priority: 'quality',
};

test('operation model broker exposes the frozen Slice D contract and boundaries', () => {
  assert.equal(SFI_OPERATION_MODEL_BROKER_CONTRACT, 'SFI-OPERATION-MODEL-BROKER-1.0');
  assert.equal(SFI_MODEL_INDEPENDENCE_GATE, 'SFI-MODEL-INDEPENDENCE-1.0');
  const plan = getLlmOperationPlan({ task: 'graph_interpretation', requirements: interactive });
  assert.deepEqual(plan.boundaries, {
    modelCapability: 'MODEL_CAPABILITY_NOT_AUTHORITY',
    modelOutput: 'MODEL_OUTPUT_NOT_OBSERVATION',
    availability: 'UNAVAILABLE_NOT_AVAILABLE',
    providerPreference: 'REQUEST_NOT_AUTHORIZATION',
  });
});

test('canonical cognitive operation projection reaches the router without dropping Slice D fields', () => {
  assert.deepEqual(llmRequirementsForAgent('temporal_resolver'), qualityLong);
  assert.deepEqual(llmRequirementsForAgent('field_observer'), interactive);
});

test('selection is per operation requirements rather than a permanent agent-to-model binding', () => {
  const fast = getLlmOperationPlan({ task: 'graph_interpretation', requirements: interactive });
  const deep = getLlmOperationPlan({ task: 'graph_interpretation', requirements: qualityLong });
  assert.equal(fast.state, 'ATTEMPTABLE');
  assert.equal(deep.state, 'ATTEMPTABLE');
  assert.equal(fast.candidates[0]?.provider, 'groq');
  assert.equal(fast.candidates[0]?.model, process.env.GROQ_MODEL ?? process.env.GROQ_FAST_MODEL ?? 'openai/gpt-oss-20b');
  assert.equal(deep.candidates[0]?.provider, 'groq');
  assert.equal(deep.candidates[0]?.model, process.env.GROQ_REASONING_MODEL ?? 'openai/gpt-oss-120b');
  assert.notEqual(fast.candidates[0]?.model, deep.candidates[0]?.model);
});

test('provider allowlist and denylist are hard constraints; preference remains a request', () => {
  const allowed = getLlmOperationPlan({
    task: 'graph_interpretation',
    preferredProvider: 'groq',
    requirements: { ...qualityLong, providerAllowlist: ['gemini'] },
  });
  assert.equal(allowed.state, 'ATTEMPTABLE');
  assert.ok(allowed.candidates.length > 0);
  assert.ok(allowed.candidates.every((candidate) => candidate.provider === 'gemini'));
  assert.ok(allowed.rejections.includes('preferred_provider_not_permitted:groq'));

  const denied = getLlmOperationPlan({
    task: 'graph_interpretation',
    preferredProvider: 'groq',
    requirements: { ...qualityLong, providerDenylist: ['groq'] },
  });
  assert.ok(denied.candidates.every((candidate) => candidate.provider !== 'groq'));
  assert.ok(denied.rejections.includes('preferred_provider_not_permitted:groq'));
});

test('empty provider allowlist fails closed', () => {
  const plan = getLlmOperationPlan({
    task: 'graph_interpretation',
    requirements: { ...interactive, providerAllowlist: [] },
  });
  assert.equal(plan.state, 'DEGRADED');
  assert.equal(plan.candidates.length, 0);
});

test('unsupported computer, multimodal and FRONTIER requirements degrade instead of inventing availability', () => {
  for (const requirements of [
    { ...interactive, computer: true },
    { ...interactive, multimodal: true },
    { ...qualityLong, reasoningClass: 'FRONTIER' as const },
  ]) {
    const plan = getLlmOperationPlan({ task: 'graph_interpretation', requirements });
    assert.equal(plan.state, 'DEGRADED');
    assert.equal(plan.candidates.length, 0);
    assert.ok(plan.rejections.some((value) => value.includes('no_model_matches_operation_requirements')));
  }
});

test('web and code requirements route only through declared executable capabilities', () => {
  const web = getLlmOperationPlan({
    task: 'web_research',
    requirements: {
      reasoning: true,
      reasoningClass: 'MEDIUM',
      web: true,
      structuredOutput: false,
      latencyClass: 'NORMAL',
      costClass: 'QUALITY',
      privacyClass: 'INTERNAL',
    },
  });
  assert.equal(web.state, 'ATTEMPTABLE');
  assert.ok(web.candidates.length > 0);
  assert.ok(web.candidates.every((candidate) => candidate.provider === 'groq'));

  const code = getLlmOperationPlan({
    task: 'graph_interpretation',
    requirements: { ...interactive, code: true },
  });
  assert.equal(code.state, 'ATTEMPTABLE');
  assert.equal(code.candidates[0]?.provider, 'groq');
});

test('PRIVATE_LOCAL is only attemptable while a compatible local provider is actually configured', () => {
  const localRequirements: LlmRequirements = {
    reasoning: true,
    reasoningClass: 'MEDIUM',
    structuredOutput: false,
    web: false,
    multimodal: false,
    computer: false,
    code: false,
    latencyClass: 'NORMAL',
    costClass: 'PRIVATE_LOCAL',
    privacyClass: 'PRIVATE_LOCAL',
  };
  const configured = getLlmOperationPlan({ task: 'graph_interpretation', requirements: localRequirements });
  assert.equal(configured.state, 'ATTEMPTABLE');
  assert.ok(configured.candidates.length > 0);
  assert.ok(configured.candidates.every((candidate) => candidate.provider === 'ollama'));
  assert.ok(configured.candidates.every((candidate) => candidate.health === 'UNTESTED'));

  const previousBase = process.env.OLLAMA_BASE_URL;
  const previousUrl = process.env.OLLAMA_URL;
  const previousHost = process.env.OLLAMA_HOST;
  delete process.env.OLLAMA_BASE_URL;
  delete process.env.OLLAMA_URL;
  delete process.env.OLLAMA_HOST;
  try {
    const unavailable = getLlmOperationPlan({ task: 'graph_interpretation', requirements: localRequirements });
    assert.equal(unavailable.state, 'DEGRADED');
    assert.equal(unavailable.candidates.length, 0);
    assert.ok(unavailable.rejections.includes('ollama:unconfigured'));
  } finally {
    if (previousBase === undefined) delete process.env.OLLAMA_BASE_URL; else process.env.OLLAMA_BASE_URL = previousBase;
    if (previousUrl === undefined) delete process.env.OLLAMA_URL; else process.env.OLLAMA_URL = previousUrl;
    if (previousHost === undefined) delete process.env.OLLAMA_HOST; else process.env.OLLAMA_HOST = previousHost;
  }
});
