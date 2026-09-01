import 'server-only';

import { runLlmTask } from '@/lib/ai/providerRouter';
import type { KernelContext } from '@/lib/sfi/cognitive-runtime/kernelContext';

export const SFI_UNIVERSAL_RETURN_CAPABILITY_CONTRACT = 'SFI-UNIVERSAL-RETURN-CAPABILITY-1.1' as const;

export type UniversalReturnCapabilityDecision =
  | 'SFI_CAN_ACQUIRE'
  | 'HUMAN_SOURCE_OR_AUTHORIZATION_REQUIRED'
  | 'MATERIAL_OBSERVATION_REQUIRED';

type Row = Record<string, unknown>;

type CapabilityDescriptor = {
  capabilityId: string;
  name: string;
  canAcquireReturn: boolean;
  sourceClasses: string[];
  authorityBoundary: string;
};

export const SFI_RETURN_CAPABILITY_INVENTORY: CapabilityDescriptor[] = [
  {
    capabilityId: 'universal_evidence_acquisition_v1',
    name: 'Universal public evidence acquisition',
    canAcquireReturn: true,
    sourceClasses: ['PUBLIC_WEB', 'PUBLIC_DIRECT_SOURCE'],
    authorityBoundary: 'May discover and directly retrieve public HTTP(S) source material. Cannot access private/internal systems, credentials, protected files, or create an observed fact when the source does not contain one.',
  },
  {
    capabilityId: 'cognitive_spine_context_v1',
    name: 'Cognitive Spine context consumption',
    canAcquireReturn: false,
    sourceClasses: ['EXISTING_VERIFIED_OR_CANONICAL_CONTEXT'],
    authorityBoundary: 'May consume already persisted bounded institutional context. It cannot manufacture a new real-world observation or fill missing source semantics.',
  },
  {
    capabilityId: 'governed_execution_router_v1',
    name: 'Governed execution router',
    canAcquireReturn: false,
    sourceClasses: ['ALREADY_AUTHORIZED_INTERNAL_EXECUTION'],
    authorityBoundary: 'May route already-authorized internal work. It cannot create credentials, source access, external observations, or evidence authority.',
  },
];

export type UniversalReturnCapabilityResolution = {
  contract: typeof SFI_UNIVERSAL_RETURN_CAPABILITY_CONTRACT;
  decision: UniversalReturnCapabilityDecision;
  capabilityId: string | null;
  sourceClass: string;
  humanInputRequired: boolean;
  requiredHumanInput: string[];
  reason: string;
  confidence: number | null;
  provider: string | null;
  model: string | null;
  warnings: string[];
  rawSourceRequired: false;
  rawRowsRequired: false;
  authorizationAlternative: string | null;
  epistemicBoundary: string;
};

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown, max = 1600) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function strings(value: unknown, max = 6) {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim().slice(0, 600)))].slice(0, max)
    : [];
}

function number01(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed > 1 ? parsed / 100 : parsed)) : null;
}

function stripFence(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    : trimmed;
}

function bounded(value: unknown, depth = 0): unknown {
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.slice(0, 1000);
  if (depth >= 4) return '[depth_limit]';
  if (Array.isArray(value)) return value.slice(0, 16).map((item) => bounded(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Row).slice(0, 28).map(([key, item]) => [key, bounded(item, depth + 1)]));
  }
  return String(value).slice(0, 200);
}

function minimumFallbackRequest(plan: Row) {
  const expected = strings(plan.expectedSignals, 4);
  const unresolved = strings(plan.unresolved, 3);
  const target = [...expected, ...unresolved].slice(0, 4);
  return target.length
    ? [`Autoriza acceso de lectura a la fuente que pueda comprobar: ${target.join(' | ')}, o aporta esa observación con referencias verificables.`]
    : ['Autoriza acceso de lectura a la fuente autoritativa requerida o aporta la observación material con referencias verificables.'];
}

function conservativeFallback(plan: Row, warning: string): UniversalReturnCapabilityResolution {
  return {
    contract: SFI_UNIVERSAL_RETURN_CAPABILITY_CONTRACT,
    decision: 'HUMAN_SOURCE_OR_AUTHORIZATION_REQUIRED',
    capabilityId: null,
    sourceClass: 'UNRESOLVED_OR_CONTROLLED_SOURCE',
    humanInputRequired: true,
    requiredHumanInput: minimumFallbackRequest(plan),
    reason: 'SFI could not prove that an already-authorized capability can obtain the required observation. Authority is not inferred from absence of information.',
    confidence: null,
    provider: null,
    model: null,
    warnings: [warning],
    rawSourceRequired: false,
    rawRowsRequired: false,
    authorizationAlternative: 'Read-only access is sufficient when it exposes the authoritative observation; a raw dataset re-upload is not required.',
    epistemicBoundary: 'Capability resolution allocates execution responsibility only. It is not RETURN, evidence acceptance, CONTRAST, closure, learning, or canon.',
  };
}

function parseDecision(value: string) {
  try {
    const parsed = row(JSON.parse(stripFence(value)));
    const decision = text(parsed.decision, 80)?.toUpperCase();
    if (!['SFI_CAN_ACQUIRE', 'HUMAN_SOURCE_OR_AUTHORIZATION_REQUIRED', 'MATERIAL_OBSERVATION_REQUIRED'].includes(decision ?? '')) return null;
    return {
      decision: decision as UniversalReturnCapabilityDecision,
      capabilityId: text(parsed.capabilityId, 120),
      sourceClass: text(parsed.sourceClass, 160) ?? 'UNRESOLVED',
      requiredHumanInput: strings(parsed.requiredHumanInput, 6),
      reason: text(parsed.reason, 1800) ?? 'No reason supplied.',
      confidence: number01(parsed.confidence),
    };
  } catch {
    return null;
  }
}

export async function resolveUniversalReturnCapability(planValue: unknown, context: KernelContext): Promise<UniversalReturnCapabilityResolution> {
  const plan = row(planValue);
  const metadata = row(context.metadata);
  const inventory = SFI_RETURN_CAPABILITY_INVENTORY.map((item) => ({ ...item }));
  const system = [
    'You are the capability-resolution layer of the System Friction Institute.',
    'Decide who can obtain the material observation required by an already-persisted RETURN plan.',
    'This is AI-governed routing, not evidence generation. Never invent access, credentials, source semantics, observations, RETURN, causal truth, or completion.',
    'You may select SFI_CAN_ACQUIRE only when one capability in the supplied inventory explicitly has canAcquireReturn=true and its authority boundary covers the required source.',
    'Public-web capability does not cover internal datasets, private source-system audit trails, protected semantics, credentials, or future real-world outcomes merely because related public information exists.',
    'If authoritative/private/controlled source access is needed and not present, choose HUMAN_SOURCE_OR_AUTHORIZATION_REQUIRED and state the minimum useful source or read authorization.',
    'If the observation does not yet exist because it depends on a future event/intervention, choose MATERIAL_OBSERVATION_REQUIRED.',
    'Do not ask for raw rows when read-only access or a minimized evidence-bearing extract is sufficient.',
    'Return ONLY JSON: {"decision":"SFI_CAN_ACQUIRE|HUMAN_SOURCE_OR_AUTHORIZATION_REQUIRED|MATERIAL_OBSERVATION_REQUIRED","capabilityId":string|null,"sourceClass":string,"requiredHumanInput":string[],"reason":string,"confidence":number|null}.',
  ].join('\n');

  const prompt = JSON.stringify(bounded({
    returnPlan: plan,
    task: {
      cycleId: context.cycleId,
      question: metadata.question ?? null,
      objective: metadata.objective ?? null,
      signal: metadata.signal ?? null,
      signalType: metadata.signalType ?? null,
      objectKey: metadata.objectKey ?? null,
      materialUnresolved: metadata.materialUnresolved ?? null,
      existingEvidenceCount: context.evidence.length,
      ctSnapshotConsumed: metadata.ctSnapshotConsumed ?? null,
    },
    capabilityInventory: inventory,
  })).slice(0, 12_000);

  const llm = await runLlmTask({
    task: 'fast_classification',
    system,
    prompt,
    fallbackResult: '{"decision":"HUMAN_SOURCE_OR_AUTHORIZATION_REQUIRED","capabilityId":null,"sourceClass":"UNRESOLVED_OR_CONTROLLED_SOURCE","requiredHumanInput":[],"reason":"No provider produced a governed capability decision.","confidence":null}',
    requirements: { reasoning: true, structuredOutput: true, priority: 'quality' },
    maxTokens: 650,
  });
  const parsed = parseDecision(llm.result);
  if (!parsed) return conservativeFallback(plan, 'RETURN_CAPABILITY_AI_SCHEMA_INVALID');

  const selected = parsed.capabilityId
    ? SFI_RETURN_CAPABILITY_INVENTORY.find((item) => item.capabilityId === parsed.capabilityId) ?? null
    : null;
  if (parsed.decision === 'SFI_CAN_ACQUIRE' && (!selected || !selected.canAcquireReturn)) {
    return conservativeFallback(plan, 'RETURN_CAPABILITY_AI_SELECTED_UNAUTHORIZED_CAPABILITY');
  }

  const humanInputRequired = parsed.decision !== 'SFI_CAN_ACQUIRE';
  return {
    contract: SFI_UNIVERSAL_RETURN_CAPABILITY_CONTRACT,
    decision: parsed.decision,
    capabilityId: parsed.decision === 'SFI_CAN_ACQUIRE' ? selected?.capabilityId ?? null : null,
    sourceClass: parsed.sourceClass,
    humanInputRequired,
    requiredHumanInput: humanInputRequired
      ? (parsed.requiredHumanInput.length ? parsed.requiredHumanInput : minimumFallbackRequest(plan))
      : [],
    reason: parsed.reason,
    confidence: parsed.confidence,
    provider: llm.ok ? llm.provider : null,
    model: llm.ok ? llm.model : null,
    warnings: llm.warnings,
    rawSourceRequired: false,
    rawRowsRequired: false,
    authorizationAlternative: humanInputRequired
      ? 'Read-only access or a minimized evidence-bearing extract is sufficient when it exposes the authoritative observation.'
      : null,
    epistemicBoundary: 'AI chooses among declared execution capabilities; deterministic validation enforces the authority boundary. This decision cannot become RETURN or truth by itself.',
  };
}
