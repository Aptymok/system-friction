import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { METHOD_LAB_CONTRACT_VERSION, assertMethodLabRunEnvelope } from './contracts';
import { methodLabProtocol } from './registry';
import { resolveMethodLabEvidence } from './persistedEvidenceResolver';
import { evaluateMihmFoundationMissingness } from './mihmFoundationDiagnostic';

function hash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

/**
 * Deliberately diagnostic-only. Evidence IDs authenticate the institutional
 * investigation context; they are never substituted for synthetic node values.
 * This runner has no real-world action/canon authority.
 */
export async function runMihmFoundationDiagnostic(input: {
  actorId: string;
  evidenceIds: string[];
  parameters?: Record<string, unknown>;
}) {
  const protocol = methodLabProtocol('mihm_foundation_diagnostic');
  if (!protocol) throw new Error('METHOD_LAB_MiHM_G1_PROTOCOL_NOT_REGISTERED');
  const startedAt = new Date().toISOString();
  const evidence = await resolveMethodLabEvidence(input.evidenceIds);
  const evidenceIds = evidence.map((e) => e.id);
  const evidenceSources = evidence.map((e) => e.source);
  const result = evaluateMihmFoundationMissingness();
  if (!result.observations.controlNumericPerturbationChangesOutput) throw new Error('MIHM_G1_DIAGNOSTIC_CONTROL_INERT');
  if (result.decision !== 'ABSTAIN_FROM_EMPIRICAL_HOMEOSTASIS_CLAIM') throw new Error('MIHM_G1_UNSAFE_INFERENCE');
  // The native Lab runner must fail before persisting a successful receipt if
  // the candidate safety gate regresses. Unit tests alone are insufficient.
  if (!result.observations.guardedMissingAbstains ||
      !result.observations.guardedSyntheticZeroAbstains ||
      !result.observations.guardedEmptyAbstains ||
      result.outputs.gatedResearchCandidate.canonicalPhiCalculated !== false ||
      result.outputs.gatedResearchCandidate.sourceProvenanceVerified !== false) {
    throw new Error('MIHM_G1_ABSTENTION_GATE_REGRESSION');
  }
  const resultHash = hash({ experiment: result.experiment, observations: result.observations, outputs: result.outputs, evidenceIds });
  const envelope = assertMethodLabRunEnvelope({
    contractVersion: METHOD_LAB_CONTRACT_VERSION,
    labRunId: randomUUID(),
    protocolId: 'mihm_foundation_diagnostic',
    protocolVersion: protocol.version,
    epistemicClass: 'SIMULATED',
    validationLevel: 'SIMULATION',
    datasetHash: hash({ syntheticFixture: result.experiment, evidenceIds, evidenceSources }),
    parametersHash: hash(input.parameters ?? {}),
    seed: null,
    codeCommit: process.env.GITHUB_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    provider: 'deterministic:@sfi/mihm-core',
    model: 'REDUCED_KERNEL_CONTINUITY',
    startedAt,
    finishedAt: new Date().toISOString(),
    resultHash,
    evidenceRefs: evidenceIds,
    limitations: result.limitations,
    promotionAllowed: false,
  });
  const db = createServiceSupabaseClient();
  const persisted = await db.from('sfi_lab_analyses').insert({
    mode: 'mihm_foundation_diagnostic',
    source: evidenceSources.join(','),
    data_mode: 'SIMULATED',
    systems: ['SFI-MIHM-FOUNDATION-001', 'REDUCED_KERNEL_CONTINUITY'],
    variables: ['ihg', 'nti', 'ldi', 'continuity', 'missingness', 'source_coverage'],
    limitations: envelope.limitations,
    recommendations: ['Treat null and measured zero differently in future variants; never infer empirical homeostasis from this diagnostic.'],
    raw_analysis: {
      ...envelope,
      experiment: result,
      evidenceSources,
      researchParent: 'SFI-MIHM-FOUNDATION-001',
      contextRule: 'Existing persisted evidence anchors research context but does not establish the synthetic fixture values.',
      requestedBy: input.actorId,
      parameters: input.parameters ?? {},
      returnState: 'PENDING_EMPIRICAL_CONTRAST',
      realityPassportBoundary: 'READ_ONLY_DIAGNOSTIC_NOT_CANONICAL',
    },
  }).select('id').single();
  if (persisted.error || !persisted.data?.id) throw new Error(`MIHM_G1_LAB_PERSIST_FAILED:${persisted.error?.message ?? 'unknown'}`);
  return {
    ok: true as const,
    labAnalysisId: String(persisted.data.id),
    protocol,
    run: envelope,
    experiment: result,
    evidenceSources,
    claimBoundary: 'Native MIHM G1 research diagnostic; all fixture outputs are synthetic. No observed-world RETURN, causal validation or canonical promotion.',
  };
}
