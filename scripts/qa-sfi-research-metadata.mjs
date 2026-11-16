import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => {
  throw new Error(`[SFI-RESEARCH-METADATA] ${message}`);
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const packageJson = JSON.parse(read('package.json'));
const readme = read('README.md');
const citationRaw = read('CITATION.cff');

let citation;
try {
  citation = JSON.parse(citationRaw);
} catch (error) {
  fail(`CITATION.cff is not valid JSON/YAML-subset syntax: ${error instanceof Error ? error.message : String(error)}`);
}

const VERIFIED_CITATION_AUTHORS = [
  {
    alias: 'Aptymok',
    website: 'https://github.com/Aptymok',
  },
];

const ALLOWED_CITATION_FIELDS = new Set([
  'cff-version',
  'message',
  'title',
  'type',
  'authors',
  'abstract',
  'repository-code',
  'url',
  'version',
  'keywords',
]);

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const normalizedRecord = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))));
};

const sameRecordSet = (left, right) => {
  const a = left.map(normalizedRecord);
  const b = right.map(normalizedRecord);
  if (a.some((value) => value === null) || b.some((value) => value === null)) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.length === sortedB.length && sortedA.every((value, index) => value === sortedB[index]);
};

const collectStrings = (value, target = []) => {
  if (typeof value === 'string') {
    target.push(value);
    return target;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, target));
    return target;
  }
  if (value && typeof value === 'object') Object.values(value).forEach((item) => collectStrings(item, target));
  return target;
};

const identifierKind = (value) => {
  const normalized = String(value).trim();
  if (/\b10\.\d{4,9}\/\S+/i.test(normalized)) return 'DOI';
  if (/orcid\.org\/\d{4}-\d{4}-\d{4}-[\dX]{4}/i.test(normalized) || /^\d{4}-\d{4}-\d{4}-[\dX]{4}$/i.test(normalized)) return 'ORCID';
  if (/ror\.org\/0[0-9a-hjkmnp-tv-z]{6}[0-9]{2}/i.test(normalized)) return 'ROR';
  return null;
};

const validateCitationMetadata = (candidate) => {
  assert(candidate && typeof candidate === 'object' && !Array.isArray(candidate), 'CITATION.cff must contain one metadata object');

  const unexpectedFields = Object.keys(candidate).filter((key) => !ALLOWED_CITATION_FIELDS.has(key));
  assert(
    unexpectedFields.length === 0,
    `CITATION.cff contains fields outside the verified Slice A schema: ${unexpectedFields.join(', ')}. Enrich citation metadata only in a separately reviewed change backed by verified evidence.`,
  );

  const missingFields = [...ALLOWED_CITATION_FIELDS].filter((key) => !hasOwn(candidate, key));
  assert(
    missingFields.length === 0,
    `CITATION.cff is missing fields required by the verified Slice A schema: ${missingFields.join(', ')}`,
  );

  assert(isNonEmptyString(candidate['cff-version']), 'CITATION cff-version must be a non-empty string');
  assert(candidate['cff-version'] === '1.2.0', 'CITATION.cff must use CFF 1.2.0');
  assert(isNonEmptyString(candidate.message), 'CITATION message must be a non-empty string');
  assert(isNonEmptyString(candidate.title), 'CITATION title must be a non-empty string');
  assert(candidate.title === 'System Friction Institute', 'CITATION title must match the repository/public project title');
  assert(isNonEmptyString(candidate.type), 'CITATION type must be a non-empty string');
  assert(candidate.type === 'software', 'Repository citation type must be software');
  assert(Array.isArray(candidate.authors) && candidate.authors.length > 0, 'CITATION authors must be a non-empty array');
  assert(
    sameRecordSet(candidate.authors, VERIFIED_CITATION_AUTHORS),
    'Every CITATION author and author identity field must be backed by the currently verified repository identity source without inventing family/legal-name semantics',
  );
  assert(isNonEmptyString(candidate.abstract), 'CITATION abstract must be a non-empty string');
  assert(isNonEmptyString(candidate['repository-code']), 'CITATION repository-code must be a non-empty string');
  assert(candidate['repository-code'] === 'https://github.com/Aptymok/system-friction', 'CITATION repository-code must point to the canonical repository');
  assert(isNonEmptyString(candidate.url), 'CITATION url must be a non-empty string');
  assert(candidate.url === 'https://systemfriction.org', 'CITATION url must point to the canonical institution domain');
  assert(isNonEmptyString(candidate.version), 'CITATION version must be a non-empty string');
  assert(candidate.version === packageJson.version, 'CITATION version must match package.json version');
  assert(
    Array.isArray(candidate.keywords) && candidate.keywords.length > 0 && candidate.keywords.every(isNonEmptyString),
    'CITATION keywords must be a non-empty array of non-empty strings',
  );

  const identifierStrings = collectStrings(candidate);
  assert(!identifierStrings.some((value) => identifierKind(value) === 'DOI'), 'Unverified DOI-like value emitted in CITATION.cff');
  assert(!identifierStrings.some((value) => identifierKind(value) === 'ORCID'), 'Unverified ORCID emitted in CITATION.cff');
  assert(!identifierStrings.some((value) => identifierKind(value) === 'ROR'), 'Unverified ROR emitted in CITATION.cff');
};

validateCitationMetadata(citation);
assert(readme.startsWith('# System Friction Institute'), 'README project title no longer matches CITATION title');
assert(readme.includes('## Citation and research release metadata'), 'README must expose citation/release guidance');

const expectCitationRejection = (label, mutate) => {
  const candidate = mutate(JSON.parse(JSON.stringify(citation)));
  let rejected = false;
  try {
    validateCitationMetadata(candidate);
  } catch {
    rejected = true;
  }
  assert(rejected, `CITATION validation self-test accepted ${label}`);
};

expectCitationRejection('a missing allowed Slice A field', (candidate) => {
  delete candidate.abstract;
  return candidate;
});
expectCitationRejection('a non-string cff-version', (candidate) => ({ ...candidate, 'cff-version': ['1.2.0'] }));
expectCitationRejection('a non-string message', (candidate) => ({ ...candidate, message: { text: candidate.message } }));
expectCitationRejection('a non-string title', (candidate) => ({ ...candidate, title: ['System Friction Institute'] }));
expectCitationRejection('a non-string type', (candidate) => ({ ...candidate, type: ['software'] }));
expectCitationRejection('a non-array authors field', (candidate) => ({ ...candidate, authors: 'Aptymok' }));
expectCitationRejection('a non-string abstract', (candidate) => ({ ...candidate, abstract: { text: candidate.abstract } }));
expectCitationRejection('a non-string repository-code', (candidate) => ({ ...candidate, 'repository-code': [candidate['repository-code']] }));
expectCitationRejection('a non-string url', (candidate) => ({ ...candidate, url: { canonical: candidate.url } }));
expectCitationRejection('a non-string version', (candidate) => ({ ...candidate, version: 1 }));
expectCitationRejection('a string keywords field', (candidate) => ({ ...candidate, keywords: 'system friction' }));
expectCitationRejection('a keywords array with a non-string item', (candidate) => ({ ...candidate, keywords: [...candidate.keywords, { term: 'invalid' }] }));
expectCitationRejection('an empty keyword', (candidate) => ({ ...candidate, keywords: [...candidate.keywords, '   '] }));
expectCitationRejection('an invented family-name interpretation of the observed alias', (candidate) => ({
  ...candidate,
  authors: [{ 'family-names': 'Aptymok', website: 'https://github.com/Aptymok' }],
}));
expectCitationRejection('an unobserved additional author', (candidate) => ({
  ...candidate,
  authors: [...candidate.authors, { alias: 'Fabricated Researcher' }],
}));
expectCitationRejection('an unverified author affiliation', (candidate) => ({
  ...candidate,
  authors: [{ ...candidate.authors[0], affiliation: 'Fabricated University' }],
}));
expectCitationRejection('a malformed DOI field', (candidate) => ({ ...candidate, doi: 'pending' }));
expectCitationRejection('an unverified DOI', (candidate) => ({ ...candidate, doi: '10.1234/fabricated' }));
expectCitationRejection('an unverified ORCID', (candidate) => ({
  ...candidate,
  authors: [{ ...candidate.authors[0], orcid: '0000-0000-0000-0000' }],
}));
expectCitationRejection('an unverified ROR', (candidate) => ({
  ...candidate,
  institution: 'https://ror.org/012345678',
}));
expectCitationRejection('an unobserved release date', (candidate) => ({ ...candidate, 'date-released': '2099-12-31' }));
expectCitationRejection('an unverified license declaration', (candidate) => ({ ...candidate, license: 'Totally-Fabricated' }));

assert(
  !exists('.zenodo.json'),
  '.zenodo.json is blocked while Zenodo archive readiness lacks a verified deposit/license decision, observed release receipt, and verified external scholarly identifiers. Add it only in a separately reviewed change after those prerequisites exist.',
);

// The laboratory reader must expose provenance without inventing links, evidence or DOI.
const researchReader = read('src/components/sfi/MethodLabResearchReview.tsx');
const methodLabPage = read('src/app/method-lab/page.tsx');
const researchSource = read('src/lib/method-lab/researchObjects.ts');
assert(researchReader.includes('referencedResearchId(ref, objects)'), 'research reader must resolve object links against actual registered IDs');
assert(researchReader.includes('evidenceInventory.find(item => item.id === evidenceKey)'), 'research evidence links must be checked against the bounded live inventory');
assert(researchReader.includes('no localizada en el inventario parcial'), 'missing research evidence must never be described as nonexistent or verified');
assert(researchReader.includes('DOI: NO VERIFICADO EN ESTE REGISTRO'), 'research reader must not infer a DOI from publication status');
assert(researchReader.includes('finding.evidenceRefs'), 'per-finding source identity must be inspectable');
assert(!researchReader.includes('objectProgress('), 'publication labels must not fabricate completed Reality Chain stages');

const repositoryPage = read('src/app/repository/page.tsx');
const repositoryReader = read('src/app/repository/RepositoryConsole.tsx');
assert(methodLabPage.includes('canonicalPublicationDisposition(record).disposition === \'PUBLISH\''), 'Lab may only resolve public links through the governed canonical allowlist');
assert(methodLabPage.includes('publicRepositoryObjects={publicRepositoryObjects}'), 'Lab research reader must receive the public allowlist');
assert(researchReader.includes('record.id === selected.objectId'), 'research-to-repository linking must require exact canonical object identity');
assert(researchReader.includes('Sin correspondencia pública explícita'), 'unmatched research must not invent public entries');
assert(repositoryPage.includes("canonicalPublicationDisposition(record).disposition==='PUBLISH'"), 'Repository must remain public-only');
assert(repositoryReader.includes('LABORATORIO · ACCESO INTERNO'), 'Repository should expose navigational access without public Lab data');

assert(methodLabPage.includes('evidenceInventory={evidence.options}'), 'Method Lab must use its actual governed evidence read projection');
assert(methodLabPage.includes('Iniciar una nueva investigación · opcional'), 'research browsing must not require form intake');
assert(researchSource.includes('sourceOfTruth: \'METHOD_LAB_EVENT_LEDGER\''), 'reader must use existing canonical research ledger');

// Studio document reading must reuse transient extraction and never invent MIHM measurements.
const studioMultiReader = read('src/components/studio/StudioMultiDocumentReader.tsx');
const studioPage = read('src/app/studio/page.tsx');
const transientExtractor = read('src/app/api/reality-chain/extract/route.ts');
assert(studioPage.includes('<StudioMultiDocumentReader />'), 'Studio must expose the multi-document research reader');
assert(studioMultiReader.includes("fetch('/api/reality-chain/extract'"), 'Studio reader must reuse existing authenticated extraction');
assert(studioMultiReader.includes('source.sha256'), 'document identity must be source-hash based');
assert(studioMultiReader.includes('observedValue:null'), 'text mentions must not fabricate MIHM values');
assert(studioMultiReader.includes('publicationState:\'NOT_AUTHORIZED\''), 'documental reading may not publish itself');
assert(transientExtractor.includes('rawFilePersisted:false'), 'transient document reading must not claim source persistence');
// Studio measured context must be read-only, authenticated and fail closed for missing values.
const studioContextRoute = read('src/app/api/studio/research-context/route.ts');
const measuredContextView = read('src/components/studio/StudioMeasuredContext.tsx');
assert(studioContextRoute.includes('requireSfiMember()'), 'MIHM context endpoint must check institutional membership');
assert(studioContextRoute.includes("access?.studio !== true"), 'MIHM context endpoint must check Studio module access');
assert(studioContextRoute.includes('buildDerivedMihmRuntime()') && studioContextRoute.includes('getWorldVectorToday()'), 'Studio measured context must reuse real instruments');
assert(studioContextRoute.includes('systemUsable ? finite01(system?.ihg) : null'), 'missing systemic data must not default to zero');
assert(studioContextRoute.includes("contextType: 'INDEPENDENT_INSTRUMENT_READINGS'"), 'instruments must remain independent');
assert(measuredContextView.includes("fetch('/api/studio/research-context'"), 'Studio must fetch governed live measured context');
assert(measuredContextView.includes('No se generarán sustitutos simulados'), 'a failed read must not generate mock values');
assert(studioMultiReader.includes('<StudioMeasuredContext documentCount={documents.length} />'), 'document reader must mount measured context');
// Guard the existing Studio MCP entrypoint against malformed SHA validators and duplicate module tails.
const studioMcpSource = read('src/lib/mcp/studioMcpServer.ts');
const studioMcpEnd = "return { status: 404, body: jsonRpcError(id, -32601, 'MethodNotFound', { method }) };";
assert(studioMcpSource.includes("pattern: '^[0-9a-fA-F]{64}$'"), 'Studio MCP SHA-256 validator must be syntactically complete');
assert(studioMcpSource.split(studioMcpEnd).length === 2, 'Studio MCP server must not contain duplicated source tails');

console.log('[SFI-RESEARCH-METADATA] PASS');
console.log(`citation_version=${citation.version}`);
console.log('verified_doi_count=0');
console.log('verified_orcid_count=0');
console.log('verified_ror_count=0');
console.log('zenodo_override=absent_blocked');
