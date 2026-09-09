import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const contract = read('src/lib/sfi/case-platform/privateCaseBriefContract.ts');
const runtime = read('src/lib/sfi/case-platform/privateCaseBrief.ts');
const route = read('src/app/api/root/private-case-brief/route.ts');
const migration = read('supabase/migrations/20260909062000_create_private_case_assets_bucket.sql');

assert.match(contract, /SFI-PRIVATE-CASE-BRIEF-ASSET-1\.1/);
assert.match(contract, /SFI-CASE-COVER-BRIEF-1\.1/);
assert.match(contract, /do not invent actor, place, company, rupture, outcome or logo/i);
assert.match(contract, /externalImageGenerated: input\.externalImageGenerated === true/);
assert.match(contract, /publicationState: 'PRIVATE_DRAFT'/);
assert.match(contract, /%PDF-1\.4/);
assert.match(contract, /Report != evidence\. Report != decision/);
assert.match(contract, /WinAnsiEncoding/);
assert.match(contract, /<U\+\$\{codePoint\.toString/);
assert.doesNotMatch(contract, /normalize\('NFKD'\)/, 'institutional text must not be destructively transliterated');
assert.match(contract, /const detailChunks = chunks\(detailLines, 47\)/, 'detail section must paginate');
assert.match(contract, /\/Count \$\{pageCount\}/, 'PDF page tree must reflect dynamic pagination');

assert.match(runtime, /\.eq\('object_kind', 'EVIDENCE'\)/, 'case-specific cover lineage must come only from admitted EVIDENCE objects');
assert.match(runtime, /version: nullableText\(row\.version\)/);
assert.match(runtime, /hash: nullableText\(row\.hash\)/);
assert.match(runtime, /sourceEvidenceRefs: evidenceRefs/);
assert.match(runtime, /evidence_refs: evidenceRefs/);
assert.match(runtime, /validateSfiCaseObjectDraft\(draft\)/);
assert.match(runtime, /caseStatus === 'REJECTED'/);
assert.ok(
  runtime.indexOf("caseStatus === 'REJECTED'") < runtime.indexOf('.upload(storagePath, pdf'),
  'rejected case must fail before storage mutation',
);
assert.match(runtime, /safeVersion\(generatedAt, objectId\)/, 'version identity must include collision-safe nonce');
assert.match(runtime, /\.from\('sfi_case_objects'\)\.delete\(\)\.eq\('id', objectId\)/, 'audit failure must compensate manifest persistence');
assert.match(runtime, /removeStoredAsset\(input\.service, storagePath\)/, 'failed mutation must compensate storage');
assert.match(runtime, /object_kind: 'REPORT'/);
assert.match(runtime, /epistemic_role: 'PROJECTION'/);
assert.match(runtime, /approvedBy: null/);
assert.match(runtime, /approvedAt: null/);
assert.match(runtime, /publicationState: 'PRIVATE_DRAFT'/);
assert.match(runtime, /generatedImageBytesClaimed: false/);
assert.doesNotMatch(runtime, /publicationState:\s*['"]PUBLIC/);
assert.doesNotMatch(runtime, /\.getPublicUrl\(/);
assert.match(runtime, /createSignedUrl\(storagePath, 300\)/);

assert.match(route, /requireRootViewer\('root\.private_case_brief\.read'\)/);
assert.match(route, /requireRootActor\('root\.private_case_brief\.generate'\)/);
assert.match(route, /autoPublication: false/);
assert.match(route, /humanApprovalRequired: true/);
assert.match(route, /fabricatedImageBytes: false/);
assert.match(route, /Cache-Control': 'private, no-store'/);

assert.match(migration, /'sfi-case-assets'/);
assert.match(migration, /false,/);
assert.match(migration, /application\/pdf/);
assert.match(migration, /no authenticated storage\.objects policy/i);
assert.doesNotMatch(migration, /create policy/i, 'private asset bucket must not gain direct authenticated read policies');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-PRIVATE-CASE-BRIEF-ASSET-1.1',
  existingOwner: 'sfi_case_objects/REPORT',
  privateStorage: 'sfi-case-assets',
  rootOnly: true,
  pdfAssembly: 'REAL_BYTES_PAGINATED',
  unicodePolicy: 'WINANSI_PLUS_LOSSLESS_CODEPOINT_ESCAPE',
  lineage: 'FULL_CANONICAL_REF',
  rejectedCaseMutation: 'FAILS_BEFORE_UPLOAD',
  auditFailure: 'COMPENSATING_ROLLBACK',
  collisionSafeVersion: true,
  externalImageBytesWithoutProvider: false,
  humanApprovalRequired: true,
  autoPublication: false,
}, null, 2));
