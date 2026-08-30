import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { createKernelContext } from '../src/lib/sfi/cognitive-runtime/createKernelContext';
import { FrictionFieldSimulatorAgent } from '../src/lib/sfi/cognitive-runtime/agents/frictionFieldSimulator';
import { isNonPublicNetworkAddress, resolveUniversalEvidenceRequirements } from '../src/lib/sfi/evidenceRequirementResolver';
import { structuredResultMatchesSignalIdentity } from '../src/lib/sfi/universalObservationIdentity';

// Final merge gate: retrieval must pin the network connection to an address from
// the exact public-address set that passed validation; a separate DNS lookup is a regression.
const source = fs.readFileSync(path.join(process.cwd(), 'src/lib/sfi/evidenceRequirementResolver.ts'), 'utf8');
const signalRoute = fs.readFileSync(path.join(process.cwd(), 'src/app/api/external/v1/signal/route.ts'), 'utf8');
const closure = fs.readFileSync(path.join(process.cwd(), 'src/lib/sfi/universalClosure.ts'), 'utf8');
const hydrator = fs.readFileSync(path.join(process.cwd(), 'src/lib/sfi/universalObservationHydrator.ts'), 'utf8');
const universalCycle = fs.readFileSync(path.join(process.cwd(), 'src/lib/sfi/universalSignalCycle.ts'), 'utf8');
const riskAgent = fs.readFileSync(path.join(process.cwd(), 'src/lib/sfi/cognitive-runtime/agents/riskAgent.ts'), 'utf8');
const fail = (message: string): never => {
  console.error(`SFI boundary hardening QA failed: ${message}`);
  process.exit(1);
};
const requireText = (needle: string, label: string) => {
  if (!source.includes(needle)) fail(`${label} is missing`);
};

requireText("from 'node:dns/promises'", 'DNS resolution boundary');
requireText("from 'node:http'", 'pinned HTTP transport');
requireText("from 'node:https'", 'pinned HTTPS transport');
requireText("from 'node:net'", 'IP classification boundary');
requireText('isNonPublicNetworkAddress', 'non-public network classifier');
requireText('ipv4FromMappedIpv6', 'IPv4-mapped IPv6 normalization');
requireText('resolvePublicAddresses', 'public-address resolver');
requireText('lookup(hostname, { all: true, verbatim: true })', 'resolved-address validation');
requireText('addresses.some((entry) => isNonPublicNetworkAddress(entry.address))', 'all-address public requirement');
requireText('requestPinnedAddress', 'address-pinned request');
requireText('requestPinnedSource', 'validated-address connection path');
requireText('hostname: address', 'connection pinned to validated address');
requireText('Host: parsed.host', 'original HTTP Host preservation');
requireText('function transportHostname(value: string)', 'transport hostname preservation');
requireText('const hostname = transportHostname(parsed.hostname)', 'exact DNS hostname preservation');
requireText('const originalHostname = transportHostname(parsed.hostname)', 'exact TLS hostname preservation');
requireText('servername: isIP(originalHostname) ? undefined : originalHostname', 'original TLS SNI preservation');
requireText('const validatedAddresses = await resolvePublicAddresses(currentUrl, sourceDeadlineAt)', 'deadline-bounded per-hop address validation');
requireText("'UNSAFE_OR_UNRESOLVABLE_SOURCE_URL'", 'unsafe DNS failure state');
if (source.includes('fetch(currentUrl')) fail('direct source retrieval must not perform an unpinned second DNS resolution');
if (source.includes('const originalHostname = normalizeHostname(parsed.hostname)')) fail('transport TLS identity must not strip www or otherwise use classification normalization');

requireText('DIRECT_SOURCE_TOTAL_DEADLINE_MS = 8_000', 'total direct-source deadline');
requireText('const sourceDeadlineAt = Date.now() + DIRECT_SOURCE_TOTAL_DEADLINE_MS', 'one absolute deadline per source');
requireText('requestPinnedAddress(urlValue: string, address: string, deadlineAt: number)', 'shared deadline at address attempt');
requireText('requestPinnedSource(urlValue: string, addresses: string[], deadlineAt: number)', 'shared deadline across address retries');
requireText('requestPinnedSource(currentUrl, validatedAddresses, sourceDeadlineAt)', 'shared deadline across redirects');
requireText("request.destroy(new Error('DIRECT_FETCH_TOTAL_DEADLINE'))", 'wall-clock fetch cancellation');
requireText('DIRECT_SOURCE_INACTIVITY_TIMEOUT_MS = 8_000', 'inactivity timeout retained');
requireText("request.destroy(new Error('DIRECT_FETCH_INACTIVITY_TIMEOUT'))", 'inactivity cancellation retained');
requireText("request.on('close'", 'deadline cleanup on request close');
assert.equal((source.match(/Date\.now\(\) \+ DIRECT_SOURCE_TOTAL_DEADLINE_MS/g) ?? []).length, 1, 'source deadline must be created once, not once per IP or redirect');

requireText('const hasSlaToken = /\\bsla\\b/.test(blob)', 'SLA token boundary');
const internalWords = resolveUniversalEvidenceRequirements({
  signal: { kind: 'dataset', name: 'traslado_isla.xlsx' },
  question: 'Analizar traslado de registros de la isla en un archivo interno',
  objective: 'Evaluar registros internos',
  context: {},
});
assert.notEqual(internalWords.webPolicy, 'WEB_REQUIRED', 'isla/traslado must not be misread as SLA');
assert.equal(internalWords.authoritySensitive, false, 'isla/traslado must not create authority-sensitive evidence requirements');
const explicitSla = resolveUniversalEvidenceRequirements({
  signal: { kind: 'dataset', name: 'mesa-ayuda.xlsx' },
  question: 'Validar el SLA de atención con el estándar vigente',
  objective: 'Contrastar cumplimiento del SLA',
  context: {},
});
assert.equal(explicitSla.webPolicy, 'WEB_REQUIRED', 'SLA as a complete token must still trigger external verification');
assert.equal(explicitSla.authoritySensitive, true, 'SLA as a complete token must remain authority-sensitive');

requireText('isRegulatorHostname(hostname)', 'hostname-derived regulator provenance');
requireText("source.sourceType === 'regulator'", 'authority-sensitive regulator requirement');
requireText('const finalSourceType = classifySource(currentUrl, source.title)', 'redirect-aware provenance reclassification');
requireText('const finalReliability = reliabilityFor(finalSourceType, currentUrl)', 'redirect-aware reliability reclassification');
if (source.includes('`${hostname} ${title}`')) fail('titles must not confer source authority');

assert.equal(isNonPublicNetworkAddress('::ffff:7f00:1'), true, 'hex IPv4-mapped loopback must be rejected');
assert.equal(isNonPublicNetworkAddress('::ffff:c0a8:101'), true, 'hex IPv4-mapped RFC1918 must be rejected');
assert.equal(isNonPublicNetworkAddress('::ffff:0808:0808'), false, 'hex IPv4-mapped public address must remain public');

requireText('decodeKnownHtmlEntitiesOnce', 'single-pass entity decoder');
requireText('HTML_ENTITY_TEXT', 'allowlisted entity map');
requireText('htmlToEvidenceText', 'deterministic HTML-to-evidence text extractor');
requireText("tagName === 'script' || tagName === 'style'", 'script/style exclusion');
requireText("lower.indexOf(`</${tagName}`", 'closing-tag scanner');
requireText('readIncomingMessageBounded', 'bounded streaming source reader');
requireText('MAX_DIRECT_SOURCE_BYTES = 120_000', 'direct-source byte ceiling');
requireText('response.destroy()', 'stream cancellation at byte ceiling');
requireText('htmlToEvidenceText(response.bodyText)', 'bounded direct-source extraction wiring');
requireText('MIN_VERIFIED_QUERY_COVERAGE = 0.05', 'minimum source relevance threshold');
requireText("'DIRECT_FETCH_LOW_QUERY_RELEVANCE'", 'low-relevance source warning');
requireText('source.verification?.queryCoverage ?? 0) >= MIN_VERIFIED_QUERY_COVERAGE', 'relevance-qualified verification gate');
requireText('directFetchSourceCount: directFetchSources.length', 'retrieval-vs-verification distinction');
requireText('verificationPairs', 'discovered-source verification pairing');
requireText('verifiedByDiscoveredUrl', 'verification keyed to original discovered URL');
requireText('distinctSourcesByResolvedUrl', 'distinct resolved URL verification count');
requireText('const queryCoverage = coverageFor(plain, terms)', 'final fetched material relevance basis');
if (source.includes('coverageFor(`${source.title} ${plain}`, terms)')) fail('discovery title must never qualify final-page relevance');
if (source.includes('verified.find((item) => host(item.url) === host(source.url))')) fail('same-host verification reuse must not be reintroduced');

if (/\.replace\(\/<script\\b/.test(source) || /\.replace\(\/<style\\b/.test(source)) fail('regex-based script/style HTML filtering must not be reintroduced');
if (/\.replace\(\/&amp;\/gi/.test(source)) fail('sequential &amp; decoding can reintroduce double-unescape behavior');
if (/await\s+response\.text\s*\(\s*\)/.test(source)) fail('direct source bodies must not be fully buffered before the byte ceiling is applied');

const entityOrder = source.indexOf('decodeKnownHtmlEntitiesOnce(output)');
const whitespaceOrder = source.indexOf(".replace(/\\s+/g, ' ')", entityOrder);
if (entityOrder < 0 || whitespaceOrder < entityOrder) fail('evidence text normalization order is incomplete');

// Required web evidence is not usable unless its canonical imported-evidence event
// was persisted. Transient SOURCE_CLAIMS must never unlock substantive inference.
const requiredWebGateIndex = signalRoute.indexOf('evidenceRequirement.blockingIfUnavailable && (!webEvidence.satisfied || !webEvidence.eventId)');
assert(requiredWebGateIndex >= 0, 'WEB_REQUIRED must require both retrieval sufficiency and canonical event persistence');
assert(signalRoute.includes("'required_web_evidence_persistence_failed'"), 'missing canonical web evidence persistence must have an explicit fail-closed state');
const runtimePersistenceIndex = signalRoute.indexOf('const persisted = await persistUniversalSignal', requiredWebGateIndex);
assert(runtimePersistenceIndex > requiredWebGateIndex, 'required web evidence persistence must gate the run persistence/runtime path; intake persistence is a separate non-execution operation');

// Direct material content must survive into runtime evidence, while unverified caller extraction cannot self-promote.
assert(universalCycle.includes('function boundedMaterialContent(value: unknown, maxChars = 12_000)'), 'direct signal content needs a bounded runtime representation');
assert(universalCycle.includes('materialContent: directMaterialContent'), 'bounded direct content must reach runtime evidence');
assert(universalCycle.includes('CALLER_SUPPLIED_UNVERIFIED'), 'caller extraction must retain explicit unverified provenance');
assert(universalCycle.includes("epistemicClass: canonicalExtraction ? 'derived' : 'declared'"), 'uncanonical measurements must remain declared');
assert(universalCycle.includes("signal: canonicalExtraction ? signal : { ...signal, extracted: {} }"), 'agents must not consume caller extraction through metadata.signal as trusted material');
assert(source.includes('resolvePublicAddresses(currentUrl, sourceDeadlineAt)'), 'DNS resolution must share the source deadline');
assert(riskAgent.includes("if (value === null || value === undefined || typeof value === 'boolean') return null;"), 'null/boolean risk inputs must remain missing rather than coercing to zero');

// RETURN evidence lineage must be explicit server-derived linkage only. Generic
// lifecycle lineage contains object hashes and other methodological identifiers.
assert(closure.includes('function trustedCycleLinkedEvidenceRefs(history: History)'));
assert(!closure.includes('for (const ref of stringList(event.lineage)) refs.add(ref);'), 'generic lifecycle lineage must never confer evidence status');
assert(closure.includes('text(payload.webEvidenceEventId)'), 'web evidence must use an explicit server-derived field');
assert(closure.includes('text(payload.hydrationEventId)'), 'hydration evidence must use an explicit server-derived field');

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

const materialIdentity = {
  objectKey: 'dataset:same-name.xlsx',
  objectHash: 'material-hash-a',
  objectHashBasis: 'CLIENT_CONTENT_FINGERPRINT',
  assetRef: 'storage://same-name.xlsx',
};
assert.equal(
  structuredResultMatchesSignalIdentity({ cycleId: 'cycle-a', object: { objectKey: 'dataset:same-name.xlsx', objectHash: 'material-hash-b' } }, materialIdentity, 'cycle-a'),
  false,
  'a matching stable key must never override an explicit conflicting material fingerprint',
);
assert.equal(
  structuredResultMatchesSignalIdentity({ cycleId: 'cycle-a', object: { objectKey: 'dataset:same-name.xlsx', objectHash: 'material-hash-a' } }, materialIdentity, 'cycle-a'),
  true,
  'matching material fingerprint and stable key remain compatible',
);
assert(hydrator.includes('structuredResultMatchesSignalIdentity(payload, normalized, resumeCycleId)'));

// Same-cycle material is preferred, but unusable cycle events must not suppress a
// compatible global material observation. Fallback is evaluated only after the
// cycle-specific candidate pass fails to hydrate.
assert(hydrator.includes('const cycleHydration = await tryHydrationCandidates'));
assert(hydrator.includes('if (cycleHydration) return cycleHydration;'));
assert(hydrator.includes('const fallbackEvents = await db.from'));
assert(hydrator.includes('const fallbackHydration = await tryHydrationCandidates(fallbackCandidates)'));
assert(hydrator.indexOf('if (cycleHydration) return cycleHydration;') < hydrator.indexOf("const fallbackEvents = await db.from('epistemic_events')"));
assert(!hydrator.includes('const fallbackEvents = !resumeCycleId || !(cycleEvents?.data?.length)'), 'fallback must be suppressed by successful hydration, not merely by cycle-event presence');

// Measured zero and unmeasured are distinct. A zero information-friction measure
// must participate in the aggregate alongside a non-zero temporal measure.
const frictionContext = createKernelContext('qa-friction-cycle', 'qa-friction-logbook', 'SFI_TASK_REQUESTED');
frictionContext.evidence.push({
  id: 'qa-friction-evidence',
  source: 'QA',
  confidence: 1,
  payload: {
    epistemicClass: 'DERIVED',
    measurements: {
      rowCount: 100,
      malformedRows: 0,
      negativeIntervals: 50,
    },
  },
});
FrictionFieldSimulatorAgent(frictionContext);
const frictionOutput = frictionContext.simulations.at(-1)?.output as Record<string, unknown> | undefined;
assert(frictionOutput, 'friction simulator must emit an output');
assert.equal(frictionOutput.measuredDimensions, 2, 'zero-valued measured dimensions must remain measured');
assert.deepEqual(frictionOutput.measuredDimensionNames, ['information', 'temporal']);
assert.deepEqual(frictionOutput.unmeasuredDimensionNames, ['coordination', 'resource']);
assert.equal(frictionOutput.informationFriction, 0);
assert.equal(frictionOutput.temporalFriction, 0.5);
assert.equal(frictionOutput.totalFrictionIndex, 0.25, 'aggregate must include measured zero instead of dropping it');

console.log('SFI boundary hardening QA: OK');
