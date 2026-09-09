import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const contract = read('src/lib/sfi/case-platform/privateCaseBriefContract.ts');
const runtime = read('src/lib/sfi/case-platform/privateCaseBrief.ts');
const canonicalWriter = read('src/lib/sfi/case-platform/canonicalCaseObjectWriter.ts');
const unicodeProvider = read('src/lib/sfi/case-platform/unifontType3.ts');
const route = read('src/app/api/root/private-case-brief/route.ts');
const storageMigration = read('supabase/migrations/20260909062000_create_private_case_assets_bucket.sql');
const atomicMigration = read('supabase/migrations/20260909080500_sfi_case_object_atomic_writer_v1.sql');

assert.match(contract, /SFI-PRIVATE-CASE-BRIEF-ASSET-1\.2/);
assert.match(contract, /SFI-CASE-COVER-BRIEF-1\.1/);
assert.match(contract, /do not invent actor, place, company, rupture, outcome or logo/i);
assert.match(contract, /externalImageGenerated: input\.externalImageGenerated === true/);
assert.match(contract, /publicationState: 'PRIVATE_DRAFT'/);
assert.match(contract, /%PDF-1\.4/);
assert.match(contract, /Report != evidence\. Report != decision/);
assert.match(contract, /\/Subtype \/Type3/);
assert.match(contract, /\/ToUnicode/);
assert.match(contract, /beginbfchar/);
assert.doesNotMatch(contract, /<U\+\$\{codePoint\.toString/, 'Unicode characters must not be replaced by visible code-point notation');
assert.doesNotMatch(contract, /normalize\('NFKD'\)/, 'institutional text must not be destructively transliterated');
assert.match(contract, /const detailChunks = chunks\(detailLines\(input\), 47\)/, 'detail section must paginate');
assert.match(contract, /\/Count \$\{pageStreams\.length\}/, 'PDF page tree must reflect dynamic pagination');

assert.match(unicodeProvider, /SFI_UNIFONT_VERSION = '16\.0\.04'/);
assert.match(unicodeProvider, /unifont-\$\{SFI_UNIFONT_VERSION\}\.hex\.gz/);
assert.match(unicodeProvider, /gunzipSync/);
assert.match(unicodeProvider, /SFI_PRIVATE_CASE_BRIEF_UNICODE_GLYPH_UNAVAILABLE/);
assert.match(unicodeProvider, /NON_BMP_UNSUPPORTED/, 'unsupported glyph domains must fail closed rather than corrupt text');

assert.match(runtime, /\.eq\('object_kind', 'EVIDENCE'\)/, 'case-specific cover lineage must come only from admitted EVIDENCE objects');
assert.match(runtime, /version: nullableText\(row\.version\)/);
assert.match(runtime, /hash: nullableText\(row\.hash\)/);
assert.match(runtime, /sourceEvidenceRefs: evidenceRefs/);
assert.match(runtime, /evidenceRefs,/);
assert.match(runtime, /validateSfiCaseObjectDraft\(draft\)/);
assert.match(runtime, /caseStatus === 'REJECTED'/);
assert.ok(
  runtime.indexOf("caseStatus === 'REJECTED'") < runtime.indexOf('.upload(storagePath, pdf'),
  'rejected case must fail before storage mutation',
);
assert.match(runtime, /safeVersion\(generatedAt, objectId\)/, 'version identity must include collision-safe nonce');
assert.match(runtime, /loadUnifontGlyphs\(requiredPrivateCaseBriefCodePoints\(renderInput\)\)/);
assert.ok(
  runtime.indexOf('loadUnifontGlyphs(requiredPrivateCaseBriefCodePoints(renderInput))') < runtime.indexOf('.upload(storagePath, pdf'),
  'external glyph source must resolve before durable mutation',
);
assert.match(runtime, /recordCanonicalCaseObjectAtomic\(/, 'private brief must use the canonical atomic writer');
assert.doesNotMatch(runtime, /\.from\('sfi_case_objects'\)\.insert\(/, 'private brief must not maintain a second manifest writer');
assert.doesNotMatch(runtime, /\.from\('sfi_case_audit_events'\)\.insert\(/, 'private brief audit must be inside the database transaction');
assert.match(runtime, /removeStoredAsset\(input\.service, storagePath\)/, 'failed database transaction must compensate only the uploaded storage object');
assert.match(runtime, /kind: 'REPORT'/);
assert.match(runtime, /epistemicRole: 'PROJECTION'/);
assert.match(runtime, /approvedBy: null/);
assert.match(runtime, /approvedAt: null/);
assert.match(runtime, /publicationState: 'PRIVATE_DRAFT'/);
assert.match(runtime, /generatedImageBytesClaimed: false/);
assert.doesNotMatch(runtime, /publicationState:\s*['"]PUBLIC/);
assert.doesNotMatch(runtime, /\.getPublicUrl\(/);
assert.match(runtime, /createSignedUrl\(storagePath, 300\)/);

assert.match(canonicalWriter, /sfi_record_case_object_atomic_v1/);
assert.match(canonicalWriter, /validateSfiCaseObjectDraft\(draft\)/);
assert.match(canonicalWriter, /SFI_CASE_OBJECT_CANONICAL_HASH_REQUIRED/);
assert.match(atomicMigration, /for update;/i, 'atomic writer must lock the case row');
assert.match(atomicMigration, /v_case\.status = 'REJECTED'/);
assert.match(atomicMigration, /insert into public\.sfi_case_objects/);
assert.match(atomicMigration, /update public\.sfi_cases[\s\S]*updated_at = now\(\)/);
assert.match(atomicMigration, /insert into public\.sfi_case_audit_events/);
assert.match(atomicMigration, /'atomic',true/);
assert.match(atomicMigration, /grant execute on function public\.sfi_record_case_object_atomic_v1[\s\S]*service_role/);
assert.doesNotMatch(atomicMigration, /grant execute[\s\S]*authenticated/);

assert.match(route, /requireRootActor\('root\.private_case_brief\.read_private'\)/, 'private brief reads require ROOT actor authority');
assert.doesNotMatch(route, /requireRootViewer\(/, 'private case brief must not use observer/viewer authority for service-role asset reads');
assert.match(route, /requireRootActor\('root\.private_case_brief\.generate'\)/);
assert.match(route, /autoPublication: false/);
assert.match(route, /humanApprovalRequired: true/);
assert.match(route, /fabricatedImageBytes: false/);
assert.match(route, /Cache-Control': 'private, no-store'/);

assert.match(storageMigration, /'sfi-case-assets'/);
assert.match(storageMigration, /false,/);
assert.match(storageMigration, /application\/pdf/);
assert.match(storageMigration, /no authenticated storage\.objects policy/i);
assert.doesNotMatch(storageMigration, /create policy/i, 'private asset bucket must not gain direct authenticated read policies');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-PRIVATE-CASE-BRIEF-ASSET-1.2',
  existingOwner: 'sfi_case_objects/REPORT',
  canonicalWriter: 'sfi_record_case_object_atomic_v1',
  privateStorage: 'sfi-case-assets',
  rootOnly: true,
  privateReadAuthority: 'ROOT_ACTOR_ONLY',
  pdfAssembly: 'REAL_BYTES_PAGINATED_TYPE3_UNICODE',
  unicodePolicy: 'GNU_UNIFONT_TYPE3_PLUS_TOUNICODE_FAIL_CLOSED',
  lineage: 'FULL_CANONICAL_REF',
  rejectedCaseMutation: 'FAILS_BEFORE_UPLOAD_AND_INSIDE_TRANSACTION',
  manifestAuditAtomicity: 'ONE_POSTGRES_TRANSACTION',
  caseFreshness: 'UPDATED_AT_IN_ATOMIC_WRITER',
  failedDatabaseMutation: 'STORAGE_ONLY_COMPENSATION',
  collisionSafeVersion: true,
  externalImageBytesWithoutProvider: false,
  humanApprovalRequired: true,
  autoPublication: false,
}, null, 2));
