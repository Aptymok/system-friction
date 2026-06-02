import { NextResponse } from 'next/server';
import { appendOperationalEvent, createActionProposal, requireGovernedActor, sha256 } from '@/lib/operational/common';
import { readTwinSelfObservation } from '@/lib/operational/twinState';

export const dynamic = 'force-dynamic';

function termsFromProposal(value: unknown) {
  return JSON.stringify(value ?? {})
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9_\-]+/)
    .filter((term) => term.length >= 4);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function intersects(haystack: string[], needles: string[]) {
  return needles.some((needle) => haystack.includes(needle));
}

function summarizeSeedEvidence(selfObservation: Awaited<ReturnType<typeof readTwinSelfObservation>>, proposalInput: unknown) {
  const terms = termsFromProposal(proposalInput);
  const nodes = selfObservation.seed.nodeCatalog
    .filter((node) => {
      const searchable = [node.nodeKey, node.label, node.nodeType, ...node.variables, ...node.patterns, ...node.activationConditions]
        .join(' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .split(/[^a-z0-9_\-]+/);
      return terms.length === 0 ? node.runtimeState === 'observed' : intersects(searchable, terms);
    })
    .slice(0, 12)
    .map((node) => ({
      nodeKey: node.nodeKey,
      label: node.label,
      nodeType: node.nodeType,
      variables: node.variables.slice(0, 6),
      patterns: node.patterns.slice(0, 6),
      runtimeState: node.runtimeState,
    }));

  const patterns = selfObservation.seed.patternCatalog
    .filter((pattern) => {
      const searchable = [pattern.patternId, pattern.label, ...pattern.triggerTerms, ...pattern.variables, ...pattern.suggestedExecutions]
        .join(' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .split(/[^a-z0-9_\-]+/);
      return terms.length === 0 ? pattern.linkedNodes.length > 0 : intersects(searchable, terms);
    })
    .slice(0, 12)
    .map((pattern) => ({
      patternId: pattern.patternId,
      label: pattern.label,
      linkedNodes: pattern.linkedNodes.slice(0, 8),
      suggestedExecutions: pattern.suggestedExecutions.slice(0, 6),
      riskLevel: pattern.riskLevel,
      evidenceRequirement: pattern.evidenceRequirement,
    }));

  const documents = selfObservation.seed.documentCatalog
    .filter((document) => {
      const searchable = [document.documentId, document.title, document.source, document.status, ...document.linkedNodes, ...document.linkedPatterns, ...document.attractors]
        .join(' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .split(/[^a-z0-9_\-]+/);
      return terms.length === 0 ? document.visibility === 'public' : intersects(searchable, terms);
    })
    .slice(0, 12)
    .map((document) => ({
      documentId: document.documentId,
      title: document.title,
      source: document.source,
      visibility: document.visibility,
      linkedNodes: document.linkedNodes.slice(0, 8),
      linkedPatterns: document.linkedPatterns.slice(0, 8),
      evidenceWeight: document.evidenceWeight,
      confidence: document.confidence,
    }));

  return {
    terms: terms.slice(0, 24),
    nodes,
    patterns,
    documents,
    mihmRuntimeMatrix: selfObservation.seed.mihmRuntimeMatrix,
    accessMode: selfObservation.seed.accessMode,
    catalogCounts: {
      nodeCatalog: selfObservation.seed.nodeCatalog.length,
      documentCatalog: selfObservation.seed.documentCatalog.length,
      patternCatalog: selfObservation.seed.patternCatalog.length,
      executionCatalog: selfObservation.seed.executionCatalog.length,
    },
  };
}

export async function POST(req: Request) {
  const gate = await requireGovernedActor('twin.propose');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await req.json().catch(() => ({}));
  const selfObservation = await readTwinSelfObservation({
    user: gate.ctx.user,
    profile: gate.ctx.profile,
    accessMode: gate.ctx.isRoot ? 'root' : undefined,
  });
  const proposalInput = body.proposal ?? body;
  const proposalInputRecord = asRecord(proposalInput);
  const proposalType = stringValue(proposalInputRecord.proposalType)
    ?? (stringValue(proposalInputRecord.requested_output) === 'attractor_projection' ? 'attractor_draft' : null)
    ?? 'twin_proposal';
  const seedEvidence = summarizeSeedEvidence(selfObservation, proposalInput);
  const selfObservationPayload = {
    observed_graph_nodes: selfObservation.observed_graph_nodes,
    observed_graph_edges: selfObservation.observed_graph_edges,
    latest_kernel_status: selfObservation.latest_kernel_status,
    latest_governance_status: selfObservation.latest_governance_status,
    latest_worldspect_state: selfObservation.latest_worldspect_state,
    access_mode: selfObservation.seed.accessMode,
    seed_catalog_counts: seedEvidence.catalogCounts,
    mihm_source_state: selfObservation.seed.mihmRuntimeMatrix.sourceState,
  };
  const observed = await appendOperationalEvent({
    eventName: 'cognitive_twin.self_observed',
    actorId: gate.ctx.user.id,
    confidence: 0.72,
    payload: selfObservationPayload,
    lineage: [selfObservation.graph.loadedAt],
  });
  if (!observed.ok) return NextResponse.json(observed, { status: 400 });

  const payload = {
    quarantine: true,
    self_observation: selfObservationPayload,
    seed_evidence: seedEvidence,
    proposal: proposalInput,
    proposal_hash: sha256(proposalInput),
    seed_hash: sha256(seedEvidence),
    requires_approval: true,
  };
  const event = await appendOperationalEvent({
    eventName: 'cognitive_twin.proposal.created',
    actorId: gate.ctx.user.id,
    payload,
    lineage: [selfObservation.graph.loadedAt, observed.data.id],
  });
  if (!event.ok) return NextResponse.json(event, { status: 400 });

  const proposal = await createActionProposal({
    proposalType,
    actorId: gate.ctx.user.id,
    title: proposalType === 'attractor_draft' ? 'attractor_draft.created' : 'cognitive_twin.proposal.created',
    graphNodeCount: selfObservation.observed_graph_nodes,
    graphEdgeCount: selfObservation.observed_graph_edges,
    inputVectorHash: sha256(payload.self_observation),
    specHash: sha256(seedEvidence),
    status: 'proposed',
    eventId: event.data.id,
    payload,
  });

  return NextResponse.json(proposal, { status: proposal.ok ? 201 : 400 });
}
