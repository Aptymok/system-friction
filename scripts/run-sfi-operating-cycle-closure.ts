// EXECUTION_TRIGGER_2026_09_24
import { createHash } from 'node:crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, any>;
const AUTH_SCOPE = 'METHOD_LAB_INSTITUTIONAL_CYCLE_MIRROR_RETURN_PUBLICATION';

function obj(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function strings(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map(x => x.trim()))] : [];
}
function hash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
function addUnique(current: unknown, value: string | null | undefined) {
  const next = strings(current);
  if (value && !next.includes(value)) next.push(value);
  return next;
}
function sanitizedError(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 1200) : String(error).slice(0, 1200);
}

const db = createServiceSupabaseClient();
const requestedId = (process.env.SFI_CLOSURE_CYCLE_ID || '').trim();

let cycleQuery = db.from('sfi_operating_cycles').select('*');
if (requestedId) {
  cycleQuery = cycleQuery.eq('id', requestedId);
} else {
  cycleQuery = cycleQuery.in('status', ['EVIDENCE','METHOD_LAB','TWIN_SYNCED','CONTRASTED','BLOCKED']).order('started_at', { ascending: true }).limit(20);
}
const cycleRead = await cycleQuery;
if (cycleRead.error) throw new Error(`CLOSURE_CYCLE_READ_FAILED:${cycleRead.error.message}`);
const candidates = (cycleRead.data ?? []) as Row[];
const cycle = candidates.find((row) => {
  const metadata = obj(row.metadata);
  return metadata.machineExecutionAuthorized === true && metadata.machineExecutionScope === AUTH_SCOPE;
});
if (!cycle) {
  console.log(JSON.stringify({ ok: true, state: 'NO_AUTHORIZED_CYCLE_PENDING' }));
  process.exit(0);
}

const cycleId = String(cycle.id);
const ownerId = String(cycle.owner_id);
let cycleMetadata = obj(cycle.metadata);
const profile = await db.from('profiles').select('user_id,role').eq('user_id', ownerId).maybeSingle();
if (profile.error || !profile.data || String(profile.data.role).toLowerCase() !== 'root') {
  throw new Error('CLOSURE_OWNER_NOT_ROOT');
}
if (cycleMetadata.machineExecutionAuthorized !== true || cycleMetadata.machineExecutionScope !== AUTH_SCOPE) {
  throw new Error('CLOSURE_MACHINE_AUTHORITY_NOT_GRANTED');
}

await db.from('sfi_audit_events').insert({
  actor_id: ownerId,
  action: 'SFI_OPERATING_CYCLE_CLOSURE_EXECUTOR_STARTED',
  target_type: 'sfi_operating_cycle',
  target_id: cycleId,
  before_state: { status: cycle.status },
  after_state: { executor: 'scripts/run-sfi-operating-cycle-closure.ts' },
  context: {
    authority: 'FOUNDER_AUTHORIZED_ADMIN_CLOSURE',
    machineExecutionScope: AUTH_SCOPE,
    codeCommit: process.env.GITHUB_SHA ?? null,
  },
});


let runMethodLabSimulation: typeof import('@/lib/method-lab/simulationRun').runMethodLabSimulation;
let runIntegratedInstitutionalCycle: typeof import('@/core/cognitive-twin/integratedInstitutionalCycle').runIntegratedInstitutionalCycle;
let flushPrimaryMirror: typeof import('@/lib/persistence/primaryMirror').flushPrimaryMirror;
let readPrimaryOutboxStatus: typeof import('@/lib/persistence/primaryMirror').readPrimaryOutboxStatus;

try {
  const [labModule, institutionalModule, mirrorModule] = await Promise.all([
    import('@/lib/method-lab/simulationRun'),
    import('@/core/cognitive-twin/integratedInstitutionalCycle'),
    import('@/lib/persistence/primaryMirror'),
  ]);
  runMethodLabSimulation = labModule.runMethodLabSimulation;
  runIntegratedInstitutionalCycle = institutionalModule.runIntegratedInstitutionalCycle;
  flushPrimaryMirror = mirrorModule.flushPrimaryMirror;
  readPrimaryOutboxStatus = mirrorModule.readPrimaryOutboxStatus;
} catch (error) {
  const message = sanitizedError(error);
  await db.from('sfi_audit_events').insert({
    actor_id: ownerId,
    action: 'SFI_OPERATING_CYCLE_CLOSURE_RUNTIME_IMPORT_FAILED',
    target_type: 'sfi_operating_cycle',
    target_id: cycleId,
    before_state: { status: cycle.status },
    after_state: { status: 'BLOCKED', error: message },
    context: {
      authority: 'FOUNDER_AUTHORIZED_ADMIN_CLOSURE',
      phase: 'runtime_import',
    },
  });
  await db.from('sfi_operating_cycles').update({
    status: 'BLOCKED',
    metadata: { ...cycleMetadata, runtimeImportFailure: { observedAt: new Date().toISOString(), error: message } },
    updated_at: new Date().toISOString(),
  }).eq('id', cycleId).eq('owner_id', ownerId);
  throw error;
}

const evidenceRefs = strings(cycle.evidence_refs);
if (!evidenceRefs.length) throw new Error('CLOSURE_EVIDENCE_REQUIRED');

const evidenceRead = await db.from('sfi_evidence_ledger')
  .select('id,module,evidence_kind,source_name,public_summary,evidence_hash,observed_at')
  .in('id', evidenceRefs);
if (evidenceRead.error) throw new Error(`CLOSURE_EVIDENCE_READ_FAILED:${evidenceRead.error.message}`);
if (!(evidenceRead.data ?? []).length) throw new Error('CLOSURE_EVIDENCE_NOT_RESOLVED');
const baseline = (evidenceRead.data ?? [])[0] as Row;

let methodLabRefs = strings(cycle.method_lab_refs);
let labAnalysisId = methodLabRefs[0] ?? null;
let methodLabReceipt: Row = { reused: Boolean(labAnalysisId), labAnalysisId };

if (!labAnalysisId) {
  let lab;
  try {
    lab = await runMethodLabSimulation({
      protocolId: 'sociotechnical_simulation',
      evidenceIds: evidenceRefs,
      actorId: ownerId,
      parameters: {
        operatingCycleId: cycleId,
        cycleCode: cycle.cycle_code,
        purpose: 'Operational mirror closure contrast',
        claimBoundary: 'SIMULATED output only. The mirror RETURN is observed separately.',
      },
    });
  } catch (error) {
    const message = sanitizedError(error);
    await db.from('sfi_audit_events').insert({
      actor_id: ownerId,
      action: 'SFI_OPERATING_CYCLE_METHOD_LAB_EXECUTION_FAILED',
      target_type: 'sfi_operating_cycle',
      target_id: cycleId,
      before_state: { status: cycle.status },
      after_state: { status: 'BLOCKED', error: message },
      context: {
        authority: 'FOUNDER_AUTHORIZED_ADMIN_CLOSURE',
        epistemicBoundary: 'No Method Lab result was persisted; failure is operational evidence, not a simulation result.',
      },
    });
    await db.from('sfi_operating_cycles').update({
      status: 'BLOCKED',
      metadata: { ...cycleMetadata, methodLabFailure: { observedAt: new Date().toISOString(), error: message } },
      updated_at: new Date().toISOString(),
    }).eq('id', cycleId).eq('owner_id', ownerId);
    throw error;
  }
  labAnalysisId = lab.labAnalysisId;
  methodLabRefs = addUnique(methodLabRefs, labAnalysisId);
  methodLabReceipt = {
    reused: false,
    labAnalysisId,
    epistemicClass: lab.run.epistemicClass,
    validationLevel: lab.run.validationLevel,
    resultHash: lab.run.resultHash,
    evidenceRefs: lab.run.evidenceRefs,
    claimBoundary: lab.claimBoundary,
  };
  cycleMetadata = {
    ...cycleMetadata,
    methodLab: {
      labAnalysisId,
      epistemicClass: 'SIMULATED',
      validationLevel: 'SIMULATION',
      resultHash: lab.run.resultHash,
    },
  };
  const update = await db.from('sfi_operating_cycles').update({
    method_lab_refs: methodLabRefs,
    status: 'METHOD_LAB',
    metadata: cycleMetadata,
    updated_at: new Date().toISOString(),
  }).eq('id', cycleId).eq('owner_id', ownerId);
  if (update.error) throw new Error(`CLOSURE_METHOD_LAB_LINK_FAILED:${update.error.message}`);
}

let institutional: Row;
let cognitiveTwinRefs = strings(cycle.cognitive_twin_refs);
try {
  const run = await runIntegratedInstitutionalCycle(`operating_cycle:${cycleId}`);
  const runRef = run.run?.id ? String(run.run.id) : null;
  cognitiveTwinRefs = addUnique(cognitiveTwinRefs, runRef);
  institutional = {
    ok: run.ok,
    status: run.status,
    closureState: run.closureState,
    runId: runRef,
    cycleId: run.cycleId,
    agentCount: run.agentCount,
    warnings: run.warnings,
    connected: run.cognitiveTwinIntegration.connected,
    exercised: run.cognitiveTwinIntegration.exercised,
  };
  cycleMetadata = { ...cycleMetadata, institutionalCycle: institutional };
  const update = await db.from('sfi_operating_cycles').update({
    cognitive_twin_refs: cognitiveTwinRefs,
    status: run.ok ? 'TWIN_SYNCED' : 'METHOD_LAB',
    metadata: cycleMetadata,
    updated_at: new Date().toISOString(),
  }).eq('id', cycleId).eq('owner_id', ownerId);
  if (update.error) throw new Error(`CLOSURE_INSTITUTIONAL_LINK_FAILED:${update.error.message}`);
} catch (error) {
  institutional = { ok: false, status: 'DEGRADED', closureState: 'BLOCKED', error: sanitizedError(error) };
  cycleMetadata = { ...cycleMetadata, institutionalCycle: institutional };
  await db.from('sfi_operating_cycles').update({
    status: 'METHOD_LAB',
    metadata: cycleMetadata,
    updated_at: new Date().toISOString(),
  }).eq('id', cycleId).eq('owner_id', ownerId);
}

const mirrorExecution = await flushPrimaryMirror({ maxTransactions: 32 });
const mirrorObserved = await readPrimaryOutboxStatus();
const mirrorPass = mirrorExecution.ok === true
  && mirrorObserved.pending === 0
  && mirrorObserved.conflicts === 0
  && Boolean(mirrorObserved.lastMirroredAt);

const returnSummary = {
  observedAt: new Date().toISOString(),
  epistemicClass: 'OBSERVED',
  experimentClass: 'OPERATIONAL_VERIFICATION',
  source: 'public.sfi_data_plane_primary_outbox + existing primaryMirror worker',
  baseline: obj(baseline.public_summary),
  execution: {
    worker: 'flushPrimaryMirror',
    mirroredTransactions: mirrorExecution.mirroredTransactions,
    mirroredRows: mirrorExecution.mirroredRows,
    ok: mirrorExecution.ok,
    conflict: mirrorExecution.conflict,
  },
  return: {
    pending: mirrorObserved.pending,
    conflicts: mirrorObserved.conflicts,
    oldestPendingAt: mirrorObserved.oldestPendingAt,
    lastMirroredAt: mirrorObserved.lastMirroredAt,
  },
  result: mirrorPass ? 'OBSERVED_PASS' : 'OBSERVED_FAIL_OR_INCOMPLETE',
  claimBoundary: 'This RETURN evaluates this bounded operational execution only. It is not a general reliability or scientific-validation claim.',
};

const returnPrivateRef = `sfi-operating-cycle:${cycleId}:return`;
let returnEvidenceId: string;
const existingReturn = await db.from('sfi_evidence_ledger').select('id').eq('private_ref', returnPrivateRef).order('observed_at', { ascending: false }).limit(1).maybeSingle();
if (existingReturn.error) throw new Error(`CLOSURE_RETURN_EVIDENCE_LOOKUP_FAILED:${existingReturn.error.message}`);
if (existingReturn.data?.id) {
  returnEvidenceId = String(existingReturn.data.id);
} else {
  const insertedReturn = await db.from('sfi_evidence_ledger').insert({
    module: 'continuity',
    evidence_kind: 'operational_return',
    source_name: 'SFI primary mirror closure',
    private_ref: returnPrivateRef,
    public_summary: returnSummary,
    evidence_hash: hash(returnSummary),
    anonymized: true,
    trust_level: 'first_party_database',
    trust_score: 1,
    ldi: 1,
    observed_at: returnSummary.observedAt,
  }).select('id').single();
  if (insertedReturn.error || !insertedReturn.data?.id) {
    throw new Error(`CLOSURE_RETURN_EVIDENCE_PERSIST_FAILED:${insertedReturn.error?.message ?? 'unknown'}`);
  }
  returnEvidenceId = String(insertedReturn.data.id);
}

const traceRead = await db.from('sfi_inference_traces').select('id,payload,status').eq('operating_cycle_id', cycleId).order('created_at', { ascending: false }).limit(1).maybeSingle();
if (traceRead.error) throw new Error(`CLOSURE_INFERENCE_READ_FAILED:${traceRead.error.message}`);
if (traceRead.data?.id) {
  const tracePayload = {
    ...obj(traceRead.data.payload),
    returnEvidenceRef: returnEvidenceId,
    contrast: {
      result: returnSummary.result,
      observedAt: returnSummary.observedAt,
      pending: mirrorObserved.pending,
      conflicts: mirrorObserved.conflicts,
      lastMirroredAt: mirrorObserved.lastMirroredAt,
    },
  };
  const traceUpdate = await db.from('sfi_inference_traces').update({
    status: 'CONTRASTED',
    payload: tracePayload,
    updated_at: new Date().toISOString(),
  }).eq('id', traceRead.data.id);
  if (traceUpdate.error) throw new Error(`CLOSURE_INFERENCE_CONTRAST_FAILED:${traceUpdate.error.message}`);
}

const institutionalClosed = institutional.ok === true && institutional.closureState === 'CLOSED';
let closureEligible = Boolean(labAnalysisId) && mirrorPass && institutionalClosed;
let returnRefs = addUnique(cycle.return_refs, returnEvidenceId);
cycleMetadata = {
  ...cycleMetadata,
  return: returnSummary,
  closureCandidate: {
    eligible: closureEligible,
    methodLabPersisted: Boolean(labAnalysisId),
    mirrorObservedPass: mirrorPass,
    institutionalCycleClosed: institutionalClosed,
  },
};

const contrasted = await db.from('sfi_operating_cycles').update({
  status: closureEligible ? 'CONTRASTED' : 'BLOCKED',
  method_lab_refs: methodLabRefs,
  cognitive_twin_refs: cognitiveTwinRefs,
  return_refs: returnRefs,
  metadata: cycleMetadata,
  updated_at: new Date().toISOString(),
}).eq('id', cycleId).eq('owner_id', ownerId);
if (contrasted.error) throw new Error(`CLOSURE_CYCLE_CONTRAST_FAILED:${contrasted.error.message}`);

const publicPayload: Row = {
  contract: 'SFI-OPERATING-CYCLE-PUBLIC-RETURN-1.0',
  title: 'SFI Operational Closure — Primary Mirror',
  cycleCode: cycle.cycle_code,
  result: returnSummary.result,
  baseline: returnSummary.baseline,
  return: returnSummary.return,
  execution: returnSummary.execution,
  methodLab: {
    epistemicClass: 'SIMULATED',
    validationLevel: 'SIMULATION',
    analysisPersisted: Boolean(labAnalysisId),
  },
  institutionalCycle: {
    status: institutional.status,
    closureState: institutional.closureState,
    connected: institutional.connected ?? null,
    exercised: institutional.exercised ?? null,
  },
  limitations: [
    'The mirror result is a bounded operational RETURN for this execution, not a guarantee of future reliability.',
    'Method Lab output is SIMULATED and is not observed evidence.',
    'Institutional-cycle closure is reported exactly as returned by the governed runtime.',
  ],
  finalClosure: false,
};

let publicationId: string;
const existingPublication = await db.from('sfi_publications')
  .select('id')
  .eq('source_type', 'operating_cycle')
  .eq('source_id', cycleId)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();
if (existingPublication.error) throw new Error(`CLOSURE_PUBLICATION_LOOKUP_FAILED:${existingPublication.error.message}`);
const publicationFields = ['title','result','baseline','return','execution','methodLab','institutionalCycle','limitations','finalClosure'];
if (existingPublication.data?.id) {
  publicationId = String(existingPublication.data.id);
  const update = await db.from('sfi_publications').update({
    approved_by: ownerId,
    public_fields: publicationFields,
    public_payload: publicPayload,
    snapshot_version: 'SFI-OPERATIONAL-CLOSURE-1.0',
    status: 'PUBLISHED',
    reviewed_at: new Date().toISOString(),
    approved_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', publicationId);
  if (update.error) throw new Error(`CLOSURE_PUBLICATION_UPDATE_FAILED:${update.error.message}`);
} else {
  const inserted = await db.from('sfi_publications').insert({
    source_type: 'operating_cycle',
    source_id: cycleId,
    approved_by: ownerId,
    public_fields: publicationFields,
    public_payload: publicPayload,
    snapshot_version: 'SFI-OPERATIONAL-CLOSURE-1.0',
    status: 'PUBLISHED',
    reviewed_at: new Date().toISOString(),
    approved_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
  }).select('id').single();
  if (inserted.error || !inserted.data?.id) throw new Error(`CLOSURE_PUBLICATION_PERSIST_FAILED:${inserted.error?.message ?? 'unknown'}`);
  publicationId = String(inserted.data.id);
}

await db.from('sfi_audit_events').insert({
  actor_id: ownerId,
  action: 'SFI_OPERATING_CYCLE_RETURN_PUBLISHED',
  target_type: 'sfi_operating_cycle',
  target_id: cycleId,
  before_state: { status: cycle.status },
  after_state: { status: closureEligible ? 'CONTRASTED' : 'BLOCKED', publicationId, returnEvidenceId },
  context: {
    authority: 'FOUNDER_AUTHORIZED_ADMIN_CLOSURE',
    epistemicBoundary: returnSummary.claimBoundary,
    methodLabEpistemicClass: 'SIMULATED',
    observedReturn: returnSummary.result,
  },
});

const artifactMirror = await flushPrimaryMirror({ maxTransactions: 32 });
const artifactMirrorStatus = await readPrimaryOutboxStatus();
const artifactsConverged = artifactMirror.ok === true && artifactMirrorStatus.pending === 0 && artifactMirrorStatus.conflicts === 0;
closureEligible = closureEligible && artifactsConverged;

if (closureEligible) {
  const closedPayload = { ...publicPayload, finalClosure: true, finalMirror: { pending: 0, conflicts: 0, lastMirroredAt: artifactMirrorStatus.lastMirroredAt } };
  const closedAt = new Date().toISOString();
  const closeCycle = await db.from('sfi_operating_cycles').update({
    status: 'CLOSED',
    closed_at: closedAt,
    metadata: {
      ...cycleMetadata,
      finalClosure: {
        status: 'CLOSED',
        closedAt,
        publicationId,
        returnEvidenceId,
        finalMirrorCertified: true,
      },
    },
    updated_at: closedAt,
  }).eq('id', cycleId).eq('owner_id', ownerId);
  if (closeCycle.error) throw new Error(`CLOSURE_FINAL_CYCLE_UPDATE_FAILED:${closeCycle.error.message}`);

  const publicationUpdate = await db.from('sfi_publications').update({
    public_payload: closedPayload,
    updated_at: closedAt,
  }).eq('id', publicationId);
  if (publicationUpdate.error) throw new Error(`CLOSURE_FINAL_PUBLICATION_UPDATE_FAILED:${publicationUpdate.error.message}`);

  await db.from('sfi_audit_events').insert({
    actor_id: ownerId,
    action: 'SFI_OPERATING_CYCLE_CLOSED',
    target_type: 'sfi_operating_cycle',
    target_id: cycleId,
    before_state: { status: 'CONTRASTED' },
    after_state: { status: 'CLOSED', publicationId, returnEvidenceId },
    context: { finalMirrorCertified: true, institutionalCycleClosed: true, methodLabPersisted: true },
  });
}

let finalMirror = await flushPrimaryMirror({ maxTransactions: 32 });
let finalStatus = await readPrimaryOutboxStatus();
let finalConverged = finalMirror.ok === true && finalStatus.pending === 0 && finalStatus.conflicts === 0;

if (!finalConverged && closureEligible) {
  const blockedAt = new Date().toISOString();
  await db.from('sfi_operating_cycles').update({
    status: 'BLOCKED',
    closed_at: null,
    metadata: {
      ...cycleMetadata,
      finalClosure: {
        status: 'BLOCKED',
        reason: 'FINAL_ARTIFACT_MIRROR_NOT_CERTIFIED',
        observedAt: blockedAt,
      },
    },
    updated_at: blockedAt,
  }).eq('id', cycleId).eq('owner_id', ownerId);
  await db.from('sfi_publications').update({
    public_payload: { ...publicPayload, finalClosure: false, finalMirror: { pending: finalStatus.pending, conflicts: finalStatus.conflicts } },
    updated_at: blockedAt,
  }).eq('id', publicationId);
  await db.from('sfi_audit_events').insert({
    actor_id: ownerId,
    action: 'SFI_OPERATING_CYCLE_CLOSURE_REVOKED_MIRROR_UNCERTIFIED',
    target_type: 'sfi_operating_cycle',
    target_id: cycleId,
    before_state: { status: 'CLOSED' },
    after_state: { status: 'BLOCKED' },
    context: { pending: finalStatus.pending, conflicts: finalStatus.conflicts },
  });
  closureEligible = false;
  finalMirror = await flushPrimaryMirror({ maxTransactions: 32 });
  finalStatus = await readPrimaryOutboxStatus();
  finalConverged = finalMirror.ok === true && finalStatus.pending === 0 && finalStatus.conflicts === 0;
}

const receipt = {
  ok: closureEligible && finalConverged,
  cycleId,
  cycleCode: cycle.cycle_code,
  methodLab: methodLabReceipt,
  institutionalCycle: institutional,
  observedReturn: {
    result: returnSummary.result,
    pending: mirrorObserved.pending,
    conflicts: mirrorObserved.conflicts,
    lastMirroredAt: mirrorObserved.lastMirroredAt,
  },
  publication: { id: publicationId, status: 'PUBLISHED' },
  finalMirror: {
    ok: finalMirror.ok,
    pending: finalStatus.pending,
    conflicts: finalStatus.conflicts,
    lastMirroredAt: finalStatus.lastMirroredAt,
  },
  finalState: closureEligible && finalConverged ? 'CLOSED' : 'BLOCKED',
  claimBoundary: 'This receipt distinguishes SIMULATED Method Lab output from OBSERVED mirror RETURN and does not promote either beyond its persisted epistemic class.',
};
console.log(JSON.stringify(receipt));
if (!receipt.ok) process.exitCode = 2;
