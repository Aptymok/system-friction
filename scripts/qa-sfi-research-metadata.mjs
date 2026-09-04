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

const spdxLicenseId = (licenseText) => {
  if (typeof licenseText !== 'string') return null;
  const match = licenseText.match(/(?:^|\n)\s*SPDX-License-Identifier:\s*([^\s]+)\s*(?:\n|$)/i);
  return match?.[1]?.trim() || null;
};

const rootLicenseText = exists('LICENSE') ? read('LICENSE') : null;
const rootLicenseId = spdxLicenseId(rootLicenseText);

const validateCitationMetadata = (candidate) => {
  assert(candidate && typeof candidate === 'object' && !Array.isArray(candidate), 'CITATION.cff must contain one metadata object');
  assert(candidate['cff-version'] === '1.2.0', 'CITATION.cff must use CFF 1.2.0');
  assert(candidate.message && typeof candidate.message === 'string', 'CITATION.cff message is required');
  assert(candidate.title === 'System Friction Institute', 'CITATION title must match the repository/public project title');
  assert(candidate.type === 'software', 'Repository citation type must be software');
  assert(candidate.version === packageJson.version, 'CITATION version must match package.json version');
  assert(candidate['repository-code'] === 'https://github.com/Aptymok/system-friction', 'CITATION repository-code must point to the canonical repository');
  assert(candidate.url === 'https://systemfriction.org', 'CITATION url must point to the canonical institution domain');
  assert(Array.isArray(candidate.authors) && candidate.authors.length > 0, 'CITATION must contain at least one observed author identity');
  assert(
    sameRecordSet(candidate.authors, VERIFIED_CITATION_AUTHORS),
    'Every CITATION author and author identity field must be backed by the currently verified repository identity source',
  );

  const identifierStrings = collectStrings(candidate);
  assert(!identifierStrings.some((value) => identifierKind(value) === 'DOI'), 'Unverified DOI-like value emitted in CITATION.cff');
  assert(!identifierStrings.some((value) => identifierKind(value) === 'ORCID'), 'Unverified ORCID emitted in CITATION.cff');
  assert(!identifierStrings.some((value) => identifierKind(value) === 'ROR'), 'Unverified ROR emitted in CITATION.cff');
  assert(!Object.hasOwn(candidate, 'date-released'), 'No GitHub release is established; CITATION must not claim a release date');

  if (!rootLicenseText) {
    assert(!Object.hasOwn(candidate, 'license'), 'CITATION must not infer a repository license while the root LICENSE file is absent');
  } else if (Object.hasOwn(candidate, 'license')) {
    assert(rootLicenseId, 'CITATION license requires an explicit SPDX-License-Identifier in the authoritative root LICENSE');
    assert(candidate.license === rootLicenseId, 'CITATION license must match the SPDX identifier declared by the authoritative root LICENSE');
  }
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

expectCitationRejection('an unobserved additional author', (candidate) => ({
  ...candidate,
  authors: [...candidate.authors, { 'family-names': 'Fabricated Researcher' }],
}));
expectCitationRejection('an unverified author affiliation', (candidate) => ({
  ...candidate,
  authors: [{ ...candidate.authors[0], affiliation: 'Fabricated University' }],
}));
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
if (!rootLicenseText) {
  expectCitationRejection('a license without an authoritative root LICENSE', (candidate) => ({ ...candidate, license: 'MIT' }));
}

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
