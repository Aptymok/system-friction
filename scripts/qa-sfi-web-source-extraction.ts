import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { structuredResultMatchesSignalIdentity } from '../src/lib/sfi/universalObservationIdentity';

const source = fs.readFileSync(path.join(process.cwd(), 'src/lib/sfi/evidenceRequirementResolver.ts'), 'utf8');
const hydrator = fs.readFileSync(path.join(process.cwd(), 'src/lib/sfi/universalObservationHydrator.ts'), 'utf8');
const fail = (message: string): never => {
  console.error(`SFI boundary hardening QA failed: ${message}`);
  process.exit(1);
};
const requireText = (needle: string, label: string) => {
  if (!source.includes(needle)) fail(`${label} is missing`);
};

requireText("from 'node:dns/promises'", 'DNS resolution boundary');
requireText("from 'node:net'", 'IP classification boundary');
requireText('isNonPublicNetworkAddress', 'non-public network classifier');
requireText('lookup(hostname, { all: true, verbatim: true })', 'resolved-address validation');
requireText('addresses.every((entry) => !isNonPublicNetworkAddress(entry.address))', 'all-address public requirement');
requireText('await resolvesOnlyToPublicAddresses(currentUrl)', 'pre-fetch DNS validation');
requireText("'UNSAFE_OR_UNRESOLVABLE_SOURCE_URL'", 'unsafe DNS failure state');
requireText('isRegulatorHostname(hostname)', 'hostname-derived regulator provenance');
requireText("source.sourceType === 'regulator'", 'authority-sensitive regulator requirement');
if (source.includes('`${hostname} ${title}`')) fail('titles must not confer source authority');

requireText('decodeKnownHtmlEntitiesOnce', 'single-pass entity decoder');
requireText('HTML_ENTITY_TEXT', 'allowlisted entity map');
requireText('htmlToEvidenceText', 'deterministic HTML-to-evidence text extractor');
requireText("tagName === 'script' || tagName === 'style'", 'script/style exclusion');
requireText("lower.indexOf(`</${tagName}`", 'closing-tag scanner');
requireText('readResponseTextBounded', 'bounded streaming source reader');
requireText('MAX_DIRECT_SOURCE_BYTES = 120_000', 'direct-source byte ceiling');
requireText('response.body.getReader()', 'streaming response reader');
requireText("reader.cancel('SFI_DIRECT_SOURCE_BYTE_LIMIT')", 'stream cancellation at byte ceiling');
requireText('htmlToEvidenceText(boundedBody.text)', 'bounded direct-source extraction wiring');
requireText('MIN_VERIFIED_QUERY_COVERAGE = 0.05', 'minimum source relevance threshold');
requireText("'DIRECT_FETCH_LOW_QUERY_RELEVANCE'", 'low-relevance source warning');
requireText('source.verification?.queryCoverage ?? 0) >= MIN_VERIFIED_QUERY_COVERAGE', 'relevance-qualified verification gate');
requireText('directFetchSourceCount: directFetchSources.length', 'retrieval-vs-verification distinction');

if (/\.replace\(\/<script\\b/.test(source) || /\.replace\(\/<style\\b/.test(source)) fail('regex-based script/style HTML filtering must not be reintroduced');
if (/\.replace\(\/&amp;\/gi/.test(source)) fail('sequential &amp; decoding can reintroduce double-unescape behavior');
if (/await\s+response\.text\s*\(\s*\)/.test(source)) fail('direct source bodies must not be fully buffered before the byte ceiling is applied');

const entityOrder = source.indexOf('decodeKnownHtmlEntitiesOnce(output)');
const whitespaceOrder = source.indexOf(".replace(/\\s+/g, ' ')", entityOrder);
if (entityOrder < 0 || whitespaceOrder < entityOrder) fail('evidence text normalization order is incomplete');

const referenceIdentity = {
  objectKey: 'object:help-desk-2025-2026',
  objectHash: 'reference-only-hash',
  objectHashBasis: 'REFERENCE_IDENTITY',
  assetRef: null,
};
const sameCycleMaterialResult = {
  cycleId: 'cycle-a',
  object: { objectKey: 'object:help-desk-2025-2026', objectHash: 'material-sha256-that-legitimately-differs-from-reference' },
};
assert.equal(structuredResultMatchesSignalIdentity(sameCycleMaterialResult, referenceIdentity, 'cycle-a'), true);
assert.equal(structuredResultMatchesSignalIdentity({ cycleId: 'cycle-a', object: { objectKey: 'object:other-file' } }, referenceIdentity, 'cycle-a'), false);
assert.equal(structuredResultMatchesSignalIdentity(sameCycleMaterialResult, referenceIdentity, 'cycle-b'), false);
assert(hydrator.includes('structuredResultMatchesSignalIdentity(payload, normalized, resumeCycleId)'));

console.log('SFI boundary hardening QA: OK');
