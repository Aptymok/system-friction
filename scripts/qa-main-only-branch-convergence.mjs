import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

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

async function mergedPullRequestHeads() {
  if (!token) return new Set();
  const heads = new Set();
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
      if (row?.merged_at && row?.head?.repo?.full_name === repo && typeof row?.head?.ref === 'string') heads.add(row.head.ref);
    }
    if (rows.length < 100) break;
  }
  return heads;
}

git(['fetch', 'origin', '+refs/heads/*:refs/remotes/origin/*', '--prune']);
const mergedHeads = await mergedPullRequestHeads();
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
  if (mergedHeads.has(branch)) {
    absorbed.push({ branch, reason: 'MERGED_PULL_REQUEST' });
    continue;
  }
  if (isAncestor(branch)) {
    absorbed.push({ branch, reason: 'ANCESTOR_OF_MAIN' });
    continue;
  }
  const patchRows = cherry(branch);
  const unique = patchRows.filter((line) => line.startsWith('+ '));
  if (!unique.length) {
    absorbed.push({ branch, reason: 'PATCH_EQUIVALENT_IN_MAIN' });
    continue;
  }
  unresolved.push({
    branch,
    reason: 'UNMERGED_DELTA_REQUIRES_REVIEW',
    uniqueCommits: unique.map((line) => line.slice(2)),
  });
}

const result = {
  ok: unresolved.length === 0,
  repo,
  mainOnlyTarget: true,
  totalNonMainBranches: branches.length,
  absorbedCount: absorbed.length,
  unresolvedCount: unresolved.length,
  absorbed,
  unresolved,
};
writeFileSync('tmp/main-only-branch-audit.json', `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({
  ok: result.ok,
  totalNonMainBranches: result.totalNonMainBranches,
  absorbedCount: result.absorbedCount,
  unresolvedCount: result.unresolvedCount,
  unresolved: result.unresolved,
}, null, 2));
if (!result.ok) process.exit(1);
