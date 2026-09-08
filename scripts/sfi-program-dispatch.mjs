#!/usr/bin/env node
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const reportPath = 'artifacts/program-completion/completion.json';
if (!fs.existsSync(reportPath)) throw new Error('SFI_PROGRAM_COMPLETION_REPORT_REQUIRED');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const repo = process.env.GITHUB_REPOSITORY || 'Aptymok/system-friction';
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
if (!token) throw new Error('SFI_PROGRAM_DISPATCH_GITHUB_TOKEN_REQUIRED');

const dispatchable = (report.requirements || []).filter((r) =>
  ['MISSING', 'PARTIAL', 'IN_PROGRESS'].includes(r.status)
  && r.owner
  && r.owner !== 'SFI-00'
  && (r.trajectoryRef === '#405' || r.trajectoryKind === 'CONTROL_ROOM_COMPLETION_QUEUE')
);

const byOwner = new Map();
for (const item of dispatchable) {
  const current = byOwner.get(item.owner) || [];
  current.push(item);
  byOwner.set(item.owner, current);
}

const TRANSIENT_GITHUB_ERROR = /(HTTP\s+(?:502|503|504)|Bad Gateway|Service Unavailable|Gateway Timeout|temporar(?:y|ily) unavailable|connection reset|ECONNRESET|ETIMEDOUT)/i;

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function errorText(error) {
  return [error?.message, error?.stdout, error?.stderr]
    .filter(Boolean)
    .map(String)
    .join('\n');
}

function isTransientGithubError(error) {
  return TRANSIENT_GITHUB_ERROR.test(errorText(error));
}

function gh(args, { retries = 2 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return execFileSync('gh', args, {
        encoding: 'utf8',
        env: { ...process.env, GH_TOKEN: token },
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 60_000,
      }).trim();
    } catch (error) {
      lastError = error;
      if (!isTransientGithubError(error) || attempt === retries) throw error;
      sleep(1_000 * (2 ** attempt));
    }
  }
  throw lastError;
}

function ghApi(method, endpoint, fields = [], options = {}) {
  const args = ['api', '--method', method, endpoint, '-H', 'Accept: application/vnd.github+json'];
  for (const [key, value] of fields) args.push('-f', `${key}=${value}`);
  return gh(args, options);
}

function findExistingIssue(marker) {
  const query = `repo:${repo} is:issue is:open \"${marker}\" in:body`;
  const raw = ghApi('GET', 'search/issues', [
    ['q', query],
    ['per_page', '20'],
  ], { retries: 3 });
  const payload = JSON.parse(raw || '{}');
  return Array.isArray(payload.items) ? (payload.items[0] || null) : null;
}

function updateIssue(number, title, body) {
  ghApi('PATCH', `repos/${repo}/issues/${number}`, [
    ['title', title],
    ['body', body],
  ], { retries: 3 });
}

function createIssueWithRecovery(title, body, marker) {
  const create = () => {
    const raw = ghApi('POST', `repos/${repo}/issues`, [
      ['title', title],
      ['body', body],
    ], { retries: 0 });
    const payload = JSON.parse(raw || '{}');
    if (!payload.number) throw new Error('SFI_PROGRAM_DISPATCH_CREATE_RECEIPT_MISSING');
    return { number: Number(payload.number), recovered: false };
  };

  try {
    return create();
  } catch (error) {
    if (!isTransientGithubError(error)) throw error;
    let lastError = error;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      sleep(1_000 * (2 ** attempt));
      const existing = findExistingIssue(marker);
      if (existing?.number) return { number: Number(existing.number), recovered: true };
      try {
        return create();
      } catch (retryError) {
        lastError = retryError;
        if (!isTransientGithubError(retryError)) throw retryError;
      }
    }
    const existing = findExistingIssue(marker);
    if (existing?.number) return { number: Number(existing.number), recovered: true };
    throw lastError;
  }
}

const results = [];
for (const [owner, items] of [...byOwner.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const marker = `SFI-PROGRAM-COMPLETION-OWNER:${owner}`;
  const existing = findExistingIssue(marker);
  const body = [
    `Parent: #405 / #389`,
    `Owner: ${owner}`,
    `Controller contract: ${report.contract}`,
    `Controller HEAD: ${report.head}`,
    '',
    `This issue is a durable autonomous completion trajectory generated from canonical program reconstruction. It is not authority expansion and does not imply the listed requirements are unsatisfied solely because code is absent. Each item must be verified through the evidence progression before closure.`,
    '',
    'Evidence progression:',
    '`DECLARED -> IMPLEMENTED -> WIRED -> EXECUTED -> PERSISTED -> RECONSTRUCTABLE -> RETURN_PASS`',
    '',
    '## Current bounded queue',
    ...items.slice(0, 120).map((r) => `- [ ] **${r.id} · ${r.status}** — ${r.requirement}\n  - source: ${r.source}\n  - evidence: ${(r.evidence || []).join(', ') || 'none demonstrated'}\n  - next: ${r.nextAction}\n  - RETURN: ${r.returnCondition}`),
    '',
    '## Closure rule',
    'Do not close from documentation, isolated tests, route existence, or CI green alone. Close only when every queued item is either independently SATISFIED, moved to a more specific active issue/PR, explicitly EXTERNAL_ACTION, or superseded by an authorized decision with lineage.',
    '',
    '<!-- ' + marker + ' -->',
  ].join('\n');
  const title = `FULL REMAKE · ${owner} · Autonomous Completion Trajectory`;
  let number;
  let action;
  if (existing) {
    number = Number(existing.number);
    updateIssue(number, title, body);
    action = 'UPDATED';
  } else {
    const created = createIssueWithRecovery(title, body, marker);
    number = created.number;
    action = created.recovered ? 'RECOVERED_AFTER_TRANSIENT_CREATE' : 'CREATED';
  }
  results.push({ owner, issue: number, action, items: items.length });
}

const output = {
  contract: 'SFI-PROGRAM-COMPLETION-DISPATCH-1.1',
  generatedAt: new Date().toISOString(),
  sourceHead: report.head,
  parent: '#405',
  dispatchedOwners: results.length,
  dispatches: results,
  rootGateRequired: false,
  transport: 'GITHUB_REST_WITH_BOUNDED_TRANSIENT_RETRY',
  duplicateCreationGuard: 'SEARCH_MARKER_AFTER_TRANSIENT_CREATE_BEFORE_RETRY',
  reason: 'Routine program reconstruction and bounded owner routing do not mutate institutional canon or expand authority.',
};
fs.writeFileSync('artifacts/program-completion/dispatch.json', JSON.stringify(output, null, 2));
console.log(JSON.stringify(output));
