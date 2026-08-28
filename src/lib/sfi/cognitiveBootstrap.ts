import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { materializeInstitutionalCognitiveSpineProfile } from '@/lib/institution/cognitiveSpineProfileMaterializer';
import { buildBoundedTwinContextFromCognitiveSpine } from '@/lib/institution/cognitiveSpineTwinContextAdapter';
import { readUniversalOpenCycles } from '@/lib/sfi/universalSignalCycle';
import { readUniversalLearningQuarantine } from '@/lib/sfi/universalLearningQuarantine';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from '@/lib/sfi/cognitive-runtime/convergedRegistry';

export const SFI_COGNITIVE_BOOTSTRAP_CONTRACT = 'SFI-COGNITIVE-BOOTSTRAP-1.0' as const;

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Row).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]));
  }
  return value;
}
function stableHash(value: unknown) {
  return sha256(JSON.stringify(stable(value)));
}

async function constitutionIdentity() {
  try {
    const content = await readFile(join(process.cwd(), 'public', 'llms-full.txt'), 'utf8');
    return {
      ref: '/llms-full.txt',
      hash: sha256(content),
      bytes: Buffer.byteLength(content, 'utf8'),
    };
  } catch (error) {
    return {
      ref: '/llms-full.txt',
      hash: null,
      bytes: null,
      warning: `constitution_read_failed:${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function compactPromotion(event: Row) {
  const payload = row(event.payload);
  const learning = row(payload.learning);
  return {
    eventId: text(event.event_id),
    occurredAt: text(event.occurred_at),
    cycleId: text(payload.cycleId),
    classification: text(payload.classification),
    epistemicClass: text(event.epistemic_class) ?? 'verified_contrast',
    primaryHypothesis: learning.primaryHypothesis ?? null,
    rivalHypotheses: Array.isArray(learning.rivalHypotheses) ? learning.rivalHypotheses.slice(0, 4) : [],
    prediction: learning.prediction ?? null,
    outcome: learning.outcome ?? null,
    updatedConfidence: learning.updatedConfidence ?? null,
    recurrenceAssessment: learning.recurrenceAssessment ?? null,
    limitations: Array.isArray(learning.limitations) ? learning.limitations.slice(0, 6) : [],
    missingEvidence: Array.isArray(learning.missingEvidence) ? learning.missingEvidence.slice(0, 6) : [],
  };
}

export async function buildSfiCognitiveBootstrap(input: {
  actorId: string;
  subjectId?: string | null;
  tenantId: string;
  role?: string | null;
  scopes: string[];
  caseId?: string | null;
}) {
  const createdAt = new Date().toISOString();
  const executionId = `bootstrap:${randomUUID()}`;
  const [constitution, materialized, openCycles, quarantine] = await Promise.all([
    constitutionIdentity(),
    materializeInstitutionalCognitiveSpineProfile({
      sourceCutoff: createdAt,
      executionId,
      createdAt,
      profileId: 'RUNTIME_GENERAL_CONTEXT_V1',
      consume: true,
      consumptionReason: 'AUTHORIZED_EXTERNAL_GPT_BOOTSTRAP',
    }),
    readUniversalOpenCycles(20),
    readUniversalLearningQuarantine(160),
  ]);

  const twinContext = buildBoundedTwinContextFromCognitiveSpine({
    snapshot: materialized.snapshot,
    sourcePlane: materialized.sourcePlane,
  });
  const promotedLearning = quarantine.ok
    ? quarantine.promotions.slice(0, 12).map((event) => compactPromotion(event as Row))
    : [];

  const institutionalContract = {
    identity: {
      name: 'System Friction Institute',
      shortName: 'SFI',
      operatingModel: 'OBSERVE → DISTINGUISH → HYPOTHESIZE → PREDICT → ACT ONLY UNDER AUTHORITY → RETURN → CONTRAST → LEARN',
      purpose: 'Maintain evidence-bound observability, governed reasoning, calibrated intervention and reconstructible institutional learning across complex systems.',
    },
    ontology: {
      epistemicClasses: ['OBSERVED', 'DECLARED', 'IMPORTED', 'EXTRACTED', 'DERIVED', 'INFERRED', 'SIMULATED', 'PROJECTED', 'VERIFIED_CONTRAST', 'INVALIDATED'],
      lifecycleObjects: ['SOURCE', 'OBJECT', 'RECORD', 'EVIDENCE_CANDIDATE', 'ACCEPTED_EVIDENCE', 'HYPOTHESIS', 'RIVAL_HYPOTHESIS', 'PREDICTION', 'INTERVENTION', 'RETURN', 'CONTRAST', 'LEARNING_CANDIDATE', 'CANONICAL_MEMORY'],
      distinctionRule: 'Representation, source, record, evidence, inference, simulation, proposal, authorization, execution, return and learning are distinct states and must never be collapsed for convenience.',
    },
    epistemology: {
      rules: [
        'Evidence before inference.',
        'Missing observation remains missing; narrative coherence cannot substitute measurement.',
        'A source claim is not accepted evidence merely because it is public or plausible.',
        'Simulation is not observation.',
        'Execution is not proof of success.',
        'RETURN is not causality; it must be contrasted against preregistered expectations and rivals.',
        'ROOT governs authority and institutional admission, not truth by decree.',
        'Lineage, uncertainty, contradiction and rival hypotheses survive promotion.',
      ],
    },
    philosophy: {
      orientation: 'Minimize avoidable friction while preserving enough recurrent friction to maintain direction, observability and correction.',
      autonomyRule: 'Autonomy may expand only where capabilities are observed, authority is explicit, stop conditions exist, returns are measurable and prior residual error remains visible.',
      humanMachineBoundary: 'The AI is a cognitive client/executor inside SFI contracts, not an independent epistemic or institutional sovereign.',
    },
    methodology: {
      methods: ['SFI_INFERENCE', 'DIOL_SF', 'MIHM_V3', 'PPOI', 'MOP_H', 'MOP_S', 'FAD', 'WSV', 'MINIMAL_FIELD_PERTURBATION', 'TRANSDIMENSIONAL_COHERENCE', 'OBSERVATION_AND_RESULT_CONTRAST', 'CONFIGURATION_AND_RESPONSE_LIBRARY'],
      selectionRule: 'Select the minimum method/automation set required by the observed object, question, temporal structure and evidence debt; do not run every role by default.',
    },
    learningPolicy: {
      flow: ['OBSERVED_RUN', 'LEARNING_CANDIDATE', 'QUARANTINE', 'ROOT_REVIEW', 'PROMOTED_VERIFIED_CONTRAST', 'COGNITIVE_SPINE'],
      excludedFromSpine: ['TEST_SYNTHETIC', 'FAILED_EXPERIMENT', 'UNPROMOTED_OPERATIONAL_EVIDENCE', 'RAW_AGENT_PROSE', 'UNCONTRASTED_HYPOTHESES'],
      rule: 'Closed or completed does not mean learned. Only governed promoted learning enters the Cognitive Spine.',
    },
    responseProtocol: {
      beforeReasoning: ['read this capsule', 'preserve epistemic classes', 'identify missing object observations', 'ask only unresolved blocking intake questions'],
      duringReasoning: ['prefer deterministic measurements for computable facts', 'separate primary and rival hypotheses', 'state external source lineage', 'do not invent return or execution'],
      beforeClosure: ['require the applicable closure envelope', 'preserve missing evidence and limitations', 'do not promote learning automatically'],
    },
  };

  const capsuleSemantic = {
    contract: SFI_COGNITIVE_BOOTSTRAP_CONTRACT,
    constitutionHash: constitution.hash,
    institutionalContract,
    cognitiveSpine: {
      snapshotHash: materialized.snapshot.snapshotHash,
      sourceCutoff: materialized.snapshot.semanticPayload.sourceCutoff,
      projectorVersion: materialized.snapshot.semanticPayload.projectorVersion,
      policyVersion: materialized.snapshot.semanticPayload.policyVersion,
      schemaVersion: materialized.snapshot.semanticPayload.schemaVersion,
      projectionProfile: materialized.snapshot.semanticPayload.projectionProfile,
      lineageRoot: materialized.snapshot.semanticPayload.lineageRoot,
    },
    promotedLearningEventIds: promotedLearning.map((item) => item.eventId),
  };

  const warnings = [
    ...materialized.warnings,
    ...openCycles.warnings,
    ...(!quarantine.ok ? quarantine.warnings : []),
    'warning' in constitution && constitution.warning ? constitution.warning : null,
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);

  return {
    ok: warnings.length === 0,
    contract: SFI_COGNITIVE_BOOTSTRAP_CONTRACT,
    generatedAt: createdAt,
    capsuleHash: stableHash(capsuleSemantic),
    principal: {
      actorId: input.actorId,
      subjectId: input.subjectId ?? null,
      tenantId: input.tenantId,
      role: input.role ?? 'agent',
      scopes: input.scopes,
      caseId: input.caseId ?? null,
    },
    constitution,
    institutionalContract,
    cognitiveSpine: {
      snapshotId: materialized.snapshot.snapshotId,
      snapshotHash: materialized.snapshot.snapshotHash,
      semantic: capsuleSemantic.cognitiveSpine,
      visibleRefs: {
        events: materialized.snapshot.semanticPayload.eventRefs.slice(0, 40),
        evidence: materialized.snapshot.semanticPayload.evidenceRefs.slice(0, 40),
        hypotheses: materialized.snapshot.semanticPayload.hypothesisRefs.slice(0, 40),
        memory: materialized.snapshot.semanticPayload.memoryRefs.slice(0, 40),
        decisions: materialized.snapshot.semanticPayload.decisionRefs.slice(0, 40),
        contradictions: materialized.snapshot.semanticPayload.contradictionRefs.slice(0, 40),
        questions: materialized.snapshot.semanticPayload.questionRefs.slice(0, 40),
      },
      verificationDebt: materialized.snapshot.semanticPayload.verificationDebt,
      derivedState: materialized.snapshot.semanticPayload.derivedState,
      ctSnapshotAvailable: true,
      ctSnapshotConsumed: true,
    },
    boundedInstitutionalContext: {
      memory: twinContext.memory.slice(0, 24),
      approvedDecisions: twinContext.decisions.slice(0, 16),
      warnings: twinContext.warnings,
    },
    learning: {
      promoted: promotedLearning,
      quarantineSummary: quarantine.ok ? quarantine.summary : null,
      admissionRule: 'Only SFI_UNIVERSAL_LEARNING_PROMOTED records are visible as universal-cycle learning to the Cognitive Spine.',
    },
    operationalState: {
      openUniversalCycles: openCycles.universal.slice(0, 12),
      openUniversalCycleCount: openCycles.universal.length,
      pendingGovernanceCount: openCycles.pendingProposals.length,
      cognitiveAutomationCount: SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.length,
      cognitiveAutomations: SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.map((agent) => ({
        id: agent.id,
        layer: agent.layer,
        domain: agent.domain,
        authorityLevel: agent.authorityLevel,
      })),
    },
    warnings,
    useInstruction: 'Treat this capsule as the current SFI cognitive contract for this authorized session. Retrieve case-specific evidence separately; do not treat prior institutional context as a new observation.',
    epistemicBoundary: 'Bootstrap consumption supplies governed context. It does not create evidence, authorize external action, promote learning, or convert institutional memory into present-tense observation.',
  };
}
