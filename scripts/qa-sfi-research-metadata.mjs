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

// JSON is a YAML 1.2 subset. Keeping CITATION.cff in this subset gives us a
// deterministic dependency-free parser while remaining valid CFF/YAML syntax.
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

const identifierStrings = [];
const visit = (value) => {
  if (typeof value === 'string') {
    identifierStrings.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(visit);
    return;
  }
  if (value && typeof value === 'object') Object.values(value).forEach(visit);
};
visit(citation);

assert(!identifierStrings.some((value) => /\b10\.\d{4,9}\//i.test(value)), 'Unverified DOI-like value emitted in CITATION.cff');
assert(!identifierStrings.some((value) => /orcid\.org\//i.test(value)), 'Unverified ORCID emitted in CITATION.cff');
assert(!identifierStrings.some((value) => /ror\.org\//i.test(value)), 'Unverified ROR emitted in CITATION.cff');
assert(!Object.hasOwn(citation, 'date-released'), 'No GitHub release is established; CITATION must not claim a release date');

if (!exists('LICENSE')) {
  assert(!Object.hasOwn(citation, 'license'), 'CITATION must not infer a repository license while the root LICENSE file is absent');
}

if (exists('.zenodo.json')) {
  let zenodo;
  try {
    zenodo = JSON.parse(read('.zenodo.json'));
  } catch (error) {
    fail(`.zenodo.json is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  assert(Array.isArray(zenodo.creators) && zenodo.creators.length > 0, '.zenodo.json creators are required when the file exists');
  assert(typeof zenodo.license === 'string' && zenodo.license.trim(), '.zenodo.json must not override CITATION.cff without an explicit deposit license');
}

console.log('[SFI-RESEARCH-METADATA] PASS');
console.log(`citation_version=${citation.version}`);
console.log('verified_doi_count=0');
console.log('verified_orcid_count=0');
console.log('verified_ror_count=0');
console.log(`zenodo_override=${exists('.zenodo.json') ? 'present' : 'absent'}`);
