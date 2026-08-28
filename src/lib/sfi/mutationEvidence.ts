import 'server-only';

import { createHash } from 'node:crypto';
import { appendEpistemicEvent } from '@/lib/events/eventStore';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const SFI_MUTATION_EVIDENCE_CONTRACT = 'SFI-MUTATION-EVIDENCE-1.0' as const;
export const SFI_MUTATION_REPOSITORY = 'Aptymok/system-friction' as const;

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function strings(value: unknown, max = 120) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()).slice(0, max)
    : [];
}
function payload(value: unknown) {
  return row(row(value).payload);
}
function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export type MutationVerification = {
  ok: boolean;
  commitSha: string;
  repository: typeof SFI_MUTATION_REPOSITORY;
  htmlUrl: string | null;
  message: string | null;
  authoredAt: string | null;
  committedAt: string | null;
  treeSha: string | null;
  parentShas: string[];
  changedFiles: Array<{ path: string; status: string | null; additions: number | null; deletions: number | null }>;
  warning: string | null;
};

export async function verifySfiGitHubCommit(commitSha: string): Promise<MutationVerification> {
  const sha = commitSha.trim();
  if (!/^[a-f0-9]{7,40}$/i.test(sha)) {
    return { ok: false, commitSha: sha, repository: SFI_MUTATION_REPOSITORY, htmlUrl: null, message: null, authoredAt: null, committedAt: null, treeSha: null, parentShas: [], changedFiles: [], warning: 'INVALID_GITHUB_COMMIT_SHA' };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`https://api.github.com/repos/${SFI_MUTATION_REPOSITORY}/commits/${encodeURIComponent(sha)}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'SystemFrictionInstitute/1.0 mutation-evidence',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      cache: 'no-store',
      signal: controller.signal,
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json || typeof json !== 'object') {
      return { ok: false, commitSha: sha, repository: SFI_MUTATION_REPOSITORY, htmlUrl: null, message: null, authoredAt: null, committedAt: null, treeSha: null, parentShas: [], changedFiles: [], warning: `GITHUB_COMMIT_LOOKUP_FAILED:${response.status}` };
    }
    const commit = row(json);
    const nested = row(commit.commit);
    const author = row(nested.author);
    const committer = row(nested.committer);
    const tree = row(nested.tree);
    const files = Array.isArray(commit.files) ? commit.files : [];
    return {
      ok: true,
      commitSha: text(commit.sha) ?? sha,
      repository: SFI_MUTATION_REPOSITORY,
      htmlUrl: text(commit.html_url),
      message: text(nested.message),
      authoredAt: text(author.date),
      committedAt: text(committer.date),
      treeSha: text(tree.sha),
      parentShas: Array.isArray(commit.parents) ? commit.parents.map((item) => text(row(item).sha)).filter((item): item is string => Boolean(item)) : [],
      changedFiles: files.slice(0, 160).map((itemValue) => {
        const item = row(itemValue);
        return {
          path: text(item.filename) ?? 'unknown',
          status: text(item.status),
          additions: Number.isFinite(Number(item.additions)) ? Number(item.additions) : null,
          deletions: Number.isFinite(Number(item.deletions)) ? Number(item.deletions) : null,
        };
      }),
      warning: null,
    };
  } catch (error) {
    return { ok: false, commitSha: sha, repository: SFI_MUTATION_REPOSITORY, htmlUrl: null, message: null, authoredAt: null, committedAt: null, treeSha: null, parentShas: [], changedFiles: [], warning: `GITHUB_COMMIT_LOOKUP_FAILED:${error instanceof Error ? error.message : String(error)}` };
  } finally {
    clearTimeout(timeout);
  }
}

async function readMutationEvent(mutationId: string) {
  const db = createServiceSupabaseClient();
  const result = await db.from('epistemic_events')
    .select('event_id,event_name,payload,occurred_at,hash_self')
    .eq('event_name', 'SFI_SYSTEM_MUTATION_RECORDED')
    .eq('payload->>mutationId', mutationId)
    .order('sequence', { ascending: false })
    .limit(1);
  if (result.error) return { ok: false as const, event: null, warning: result.error.message };
  return { ok: true as const, event: (result.data ?? [])[0] ? row(result.data?.[0]) : null, warning: null };
}

export async function recordSystemMutation(input: {
  commitSha: string;
  actorId: string;
  title: string;
  capabilityIds?: string[];
  rationale?: string | null;
}) {
  const verification = await verifySfiGitHubCommit(input.commitSha);
  if (!verification.ok) return { ok: false as const, error: 'MUTATION_COMMIT_NOT_VERIFIED', verification };
  const mutationId = `mutation:${verification.commitSha}`;
  const existing = await readMutationEvent(mutationId);
  if (!existing.ok) return { ok: false as const, error: 'MUTATION_DUPLICATE_CHECK_FAILED', warning: existing.warning, verification };
  if (existing.event) {
    return { ok: true as const, idempotent: true as const, mutationId, eventId: String(existing.event.event_id ?? ''), event: existing.event, verification };
  }
  const event = await appendEpistemicEvent({
    eventName: 'SFI_SYSTEM_MUTATION_RECORDED',
    epistemicClass: 'observed',
    confidence: 1,
    payload: {
      contract: SFI_MUTATION_EVIDENCE_CONTRACT,
      mutationId,
      repository: verification.repository,
      commit: verification,
      title: input.title,
      capabilityIds: strings(input.capabilityIds),
      rationale: input.rationale ?? null,
      validationState: 'CODE_RECORDED',
      recordedBy: input.actorId,
      recordedAt: new Date().toISOString(),
      epistemicBoundary: 'A verified GitHub commit establishes that repository state changed. It does not establish successful build, deployment, execution, causal effect or institutional learning.',
    },
    occurredAt: new Date().toISOString(),
    source: { sourceId: verification.htmlUrl ?? `github:${verification.commitSha}`, sourceType: 'github_commit' },
    logbookId: mutationId,
    lineage: [verification.commitSha, verification.treeSha].filter((value): value is string => Boolean(value)),
  });
  return event.ok
    ? { ok: true as const, idempotent: false as const, mutationId, eventId: String(event.data.event_id ?? ''), event: event.data, verification }
    : { ok: false as const, error: event.error, verification };
}

export type MutationAttachmentKind = 'QA' | 'DEPLOYMENT' | 'EXERCISE' | 'LEARNING';

const ATTACHMENT_EVENT: Record<MutationAttachmentKind, string> = {
  QA: 'SFI_SYSTEM_MUTATION_QA_RECORDED',
  DEPLOYMENT: 'SFI_SYSTEM_MUTATION_DEPLOYMENT_RECORDED',
  EXERCISE: 'SFI_SYSTEM_MUTATION_EXERCISED',
  LEARNING: 'SFI_SYSTEM_MUTATION_LEARNING_LINKED',
};

function githubActionRunId(ref: string) {
  const match = ref.match(/^https:\/\/github\.com\/Aptymok\/system-friction\/actions\/runs\/(\d+)(?:\/.*)?$/i);
  return match?.[1] ?? null;
}

async function verifySuccessfulQaRefs(refs: string[]) {
  const runIds = refs.map(githubActionRunId);
  if (runIds.some((id) => !id)) return { ok: false as const, error: 'QA_REF_MUST_BE_SFI_GITHUB_ACTION_RUN_URL', verified: [] as Row[] };
  const verified: Row[] = [];
  for (const runId of runIds as string[]) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(`https://api.github.com/repos/${SFI_MUTATION_REPOSITORY}/actions/runs/${runId}`, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'SystemFrictionInstitute/1.0 mutation-qa', 'X-GitHub-Api-Version': '2022-11-28' },
        cache: 'no-store',
        signal: controller.signal,
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json || typeof json !== 'object') return { ok: false as const, error: `QA_RUN_LOOKUP_FAILED:${runId}:${response.status}`, verified };
      const run = row(json);
      if (text(run.conclusion) !== 'success' || text(run.status) !== 'completed') return { ok: false as const, error: `QA_RUN_NOT_SUCCESSFUL:${runId}`, verified };
      verified.push({ id: run.id ?? runId, htmlUrl: run.html_url ?? null, headSha: run.head_sha ?? null, name: run.name ?? null, event: run.event ?? null, status: run.status ?? null, conclusion: run.conclusion ?? null, updatedAt: run.updated_at ?? null });
    } catch (error) {
      return { ok: false as const, error: `QA_RUN_LOOKUP_FAILED:${runId}:${error instanceof Error ? error.message : String(error)}`, verified };
    } finally {
      clearTimeout(timeout);
    }
  }
  return { ok: true as const, verified };
}

async function verifyEpistemicRefs(refs: string[], allowedEvents: string[]) {
  const db = createServiceSupabaseClient();
  const result = await db.from('epistemic_events')
    .select('event_id,event_name,epistemic_class,payload,occurred_at,hash_self')
    .in('event_id', refs)
    .in('event_name', allowedEvents);
  if (result.error) return { ok: false as const, error: result.error.message, verified: [] as Row[] };
  const verified = (result.data ?? []).map((item) => row(item));
  const found = new Set(verified.map((event) => String(event.event_id ?? '')));
  const missing = refs.filter((ref) => !found.has(ref));
  if (missing.length) return { ok: false as const, error: `MUTATION_REF_NOT_VERIFIED:${missing.join(',')}`, verified };
  return { ok: true as const, verified };
}

async function verifyMutationAttachment(kind: MutationAttachmentKind, refs: string[]) {
  if (kind === 'QA') return verifySuccessfulQaRefs(refs);
  if (kind === 'EXERCISE') {
    return verifyEpistemicRefs(refs, ['SFI_UNIVERSAL_COGNITIVE_CYCLE_EXECUTED', 'SFI_UNIVERSAL_CYCLE_RESUMED', 'SFI_UNIVERSAL_CYCLE_CLOSED']);
  }
  if (kind === 'LEARNING') return verifyEpistemicRefs(refs, ['SFI_UNIVERSAL_LEARNING_PROMOTED']);
  return { ok: true as const, verified: [] as Row[] };
}

export async function attachSystemMutationEvidence(input: {
  mutationId: string;
  kind: MutationAttachmentKind;
  actorId: string;
  refs: string[];
  outcome?: string | null;
  metadata?: Row;
}) {
  const refs = [...new Set(strings(input.refs, 80))].sort();
  if (!input.mutationId.startsWith('mutation:')) return { ok: false as const, error: 'INVALID_MUTATION_ID' };
  if (!refs.length) return { ok: false as const, error: 'MUTATION_EVIDENCE_REFS_REQUIRED' };

  const mutation = await readMutationEvent(input.mutationId);
  if (!mutation.ok) return { ok: false as const, error: 'MUTATION_LOOKUP_FAILED', warning: mutation.warning };
  if (!mutation.event) return { ok: false as const, error: 'MUTATION_NOT_FOUND' };

  const verification = await verifyMutationAttachment(input.kind, refs);
  if (!verification.ok) return { ok: false as const, error: verification.error, verified: verification.verified };
  const attachmentKey = sha256(`${input.mutationId}|${input.kind}|${refs.join('|')}|${input.outcome ?? ''}`);
  const db = createServiceSupabaseClient();
  const duplicate = await db.from('epistemic_events')
    .select('event_id,event_name,payload,occurred_at')
    .eq('event_name', ATTACHMENT_EVENT[input.kind])
    .eq('payload->>mutationId', input.mutationId)
    .eq('payload->>attachmentKey', attachmentKey)
    .limit(1);
  if (duplicate.error) return { ok: false as const, error: 'MUTATION_ATTACHMENT_DUPLICATE_CHECK_FAILED', warning: duplicate.error.message };
  if ((duplicate.data ?? []).length) {
    return { ok: true as const, idempotent: true as const, eventId: String(duplicate.data?.[0]?.event_id ?? ''), event: duplicate.data?.[0] ?? null, verification };
  }

  const event = await appendEpistemicEvent({
    eventName: ATTACHMENT_EVENT[input.kind],
    epistemicClass: input.kind === 'EXERCISE' || input.kind === 'LEARNING' ? 'derived' : 'observed',
    confidence: input.kind === 'LEARNING' ? 0.92 : 1,
    payload: {
      contract: SFI_MUTATION_EVIDENCE_CONTRACT,
      mutationId: input.mutationId,
      attachmentKey,
      kind: input.kind,
      refs,
      verifiedRefs: verification.verified,
      outcome: input.outcome ?? null,
      metadata: input.metadata ?? {},
      recordedBy: input.actorId,
      recordedAt: new Date().toISOString(),
      epistemicBoundary: input.kind === 'QA'
        ? 'QA stage is admitted only after referenced SFI GitHub Actions runs resolve as completed/success. It establishes only assertions covered by that run.'
        : input.kind === 'DEPLOYMENT'
          ? 'Deployment reference is recorded but not independently verified by this ledger. It establishes no execution or causal effect until later exercise evidence exists.'
          : input.kind === 'EXERCISE'
            ? 'Exercise stage is admitted only when refs resolve to persisted universal-cycle execution/resume/closure events. Outcome and causality remain separate.'
            : 'Learning stage is admitted only when every ref resolves to SFI_UNIVERSAL_LEARNING_PROMOTED. The mutation ledger links learning; it does not create or promote it.',
    },
    occurredAt: new Date().toISOString(),
    source: { sourceId: input.actorId, sourceType: 'mutation_evidence_attachment' },
    logbookId: input.mutationId,
    lineage: [String(mutation.event.event_id ?? ''), ...refs].filter(Boolean),
  });
  return event.ok
    ? { ok: true as const, idempotent: false as const, eventId: String(event.data.event_id ?? ''), event: event.data, verification }
    : { ok: false as const, error: event.error };
}

export async function readSystemMutationLedger(limit = 80) {
  const db = createServiceSupabaseClient();
  const result = await db.from('epistemic_events')
    .select('event_id,event_name,epistemic_class,payload,lineage,occurred_at,hash_self')
    .in('event_name', [
      'SFI_SYSTEM_MUTATION_RECORDED',
      'SFI_SYSTEM_MUTATION_QA_RECORDED',
      'SFI_SYSTEM_MUTATION_DEPLOYMENT_RECORDED',
      'SFI_SYSTEM_MUTATION_EXERCISED',
      'SFI_SYSTEM_MUTATION_LEARNING_LINKED',
    ])
    .order('sequence', { ascending: false })
    .limit(Math.max(40, Math.min(500, limit * 6)));
  if (result.error) return { ok: false as const, mutations: [], warnings: [result.error.message] };

  const events = Array.isArray(result.data) ? result.data.map((item) => row(item)) : [];
  const byMutation = new Map<string, Row[]>();
  for (const event of events) {
    const mutationId = text(payload(event).mutationId);
    if (!mutationId) continue;
    const bucket = byMutation.get(mutationId) ?? [];
    bucket.push(event);
    byMutation.set(mutationId, bucket);
  }

  const mutations = [...byMutation.entries()].flatMap(([mutationId, mutationEvents]) => {
    const code = mutationEvents.find((event) => event.event_name === 'SFI_SYSTEM_MUTATION_RECORDED') ?? null;
    if (!code) return [];
    const codePayload = payload(code);
    const commit = row(codePayload.commit);
    const qa = mutationEvents.filter((event) => event.event_name === 'SFI_SYSTEM_MUTATION_QA_RECORDED');
    const deployments = mutationEvents.filter((event) => event.event_name === 'SFI_SYSTEM_MUTATION_DEPLOYMENT_RECORDED');
    const exercises = mutationEvents.filter((event) => event.event_name === 'SFI_SYSTEM_MUTATION_EXERCISED');
    const learning = mutationEvents.filter((event) => event.event_name === 'SFI_SYSTEM_MUTATION_LEARNING_LINKED');
    const stage = learning.length ? 'CALIBRATED_LEARNING_LINKED'
      : exercises.length ? 'EXERCISED'
        : deployments.length ? 'DEPLOYMENT_EVIDENCE_RECORDED'
          : qa.length ? 'QA_VERIFIED'
            : 'CODE_RECORDED';
    return [{
      mutationId,
      title: text(codePayload.title) ?? text(commit.message)?.split('\n')[0] ?? mutationId,
      capabilityIds: strings(codePayload.capabilityIds),
      commit: {
        sha: text(commit.commitSha),
        repository: text(commit.repository),
        htmlUrl: text(commit.htmlUrl),
        message: text(commit.message),
        committedAt: text(commit.committedAt),
        treeSha: text(commit.treeSha),
        changedFileCount: Array.isArray(commit.changedFiles) ? commit.changedFiles.length : 0,
      },
      stage,
      qaCount: qa.length,
      deploymentCount: deployments.length,
      exerciseCount: exercises.length,
      learningLinkCount: learning.length,
      recordedAt: text(code.occurred_at),
      eventRefs: mutationEvents.map((event) => String(event.event_id ?? '')).filter(Boolean),
      boundary: 'Commit verifies mutation; successful GitHub Actions verifies its tested assertions; deployment is a supplied runtime-presence reference; exercise requires persisted cycle events; calibrated learning requires a separately promoted learning event.',
    }];
  }).sort((a, b) => String(b.recordedAt ?? '').localeCompare(String(a.recordedAt ?? ''))).slice(0, limit);

  return { ok: true as const, mutations, warnings: [] as string[], contract: SFI_MUTATION_EVIDENCE_CONTRACT };
}
