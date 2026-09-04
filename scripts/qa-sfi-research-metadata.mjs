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

assert(citation['cff-version'] === '1.2.0', 'CITATION.cff must use CFF 1.2.0');
assert(citation.message && typeof citation.message === 'string', 'CITATION.cff message is required');
assert(citation.title === 'System Friction Institute', 'CITATION title must match the repository/public project title');
assert(citation.type === 'software', 'Repository citation type must be software');
assert(citation.version === packageJson.version, 'CITATION version must match package.json version');
assert(citation['repository-code'] === 'https://github.com/Aptymok/system-friction', 'CITATION repository-code must point to the canonical repository');
assert(citation.url === 'https://systemfriction.org', 'CITATION url must point to the canonical institution domain');
assert(Array.isArray(citation.authors) && citation.authors.length > 0, 'CITATION must contain at least one observed author identity');
assert(
  citation.authors.some((author) => author?.['family-names'] === 'Aptymok' && author?.website === 'https://github.com/Aptymok'),
  'CITATION must retain the observed Git author identity without inventing an academic identifier',
);
assert(readme.startsWith('# System Friction Institute'), 'README project title no longer matches CITATION title');
assert(readme.includes('## Citation and research release metadata'), 'README must expose citation/release guidance');

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

const citationIdentifierStrings = collectStrings(citation);
assert(!citationIdentifierStrings.some((value) => identifierKind(value) === 'DOI'), 'Unverified DOI-like value emitted in CITATION.cff');
assert(!citationIdentifierStrings.some((value) => identifierKind(value) === 'ORCID'), 'Unverified ORCID emitted in CITATION.cff');
assert(!citationIdentifierStrings.some((value) => identifierKind(value) === 'ROR'), 'Unverified ROR emitted in CITATION.cff');
assert(!Object.hasOwn(citation, 'date-released'), 'No GitHub release is established; CITATION must not claim a release date');

if (!exists('LICENSE')) {
  assert(!Object.hasOwn(citation, 'license'), 'CITATION must not infer a repository license while the root LICENSE file is absent');
}

const canonicalAuthorName = (author) =>
  [author?.['given-names'], author?.['family-names']]
    .filter((part) => typeof part === 'string' && part.trim())
    .join(' ')
    .trim();

const sameStringSet = (left, right) => {
  const a = [...left].sort();
  const b = [...right].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
};

const validateZenodoOverride = (zenodo, citationMetadata, rootLicenseExists) => {
  assert(zenodo && typeof zenodo === 'object' && !Array.isArray(zenodo), '.zenodo.json must contain one metadata object');
  assert(zenodo.title === citationMetadata.title, '.zenodo.json title must match CITATION.cff');
  assert(Array.isArray(zenodo.creators) && zenodo.creators.length > 0, '.zenodo.json creators are required when the file exists');
  assert(
    zenodo.creators.every((creator) => creator && typeof creator === 'object' && typeof creator.name === 'string' && creator.name.trim()),
    '.zenodo.json creators must contain explicit non-empty names',
  );

  const citationCreatorNames = citationMetadata.authors.map(canonicalAuthorName).filter(Boolean);
  const zenodoCreatorNames = zenodo.creators.map((creator) => creator.name.trim());
  assert(
    sameStringSet(zenodoCreatorNames, citationCreatorNames),
    '.zenodo.json creators must match the currently observed CITATION.cff author identities',
  );

  assert(rootLicenseExists, '.zenodo.json requires a root LICENSE before deposit metadata can override CITATION.cff');
  assert(
    typeof citationMetadata.license === 'string' && citationMetadata.license.trim(),
    '.zenodo.json requires a verified CITATION.cff license before override metadata is accepted',
  );
  assert(
    typeof zenodo.license === 'string' && zenodo.license.trim() === citationMetadata.license.trim(),
    '.zenodo.json license must match the verified CITATION.cff license',
  );

  if (Object.hasOwn(zenodo, 'version')) {
    assert(zenodo.version === citationMetadata.version, '.zenodo.json version must match CITATION.cff/package.json');
  }

  const allowedIdentifierStrings = new Set(collectStrings(citationMetadata));
  const inspectIdentifiers = (value, key = '') => {
    if (typeof value === 'string') {
      const kind = identifierKind(value);
      if (kind) {
        assert(
          allowedIdentifierStrings.has(value),
          `.zenodo.json contains ${kind} metadata that is not verified in CITATION.cff`,
        );
      }
      if (/^(doi|orcid|ror)$/i.test(key)) {
        assert(
          allowedIdentifierStrings.has(value),
          `.zenodo.json ${key} field is not backed by verified CITATION.cff metadata`,
        );
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => inspectIdentifiers(item, key));
      return;
    }
    if (value && typeof value === 'object') {
      Object.entries(value).forEach(([childKey, childValue]) => inspectIdentifiers(childValue, childKey));
    }
  };
  inspectIdentifiers(zenodo);
};

const expectZenodoRejection = (label, mutate) => {
  const syntheticCitation = { ...citation, license: 'TEST-VERIFIED-LICENSE' };
  const validOverride = {
    title: syntheticCitation.title,
    creators: syntheticCitation.authors.map((author) => ({ name: canonicalAuthorName(author) })),
    license: syntheticCitation.license,
    version: syntheticCitation.version,
  };
  const candidate = mutate(JSON.parse(JSON.stringify(validOverride)));
  let rejected = false;
  try {
    validateZenodoOverride(candidate, syntheticCitation, true);
  } catch {
    rejected = true;
  }
  assert(rejected, `Zenodo validation self-test accepted ${label}`);
};

expectZenodoRejection('conflicting title', (zenodo) => ({ ...zenodo, title: 'Conflicting external title' }));
expectZenodoRejection('unverified creator identity', (zenodo) => ({ ...zenodo, creators: [{ name: 'Unverified Researcher' }] }));
expectZenodoRejection('unverified DOI', (zenodo) => ({ ...zenodo, doi: '10.1234/fabricated' }));
expectZenodoRejection('unverified ORCID', (zenodo) => ({
  ...zenodo,
  creators: [{ ...zenodo.creators[0], orcid: '0000-0000-0000-0000' }],
}));
expectZenodoRejection('unverified ROR', (zenodo) => ({
  ...zenodo,
  related_identifiers: [{ identifier: 'https://ror.org/012345678', relation: 'isPartOf' }],
}));

if (exists('.zenodo.json')) {
  let zenodo;
  try {
    zenodo = JSON.parse(read('.zenodo.json'));
  } catch (error) {
    fail(`.zenodo.json is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  validateZenodoOverride(zenodo, citation, exists('LICENSE'));
}

console.log('[SFI-RESEARCH-METADATA] PASS');
console.log(`citation_version=${citation.version}`);
console.log('verified_doi_count=0');
console.log('verified_orcid_count=0');
console.log('verified_ror_count=0');
console.log(`zenodo_override=${exists('.zenodo.json') ? 'present' : 'absent'}`);
