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

function gh(args) {
  return execFileSync('gh', args, {
    encoding: 'utf8',
    env: { ...process.env, GH_TOKEN: token },
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 60_000,
  }).trim();
}

const results = [];
for (const [owner, items] of [...byOwner.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const marker = `SFI-PROGRAM-COMPLETION-OWNER:${owner}`;
  const existingJson = gh(['issue', 'list', '--repo', repo, '--state', 'open', '--search', `${marker} in:body`, '--limit', '20', '--json', 'number,title']);
  const existing = JSON.parse(existingJson || '[]')[0] || null;
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
    number = existing.number;
    gh(['issue', 'edit', String(number), '--repo', repo, '--title', title, '--body', body]);
    action = 'UPDATED';
  } else {
    const url = gh(['issue', 'create', '--repo', repo, '--title', title, '--body', body]);
    const match = url.match(/\/(\d+)$/);
    number = match ? Number(match[1]) : null;
    action = 'CREATED';
  }
  results.push({ owner, issue: number, action, items: items.length });
}

const output = {
  contract: 'SFI-PROGRAM-COMPLETION-DISPATCH-1.0',
  generatedAt: new Date().toISOString(),
  sourceHead: report.head,
  parent: '#405',
  dispatchedOwners: results.length,
  dispatches: results,
  rootGateRequired: false,
  reason: 'Routine program reconstruction and bounded owner routing do not mutate institutional canon or expand authority.',
};
fs.writeFileSync('artifacts/program-completion/dispatch.json', JSON.stringify(output, null, 2));
console.log(JSON.stringify(output));
