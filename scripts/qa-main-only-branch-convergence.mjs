import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';

const repo = process.env.GITHUB_REPOSITORY || 'Aptymok/system-friction';
const token = process.env.GITHUB_TOKEN || '';
const convergenceBranch = process.env.SFI_CONVERGENCE_BRANCH || process.env.GITHUB_HEAD_REF || '';

function git(args, options = {}) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim();
}

function isAncestor(branch) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', `origin/${branch}`, 'origin/main'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function cherry(branch) {
  try {
    return git(['cherry', 'origin/main', `origin/${branch}`]).split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function branchReviewMetadata(branch, uniqueCommits) {
  const head = git(['log', '-1', '--format=%H%x09%cI%x09%s', `origin/${branch}`]).split('\t');
  let base = '';
  try { base = git(['merge-base', 'origin/main', `origin/${branch}`]); } catch { base = ''; }
  const files = base
    ? git(['diff', '--name-only', `${base}..origin/${branch}`]).split('\n').filter(Boolean)
    : [];
  const reviewKey = createHash('sha256').update(uniqueCommits.join('\n')).digest('hex').slice(0, 16);
  return {
    reviewKey,
    headSha: head[0] || null,
    headCommittedAt: head[1] || null,
    headSubject: head.slice(2).join('\t') || null,
    changedFileCount: files.length,
    changedFiles: files.slice(0, 40),
    changedFilesTruncated: files.length > 40,
  };
}

async function pullRequestHistory() {
  const mergedHeads = new Set();
  const byHead = new Map();
  if (!token) return { mergedHeads, byHead };
  for (let page = 1; page <= 10; page += 1) {
    const response = await fetch(`https://api.github.com/repos/${repo}/pulls?state=closed&per_page=100&page=${page}`, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'sfi-main-convergence-audit',
      },
    });
    if (!response.ok) throw new Error(`pull_request_history_read_failed:${response.status}`);
    const rows = await response.json();
    for (const row of rows) {
      if (row?.head?.repo?.full_name !== repo || typeof row?.head?.ref !== 'string') continue;
      const record = {
        number: row.number,
        title: row.title,
        mergedAt: row.merged_at,
        closedAt: row.closed_at,
        base: row?.base?.ref ?? null,
      };
      const existing = byHead.get(row.head.ref) ?? [];
      existing.push(record);
      byHead.set(row.head.ref, existing);
      if (row.merged_at) mergedHeads.add(row.head.ref);
    }
    if (rows.length < 100) break;
  }
  return { mergedHeads, byHead };
}

git(['fetch', 'origin', '+refs/heads/*:refs/remotes/origin/*', '--prune']);
const prHistory = await pullRequestHistory();
const branches = git(['for-each-ref', '--format=%(refname:strip=3)', 'refs/remotes/origin'])
  .split('\n')
  .map((value) => value.trim())
  .filter(Boolean)
  .filter((value) => value !== 'HEAD' && value !== 'main');

const absorbed = [];
const unresolved = [];
for (const branch of branches) {
  if (branch === convergenceBranch) {
    absorbed.push({ branch, reason: 'CURRENT_CONVERGENCE_BRANCH' });
    continue;
  }
  if (prHistory.mergedHeads.has(branch)) {
    absorbed.push({ branch, reason: 'MERGED_PULL_REQUEST', pullRequests: prHistory.byHead.get(branch) ?? [] });
    continue;
  }
  if (isAncestor(branch)) {
    absorbed.push({ branch, reason: 'ANCESTOR_OF_MAIN', pullRequests: prHistory.byHead.get(branch) ?? [] });
    continue;
  }
  const patchRows = cherry(branch);
  const unique = patchRows.filter((line) => line.startsWith('+ ')).map((line) => line.slice(2));
  if (!unique.length) {
    absorbed.push({ branch, reason: 'PATCH_EQUIVALENT_IN_MAIN', pullRequests: prHistory.byHead.get(branch) ?? [] });
    continue;
  }
  unresolved.push({
    branch,
    reason: 'UNMERGED_DELTA_REQUIRES_REVIEW',
    uniqueCommitCount: unique.length,
    uniqueCommits: unique,
    pullRequests: prHistory.byHead.get(branch) ?? [],
    ...branchReviewMetadata(branch, unique),
  });
}

const groups = Object.values(unresolved.reduce((acc, item) => {
  acc[item.reviewKey] ??= { reviewKey: item.reviewKey, branches: [], uniqueCommitCount: item.uniqueCommitCount, headSubject: item.headSubject, changedFileCount: item.changedFileCount, changedFiles: item.changedFiles };
  acc[item.reviewKey].branches.push(item.branch);
  return acc;
}, {}));

const result = {
  ok: unresolved.length === 0,
  repo,
  mainOnlyTarget: true,
  totalNonMainBranches: branches.length,
  absorbedCount: absorbed.length,
  unresolvedCount: unresolved.length,
  unresolvedGroupCount: groups.length,
  absorbed,
  unresolved,
  groups,
};
mkdirSync('tmp', { recursive: true });
writeFileSync('tmp/main-only-branch-audit.json', `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({
  ok: result.ok,
  totalNonMainBranches: result.totalNonMainBranches,
  absorbedCount: result.absorbedCount,
  unresolvedCount: result.unresolvedCount,
  unresolvedGroupCount: result.unresolvedGroupCount,
  groups: result.groups,
  unresolved: result.unresolved.map(({ uniqueCommits, ...rest }) => rest),
}, null, 2));
if (!result.ok) process.exit(1);
