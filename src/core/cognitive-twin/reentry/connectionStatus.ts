import 'server-only';

import { readMethodLabState } from '@/lib/method-lab/readModel';
import { readCognitiveTwinLineageHealth, COGNITIVE_TWIN_REENTRY } from './runtime';

export const COGNITIVE_TWIN_REENTRY_ROUTES = {
  evaluate: '/api/root/method-lab/decision-transfer',
  blind: '/api/root/method-lab/decision-transfer/blind',
  reveal: '/api/root/method-lab/decision-transfer/reveal',
} as const;

export async function readCognitiveTwinConnectionStatus() {
  const [lineage, lab] = await Promise.all([
    readCognitiveTwinLineageHealth(),
    readMethodLabState(),
  ]);

  const protocol = lab.protocols.find((item) => item.id === 'ct_reentry') ?? null;
  const dependenciesReady = Boolean(protocol && protocol.missingDependencies.length === 0);
  const lineageReady = lineage.genesisPresent && lineage.chainIntegrity !== 'BROKEN' && lineage.chainIntegrity !== 'DEGRADED';
  const implementationReady = Boolean(COGNITIVE_TWIN_REENTRY.subjectId && COGNITIVE_TWIN_REENTRY.lineageId && protocol && protocol.status !== 'REGISTERED');
  const connected = lineageReady && dependenciesReady && implementationReady;
  const functional = connected && Boolean(COGNITIVE_TWIN_REENTRY_ROUTES.evaluate && COGNITIVE_TWIN_REENTRY_ROUTES.blind && COGNITIVE_TWIN_REENTRY_ROUTES.reveal);
  const observedExecution = protocol?.status === 'OPERATIONAL';
  const validationObserved = lab.decisionTransfer.status === 'OBSERVED';

  return {
    generatedAt: new Date().toISOString(),
    subjectId: COGNITIVE_TWIN_REENTRY.subjectId,
    lineageId: COGNITIVE_TWIN_REENTRY.lineageId,
    connectionState: connected ? 'CONNECTED' : lineageReady ? 'DEGRADED' : 'DISCONNECTED',
    functionState: functional ? 'FUNCTIONAL' : connected ? 'CONNECTED_NOT_FUNCTIONAL' : 'UNAVAILABLE',
    observationState: observedExecution ? 'OBSERVED_OPERATIONAL' : 'READY_UNEXECUTED',
    validationState: validationObserved ? 'OBSERVED' : 'GATED',
    routes: COGNITIVE_TWIN_REENTRY_ROUTES,
    lineage: {
      genesisPresent: lineage.genesisPresent,
      chainIntegrity: lineage.chainIntegrity,
      eventCount: lineage.eventCount,
      materialEventCount: lineage.materialEventCount,
      lastEpochAt: lineage.lastEpochAt,
      prospectiveValidation: lineage.prospectiveValidation,
    },
    methodLab: protocol ? {
      status: protocol.status,
      runCount: protocol.runCount,
      lastRunAt: protocol.lastRunAt,
      missingDependencies: protocol.missingDependencies,
      warnings: protocol.warnings,
    } : null,
    decisionTransfer: lab.decisionTransfer,
    nextRequired: !connected
      ? 'REPAIR_CONNECTION_OR_DEPENDENCY'
      : !observedExecution
        ? 'RUN_GOVERNED_CT_REENTRY_EVALUATION'
        : !validationObserved
          ? 'COLLECT_OBSERVED_OR_VERIFIED_CONTRAST_VALIDATION_EVIDENCE'
          : 'CONTINUE_PROSPECTIVE_VALIDATION',
    boundary: {
      connectedMeans: 'Lineage, dependencies and execution surfaces exist.',
      functionalMeans: 'The governed CT Reentry execution path is implemented and addressable.',
      observedOperationalMeans: 'At least one persisted ct_reentry Method Lab run exists.',
      validatedMeans: 'Decision Transfer has qualifying observed/verified contrast evidence; runtime execution alone is insufficient.',
      canon: 'ROOT_ONLY',
    },
  };
}

export type CognitiveTwinConnectionStatus = Awaited<ReturnType<typeof readCognitiveTwinConnectionStatus>>;
