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
    'family-names': 'Aptymok',
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
    'Every CITATION author and author identity field must be backed by the currently verified repository identity source',
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
expectCitationRejection('an unobserved additional author', (candidate) => ({
  ...candidate,
  authors: [...candidate.authors, { 'family-names': 'Fabricated Researcher' }],
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

console.log('[SFI-RESEARCH-METADATA] PASS');
console.log(`citation_version=${citation.version}`);
console.log('verified_doi_count=0');
console.log('verified_orcid_count=0');
console.log('verified_ror_count=0');
console.log('zenodo_override=absent_blocked');
