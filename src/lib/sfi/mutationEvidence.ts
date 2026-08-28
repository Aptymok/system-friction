import 'server-only';

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
    ? { ok: true as const, mutationId, eventId: String(event.data.event_id ?? ''), event: event.data, verification }
    : { ok: false as const, error: event.error, verification };
}

export type MutationAttachmentKind = 'QA' | 'DEPLOYMENT' | 'EXERCISE' | 'LEARNING';

const ATTACHMENT_EVENT: Record<MutationAttachmentKind, string> = {
  QA: 'SFI_SYSTEM_MUTATION_QA_RECORDED',
  DEPLOYMENT: 'SFI_SYSTEM_MUTATION_DEPLOYMENT_RECORDED',
  EXERCISE: 'SFI_SYSTEM_MUTATION_EXERCISED',
  LEARNING: 'SFI_SYSTEM_MUTATION_LEARNING_LINKED',
};

export async function attachSystemMutationEvidence(input: {
  mutationId: string;
  kind: MutationAttachmentKind;
  actorId: string;
  refs: string[];
  outcome?: string | null;
  metadata?: Row;
}) {
  const refs = strings(input.refs, 80);
  if (!input.mutationId.startsWith('mutation:')) return { ok: false as const, error: 'INVALID_MUTATION_ID' };
  if (!refs.length) return { ok: false as const, error: 'MUTATION_EVIDENCE_REFS_REQUIRED' };
  const event = await appendEpistemicEvent({
    eventName: ATTACHMENT_EVENT[input.kind],
    epistemicClass: input.kind === 'EXERCISE' || input.kind === 'LEARNING' ? 'derived' : 'observed',
    confidence: input.kind === 'LEARNING' ? 0.92 : 1,
    payload: {
      contract: SFI_MUTATION_EVIDENCE_CONTRACT,
      mutationId: input.mutationId,
      kind: input.kind,
      refs,
      outcome: input.outcome ?? null,
      metadata: input.metadata ?? {},
      recordedBy: input.actorId,
      recordedAt: new Date().toISOString(),
      epistemicBoundary: input.kind === 'QA'
        ? 'QA evidence establishes only the tested assertions and environment represented by the supplied references.'
        : input.kind === 'DEPLOYMENT'
          ? 'Deployment evidence establishes code presence in a runtime target, not successful use or causal effect.'
          : input.kind === 'EXERCISE'
            ? 'Exercise evidence establishes that the mutation participated in a real cycle; outcome and causality remain separate.'
            : 'Learning linkage points to an already governed learning event. The mutation ledger does not itself promote or create learning.',
    },
    occurredAt: new Date().toISOString(),
    source: { sourceId: input.actorId, sourceType: 'mutation_evidence_attachment' },
    logbookId: input.mutationId,
    lineage: refs,
  });
  return event.ok ? { ok: true as const, eventId: String(event.data.event_id ?? ''), event: event.data } : { ok: false as const, error: event.error };
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

  const mutations = [...byMutation.entries()].map(([mutationId, mutationEvents]) => {
    const code = mutationEvents.find((event) => event.event_name === 'SFI_SYSTEM_MUTATION_RECORDED') ?? null;
    const codePayload = payload(code);
    const commit = row(codePayload.commit);
    const qa = mutationEvents.filter((event) => event.event_name === 'SFI_SYSTEM_MUTATION_QA_RECORDED');
    const deployments = mutationEvents.filter((event) => event.event_name === 'SFI_SYSTEM_MUTATION_DEPLOYMENT_RECORDED');
    const exercises = mutationEvents.filter((event) => event.event_name === 'SFI_SYSTEM_MUTATION_EXERCISED');
    const learning = mutationEvents.filter((event) => event.event_name === 'SFI_SYSTEM_MUTATION_LEARNING_LINKED');
    const stage = learning.length ? 'CALIBRATED_LEARNING_LINKED'
      : exercises.length ? 'EXERCISED'
        : deployments.length ? 'DEPLOYED'
          : qa.length ? 'QA_VERIFIED'
            : 'CODE_RECORDED';
    return {
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
      recordedAt: text(row(code).occurred_at),
      eventRefs: mutationEvents.map((event) => String(event.event_id ?? '')).filter(Boolean),
      boundary: 'Commit verifies mutation; QA verifies tested assertions; deployment verifies presence; exercise verifies participation; calibrated learning requires a separate governed learning lineage.',
    };
  }).sort((a, b) => String(b.recordedAt ?? '').localeCompare(String(a.recordedAt ?? ''))).slice(0, limit);

  return { ok: true as const, mutations, warnings: [] as string[], contract: SFI_MUTATION_EVIDENCE_CONTRACT };
}
