import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/lib/sfi/evidenceRequirementResolver.ts'), 'utf8');
const fail = (message: string): never => {
  console.error(`SFI web source extraction QA failed: ${message}`);
  process.exit(1);
};
const requireText = (needle: string, label: string) => {
  if (!source.includes(needle)) fail(`${label} is missing`);
};

requireText('decodeKnownHtmlEntitiesOnce', 'single-pass entity decoder');
requireText('HTML_ENTITY_TEXT', 'allowlisted entity map');
requireText('htmlToEvidenceText', 'deterministic HTML-to-evidence text extractor');
requireText("tagName === 'script' || tagName === 'style'", 'script/style exclusion');
requireText("lower.indexOf(`</${tagName}`", 'closing-tag scanner');
requireText('htmlToEvidenceText(raw)', 'direct-source extraction wiring');

if (/\.replace\(\/<script\\b/.test(source) || /\.replace\(\/<style\\b/.test(source)) {
  fail('regex-based script/style HTML filtering must not be reintroduced');
}
if (/\.replace\(\/&amp;\/gi/.test(source)) {
  fail('sequential &amp; decoding can reintroduce double-unescape behavior');
}

const entityOrder = source.indexOf('decodeKnownHtmlEntitiesOnce(output)');
const whitespaceOrder = source.indexOf(".replace(/\\s+/g, ' ')", entityOrder);
if (entityOrder < 0 || whitespaceOrder < entityOrder) fail('evidence text normalization order is incomplete');

console.log('SFI web source extraction QA: OK');
