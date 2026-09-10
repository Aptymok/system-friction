#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  SFI_PROGRAM_COMPLETION_DIAGNOSTICS_CONTRACT,
  enrichCompletionDiagnostics,
} from './lib/programCompletionDiagnostics.mjs';

const root = process.cwd();
const artifactPath = path.join(root, 'artifacts/program-completion/completion.json');
const markdownPath = path.join(root, 'artifacts/program-completion/completion.md');

if (!fs.existsSync(artifactPath)) throw new Error('SFI_PROGRAM_COMPLETION_RECONCILED_ARTIFACT_MISSING');
const report = enrichCompletionDiagnostics(JSON.parse(fs.readFileSync(artifactPath, 'utf8')));
fs.writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`);

const existing = fs.existsSync(markdownPath) ? fs.readFileSync(markdownPath, 'utf8').trimEnd() : '';
const implementationIncomplete = (report.requirements ?? []).filter((r) => r.diagnostic?.state === 'IMPLEMENTATION_INCOMPLETE_OR_UNPROVEN');
const block = [
  '',
  '## Non-authoritative sequencing diagnostics',
  `- contract: ${SFI_PROGRAM_COMPLETION_DIAGNOSTICS_CONTRACT}`,
  '- authority: NON_AUTHORITATIVE_SEQUENCING_AID',
  '- rule: these lanes never change canonical disposition or promote SATISFIED; repository evidence is a routing clue, not completion proof.',
  ...Object.entries(report.diagnosticCounts ?? {}).map(([state, count]) => `- ${state}: ${count}`),
  '',
  '### Implementation incomplete or unproven',
  ...(implementationIncomplete.length
    ? implementationIncomplete.map((r) => `- **${r.id} · ${r.owner} · ${r.trajectoryRef}** — ${r.requirement}`)
    : ['- none']),
].join('\n');
fs.writeFileSync(markdownPath, `${existing}${block}\n`);

console.log(JSON.stringify({
  ok: true,
  contract: SFI_PROGRAM_COMPLETION_DIAGNOSTICS_CONTRACT,
  canonicalCountsUnchanged: report.counts,
  diagnosticCounts: report.diagnosticCounts,
  implementationIncompleteOrUnproven: implementationIncomplete.length,
  authoritative: false,
}));
