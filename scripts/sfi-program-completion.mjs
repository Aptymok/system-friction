#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const outDir = path.join(root, 'artifacts', 'program-completion');
fs.mkdirSync(outDir, { recursive: true });

const CANONICAL_STATUS = new Set([
  'SATISFIED',
  'IN_PROGRESS',
  'PARTIAL',
  'MISSING',
  'EXTERNAL_ACTION',
  'SUPERSEDED_BY_AUTHORIZED_DECISION',
]);

const WORKSTREAM_FILES = [
  'docs/program/workstreams/WS-01-COGNITIVE-FABRIC.md',
  'docs/program/workstreams/WS-02-TWIN-METHOD-LAB.md',
  'docs/program/workstreams/WS-03-DISCOVERY-MESH.md',
  'docs/program/workstreams/WS-04-MACHINE-INTERFACES.md',
  'docs/program/workstreams/WS-05-RESEARCH-GRAPH.md',
  'docs/program/workstreams/WS-06-MATERIAL-AUDIO.md',
  'docs/program/workstreams/WS-07-EXTERNAL-IDENTITY.md',
  'docs/program/workstreams/WS-08-ASSURANCE-RELEASE.md',
];

const CORE_FILES = [
  'docs/program/SFI-MASTER-PROGRAM.md',
  'docs/program/SFI-CONTRACT-LOCK.md',
  'docs/program/DEPENDENCY-GRAPH.md',
  'docs/program/DECISIONS.md',
  ...WORKSTREAM_FILES,
  'docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md',
];

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const sha = (() => {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); }
  catch { return process.env.GITHUB_SHA || 'UNKNOWN'; }
})();

function ownerFromSource(source, text = '') {
  const ws = source.match(/WS-(0[1-8])/i)?.[1] || text.match(/WS-(0[1-8])/i)?.[1];
  if (ws) return `SFI-${ws}`;
  if (/audio|instrument|render|stem|cultural target/i.test(text)) return 'SFI-06';
  if (/discovery|crawler|UDR|EIC|IRD|ACR|ECR|MPD|ERR/i.test(text)) return 'SFI-03';
  if (/MCP|machine interface|OAuth|scope/i.test(text)) return 'SFI-04';
  if (/Twin|Method Lab|preregistration/i.test(text)) return 'SFI-02';
  if (/research|DOI|ORCID|ROR|Zenodo|OpenAlex|Scholar/i.test(text)) return 'SFI-05';
  if (/identity|LinkedIn|Medium|YouTube|Mastodon|Bluesky|Postman|Hugging Face/i.test(text)) return 'SFI-07';
  if (/assurance|CI|production|deployment|RETURN/i.test(text)) return 'SFI-08';
  if (/runtime|passport|capability|model broker|task graph/i.test(text)) return 'SFI-01';
  return 'SFI-00';
}

function normalizeRequirementText(value) {
  return value
    .replace(/^[-*]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function significantTokens(text) {
  const stop = new Set(['that','this','with','from','when','where','only','must','should','required','through','into','without','while','after','before','under','have','remain','real','current','existing','every','same','their','them','then','than','para','como','debe','deben','desde','entre','cuando','donde','cada','todo']);
  return [...new Set((text.toLowerCase().match(/[a-z0-9_:-]{4,}/g) || []).filter(t => !stop.has(t)))].slice(0, 10);
}

function extractProgramCriteria(master) {
  const marker = master.indexOf('## 7. Definition of program completion');
  if (marker < 0) return [];
  const tail = master.slice(marker).split('\n## 8.')[0];
  return tail.split('\n').map(line => line.match(/^\s*(\d+)\.\s+(.+)/)).filter(Boolean).map(m => ({
    id: `MASTER-${String(m[1]).padStart(2, '0')}`,
    source: 'docs/program/SFI-MASTER-PROGRAM.md#definition-of-program-completion',
    requirement: normalizeRequirementText(m[2]),
    owner: ownerFromSource('MASTER', m[2]),
    class: 'PROGRAM_CRITERION',
  }));
}

function extractNormativeLines(source, text, prefix) {
  let inFence = false;
  const out = [];
  let index = 0;
  for (const line of text.split('\n')) {
    if (line.trim().startsWith('```')) { inFence = !inFence; continue; }
    if (inFence) continue;
    const m = line.match(/^\s*(?:[-*]|\d+[.)])\s+(.+)/);
    if (!m) continue;
    const req = normalizeRequirementText(m[1]);
    if (req.length < 18) continue;
    if (!/(must|required|complete|only when|prove|verify|preserve|remain|cannot|never|no |implement|support|expose|record|observe|publish|return|reconstruct|execute|persist|discover|gate|boundary|identity|lineage|rights|authority|evidence|metric|preregistr|external)/i.test(req)) continue;
    index += 1;
    out.push({
      id: `${prefix}-${String(index).padStart(3, '0')}`,
      source,
      requirement: req,
      owner: ownerFromSource(source, req),
      class: prefix === 'LEGACY154' ? 'LEGACY_REQUIREMENT' : 'WORKSTREAM_REQUIREMENT',
    });
  }
  return out;
}

function tryGhJson(args) {
  try {
    const out = execFileSync('gh', args, {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, GH_TOKEN: process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '' },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30_000,
    });
    return JSON.parse(out);
  } catch { return null; }
}

const repo = process.env.GITHUB_REPOSITORY || 'Aptymok/system-friction';
const openIssues = tryGhJson(['issue', 'list', '--repo', repo, '--state', 'open', '--limit', '200', '--json', 'number,title,body,url']) || [];
const issue405 = tryGhJson(['issue', 'view', '405', '--repo', repo, '--json', 'number,title,body,comments,url']);
const issue154 = tryGhJson(['issue', 'view', '154', '--repo', repo, '--json', 'number,title,body,url']);

function acceptedControlRequirements() {
  if (!issue405) return [];
  const texts = [issue405.body || ''];
  for (const comment of issue405.comments || []) {
    if (/ROOT DIRECTIVE|accepted program authority|Autonomous Program Completion/i.test(comment.body || '')) texts.push(comment.body || '');
  }
  return extractNormativeLines('GitHub issue #405 accepted control directives', texts.join('\n'), 'CTRL405');
}

function legacyIssueRequirements() {
  if (!issue154?.body) return [];
  return extractNormativeLines('GitHub issue #154', issue154.body, 'ISSUE154');
}

function issueMatch(requirement) {
  const sourceWs = requirement.source.match(/WS-(0[1-8])/i)?.[1];
  const tokens = significantTokens(requirement.requirement).slice(0, 6);
  let best = null;
  let bestScore = 0;
  for (const issue of openIssues) {
    const hay = `${issue.title || ''} ${issue.body || ''}`.toLowerCase();
    let score = 0;
    if (sourceWs && hay.includes(`ws-${sourceWs}`)) score += 5;
    for (const token of tokens) if (hay.includes(token)) score += 1;
    if (score > bestScore) { bestScore = score; best = issue; }
  }
  return bestScore >= (sourceWs ? 5 : 3) ? best : null;
}

function repositoryEvidence(requirement) {
  const tokens = significantTokens(requirement.requirement).filter(t => !/^sfi-0[0-8]$/.test(t)).slice(0, 4);
  if (!tokens.length) return [];
  const files = [];
  for (const token of tokens) {
    try {
      const out = execFileSync('git', ['grep', '-Il', token, '--', 'src', 'scripts', '.github/workflows'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      for (const f of out.split('\n').filter(Boolean)) if (!files.includes(f)) files.push(f);
    } catch {}
  }
  return files.slice(0, 8);
}

function looksExternal(text) {
  return /(external-only|external action|registry submission|directory submission|account ownership|platform acceptance|LinkedIn|Medium|YouTube|Bluesky|Mastodon|Hugging Face|Zenodo|ORCID|ROR|ResearchGate|Postman|OSF)/i.test(text);
}

function classify(requirement) {
  const active = issueMatch(requirement);
  const codeEvidence = repositoryEvidence(requirement);
  const external = looksExternal(requirement.requirement);
  if (external && !active) {
    return {
      status: 'EXTERNAL_ACTION',
      evidence: codeEvidence,
      trajectoryRef: '#405',
      trajectoryKind: 'CONTROL_ROOM_EXTERNAL_LEDGER',
      nextAction: `Observe actual external state and record exact owner, next action and receipt required; do not fabricate completion.`,
      returnCondition: 'Real external receipt or explicit observed external state is durably recorded.',
    };
  }
  if (active) {
    return {
      status: 'IN_PROGRESS',
      evidence: codeEvidence,
      trajectoryRef: `#${active.number}`,
      trajectoryKind: 'OPEN_GITHUB_ISSUE',
      nextAction: `Continue bounded implementation/verification through ${requirement.owner}; update ${`#${active.number}`} with immutable evidence and RETURN state.`,
      returnCondition: 'Exact-head QA plus execution/persistence/reentry/production/RETURN evidence required by the source contract.',
    };
  }
  if (codeEvidence.length) {
    return {
      status: 'PARTIAL',
      evidence: codeEvidence,
      trajectoryRef: '#405',
      trajectoryKind: 'CONTROL_ROOM_COMPLETION_QUEUE',
      nextAction: `Dispatch a bounded verification/completion slice to ${requirement.owner}; presence is not accepted as operational proof.`,
      returnCondition: 'Demonstrate IMPLEMENTED -> WIRED -> EXECUTED -> PERSISTED -> RECONSTRUCTABLE -> RETURN_PASS where applicable.',
    };
  }
  return {
    status: 'MISSING',
    evidence: [],
    trajectoryRef: '#405',
    trajectoryKind: 'CONTROL_ROOM_COMPLETION_QUEUE',
    nextAction: `Generate a bounded implementation trajectory for ${requirement.owner} from this canonical requirement and verify it independently.`,
    returnCondition: 'Repository implementation plus executable evidence and RETURN proof appropriate to the requirement.',
  };
}

const missingCanonicalFiles = CORE_FILES.filter(p => !exists(p));
const requirements = [];
if (exists('docs/program/SFI-MASTER-PROGRAM.md')) requirements.push(...extractProgramCriteria(read('docs/program/SFI-MASTER-PROGRAM.md')));
for (const p of WORKSTREAM_FILES) if (exists(p)) requirements.push(...extractNormativeLines(p, read(p), p.match(/WS-(0[1-8])/i)?.[0] || 'WS'));
if (exists('docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md')) requirements.push(...extractNormativeLines('docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md', read('docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md'), 'LEGACY154'));
requirements.push(...legacyIssueRequirements());
requirements.push(...acceptedControlRequirements());

const seen = new Set();
const unique = requirements.filter(r => {
  const key = `${r.source}\n${r.requirement.toLowerCase()}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

const classified = unique.map(r => ({ ...r, ...classify(r) }));
const counts = Object.fromEntries([...CANONICAL_STATUS].map(s => [s, classified.filter(r => r.status === s).length]));
counts.UNCLASSIFIED = classified.filter(r => !CANONICAL_STATUS.has(r.status)).length;

const hardDefects = [];
for (const r of classified) {
  if (!CANONICAL_STATUS.has(r.status)) hardDefects.push({ id: `${r.id}:unclassified`, rule: 'UNCLASSIFIED_REQUIREMENT', requirementId: r.id });
  if (!['SATISFIED', 'EXTERNAL_ACTION', 'SUPERSEDED_BY_AUTHORIZED_DECISION'].includes(r.status) && (!r.owner || !r.trajectoryRef || !r.nextAction)) {
    hardDefects.push({ id: `${r.id}:no-trajectory`, rule: 'KNOWN_INCOMPLETE_AND_NO_ACTIVE_COMPLETION_TRAJECTORY', requirementId: r.id });
  }
}
for (const p of missingCanonicalFiles) hardDefects.push({ id: `missing-canonical:${p}`, rule: 'KNOWN_INCOMPLETE_AND_NO_ACTIVE_COMPLETION_TRAJECTORY', requirementId: p, trajectoryRef: '#405' });

const masterCriteria = classified.filter(r => r.class === 'PROGRAM_CRITERION');
const qa = {
  canonicalFilesPresent: missingCanonicalFiles.length === 0,
  masterCriteriaCount: masterCriteria.length,
  masterCriteriaExactly24: masterCriteria.length === 24,
  unclassifiedZero: counts.UNCLASSIFIED === 0,
  allIncompleteHaveTrajectory: hardDefects.every(d => d.rule !== 'KNOWN_INCOMPLETE_AND_NO_ACTIVE_COMPLETION_TRAJECTORY' || Boolean(d.trajectoryRef)) && classified.every(r => ['SATISFIED','EXTERNAL_ACTION','SUPERSEDED_BY_AUTHORIZED_DECISION'].includes(r.status) || Boolean(r.owner && r.trajectoryRef && r.nextAction)),
  legacy154Included: classified.some(r => /154|ROOT_WORLD_CASE/.test(r.source)),
  accepted405DirectiveIncluded: classified.some(r => r.source.includes('#405')),
  rootGateRule: 'ADD/PROMOTE institutional mutation only',
};

const report = {
  contract: 'SFI-PROGRAM-COMPLETION-CONTROLLER-1.0',
  generatedAt: new Date().toISOString(),
  repository: repo,
  head: sha,
  sourceAuthority: ['main repository', '#389', '#405', 'SFI-MASTER-PROGRAM', 'Contract Lock', 'Dependency Graph', 'Decisions', 'WS-01..WS-08', '#154'],
  evidenceProgression: ['DECLARED','IMPLEMENTED','WIRED','EXECUTED','PERSISTED','RECONSTRUCTABLE','RETURN_PASS'],
  rootGateRule: 'OBSERVE/RECONSTRUCT/ANALYZE/HYPOTHESIZE/TEST/BOUNDED_REPAIR/GENERATE/RETURN/LEARN_CANDIDATE do not require ROOT; ADD/PROMOTE institutional mutation does.',
  counts,
  qa,
  missingCanonicalFiles,
  hardDefects,
  openIssueCount: openIssues.length,
  requirements: classified,
  nextProgramAction: hardDefects.length ? 'REPAIR_CONTROLLER_INTEGRITY' : classified.some(r => !['SATISFIED','EXTERNAL_ACTION','SUPERSEDED_BY_AUTHORIZED_DECISION'].includes(r.status)) ? 'EXECUTE_COMPLETION_TRAJECTORIES' : 'RUN_FINAL_ASSURANCE_AND_RETURN_GATE',
};

fs.writeFileSync(path.join(outDir, 'completion.json'), JSON.stringify(report, null, 2));
const md = [
  '# SFI · Autonomous Program Completion Controller',
  '',
  `**Contract:** ${report.contract}  `,
  `**HEAD:** ${sha}  `,
  `**Generated:** ${report.generatedAt}  `,
  '',
  '## Classification',
  ...Object.entries(counts).map(([k,v]) => `- ${k}: ${v}`),
  '',
  '## Controller QA',
  ...Object.entries(qa).map(([k,v]) => `- ${k}: ${String(v)}`),
  '',
  '## Hard defects',
  ...(hardDefects.length ? hardDefects.map(d => `- ${d.rule}: ${d.requirementId}`) : ['- none']),
  '',
  '## Active completion trajectories',
  ...classified.filter(r => !['SATISFIED','SUPERSEDED_BY_AUTHORIZED_DECISION'].includes(r.status)).map(r => `- **${r.id} · ${r.status} · ${r.owner} · ${r.trajectoryRef}** — ${r.requirement} — NEXT: ${r.nextAction}`),
  '',
  '## Authority',
  report.rootGateRule,
  '',
  'No requirement is promoted to SATISFIED from file presence, documentation, isolated tests or green CI alone.',
].join('\n');
fs.writeFileSync(path.join(outDir, 'completion.md'), md);

const controllerPass = qa.canonicalFilesPresent && qa.masterCriteriaExactly24 && qa.unclassifiedZero && qa.allIncompleteHaveTrajectory && qa.legacy154Included && qa.accepted405DirectiveIncluded;
console.log(JSON.stringify({ ok: controllerPass, head: sha, counts, hardDefects: hardDefects.length, requirements: classified.length, nextProgramAction: report.nextProgramAction }));
if (!controllerPass) process.exitCode = 2;
