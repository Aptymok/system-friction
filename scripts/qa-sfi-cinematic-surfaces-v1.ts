import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
function read(file: string) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function exists(file: string) { return fs.existsSync(path.join(root, file)); }
function must(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(`SFI_CINEMATIC_QA:${message}`); }

const required = [
  'src/components/sfi/cinematic/SfiCinematicSurface.tsx',
  'src/components/sfi/cinematic/InstitutionalCinematicView.tsx',
  'src/components/sfi/cinematic/sfi-cinematic.css',
  'src/components/studio/workspace/StudioCinematicWorkspace.tsx',
  'src/components/cases/SfiCaseCinematicWorkspace.tsx',
  'src/components/cases/CaseProfileField.tsx',
  'src/components/entity/EntityCinematicWorkspace.tsx',
  'src/app/studio/page.tsx',
  'src/app/cases/page.tsx',
  'src/app/cases/[caseId]/page.tsx',
  'src/app/field/page.tsx',
  'src/app/observatory/page.tsx',
  'src/app/atlas/page.tsx',
  'src/app/entity/[id]/page.tsx',
  'src/app/ledger/page.tsx',
  'src/app/mihm/page.tsx',
  'src/app/friction/page.tsx',
  'src/app/sfi/page.tsx',
  'src/app/world-vector/page.tsx',
  'src/app/moph/page.tsx',
  'src/app/library/page.tsx',
  'src/app/member/page.tsx',
  'src/app/pipeline/page.tsx',
  'src/app/method-lab/page.tsx',
  'src/app/root/page.tsx',
  'src/core/observation/observationScope.ts',
  'src/core/artifacts/sfiArtifactIdentity.ts',
  'src/app/e/[artifactId]/page.tsx',
  'src/lib/studio/external/kxtxrRegistrySeed.ts',
  'docs/architecture/sfi/ADR-SFI-UX-SURFACES-002.md',
];
for (const file of required) must(exists(file), `MISSING:${file}`);

const surface = read('src/components/sfi/cinematic/SfiCinematicSurface.tsx');
must(!/left sidebar|pipeline persistente|sin mocks/i.test(surface), 'META_OBSERVATION_COPY_PRESENT');
for (const tone of ['OBSERVED','DERIVED','INFERRED','PROJECTED','SIMULATED','MISSING','CONTRADICTED','GOVERNED']) must(surface.includes(tone), `EPISTEMIC_TONE_MISSING:${tone}`);

const institutional = read('src/components/sfi/cinematic/InstitutionalCinematicView.tsx');
must(institutional.includes("focus: InstitutionalCinematicFocus"), 'INSTITUTIONAL_CINEMATIC_FOCUS_MISSING');
must(institutional.includes("value: 'NO_VALUE'"), 'INSTITUTIONAL_MISSING_VALUE_NOT_EXPLICIT');
must(institutional.includes('GOVERNANCE ≠ TRUTH'), 'INSTITUTIONAL_TRUTH_BOUNDARY_MISSING');

const shell = read('src/components/studio/production/StudioProductionShell.tsx');
must(shell.includes('StudioCinematicWorkspace'), 'STUDIO_NOT_ROUTED_TO_CINEMATIC_WORKSPACE');
must(!shell.includes('StudioWorkspace state='), 'LEGACY_STUDIO_WORKSPACE_STILL_PRIMARY');

const studioCinematic = read('src/components/studio/workspace/StudioCinematicWorkspace.tsx');
must(studioCinematic.includes('SfiCinematicSurface'), 'STUDIO_NOT_IN_SHARED_CINEMATIC_GRAMMAR');
must(studioCinematic.includes('StudioDirectIngestion'), 'STUDIO_REAL_INGESTION_MISSING');
must(studioCinematic.includes('NO_VALUE') || studioCinematic.includes('MISSING'), 'STUDIO_FAIL_CLOSED_COPY_MISSING');

const friction = read('src/components/studio/workspace/StudioFrictionField.tsx');
must(!friction.includes('index % Math.max'), 'ARBITRARY_FRICTION_INDEX_MAPPING');
must(friction.includes('NO GROUNDED FRICTION METRIC'), 'FRICTION_DOES_NOT_FAIL_CLOSED');

const trajectory = read('src/components/studio/workspace/StudioTrajectoryField.tsx');
must(!trajectory.includes('tempo_global_bpm'), 'AUDIO_TEMPO_USED_AS_SYSTEMIC_TRAJECTORY');
must(trajectory.includes('Systemic velocity</dt><dd>NO_VALUE'), 'TRAJECTORY_MISSING_STATE_NOT_EXPLICIT');

const mihm = read('src/components/studio/workspace/StudioMihmField.tsx');
must(!mihm.includes('stereo_width'), 'STEREO_WIDTH_ALIAS_USED_AS_MIHM_VARIABLE');
must(mihm.includes('no value, not zero'), 'MIHM_MISSING_VALUE_NOT_EXPLICIT');

const artifact = read('src/lib/sfi/artifacts/artifactRegistry.ts');
must(artifact.includes('artifactIdentityIsPubliclyVerifiable'), 'PUBLIC_CERTIFICATE_DOES_NOT_FAIL_CLOSED');
must(artifact.includes("visibility === 'PUBLIC'") || read('src/core/artifacts/sfiArtifactIdentity.ts').includes("visibility === 'PUBLIC'"), 'PUBLIC_ARTIFACT_VISIBILITY_GATE_MISSING');

const mopsPage = read('src/app/e/[artifactId]/page.tsx');
must(mopsPage.includes('readPublicMopsCertificate'), 'MOPS_PAGE_NOT_BOUND_TO_REGISTRY');
must(!mopsPage.includes('CERTIFIED = true'), 'MOPS_PAGE_HARDCODED_CERTIFICATION');

const seed = read('src/lib/studio/external/kxtxrRegistrySeed.ts');
for (const value of ['https://kxtxr.vercel.app/','https://github.com/Aptymok/kxtxr','https://www.instagram.com/_kxtxr/','https://tiktok.com/@_kxtxr','https://linktr.ee/kxtxr','JTepOraQwGY']) must(seed.includes(value), `KXTXR_SEED_MISSING:${value}`);
must(seed.includes('PENDING_OBJECT_MATCH'), 'KXTXR_YOUTUBE_OBJECT_RELATION_NOT_FAIL_CLOSED');

const casePage = read('src/app/cases/[caseId]/page.tsx');
must(casePage.includes('requireAuthenticatedUser'), 'CASE_WORKSPACE_NOT_AUTHENTICATED');
const caseIndex = read('src/app/cases/page.tsx');
must(caseIndex.includes('listOperationalCases'), 'CASE_INDEX_NOT_BOUND_TO_OPERATIONAL_CASES');

const caseField = read('src/components/cases/CaseProfileField.tsx');
for (const profile of ['AI_IMPLEMENTATION_DIAGNOSTIC','AI_GOVERNANCE_ASSURANCE','TENDER_ASSURANCE','CONTRACT_WARRANTY_ASSURANCE','SERVICE_OBSERVABILITY','ENTERPRISE_MEMORY','SYSTEM_OBSERVATORY','AI_ADOPTION_INTEGRATION']) must(caseField.includes(profile), `SERVICE_FIELD_MISSING:${profile}`);
must(caseField.includes('NO WINNER AUTHORITY'), 'TENDER_HUMAN_AUTHORITY_BOUNDARY_MISSING');

const atlas = read('src/app/atlas/page.tsx');
must(atlas.includes('readInstitutionalViewState'), 'ATLAS_NOT_BOUND_TO_INSTITUTIONAL_READ_MODEL');
must(atlas.includes('SfiCinematicSurface'), 'ATLAS_NOT_IN_CINEMATIC_GRAMMAR');
must(atlas.includes("value: 'NO_VALUE'"), 'ATLAS_MOPH_MISSING_VALUE_NOT_EXPLICIT');
must(atlas.includes('GRAPH PRESENCE ≠ CAUSALITY'), 'ATLAS_CAUSALITY_BOUNDARY_MISSING');

const entityPage = read('src/app/entity/[id]/page.tsx');
must(entityPage.includes('readEntityContextView'), 'ENTITY_NOT_BOUND_TO_CONTEXT_READ_MODEL');
must(entityPage.includes('EntityCinematicWorkspace'), 'ENTITY_NOT_IN_CINEMATIC_GRAMMAR');
const entitySurface = read('src/components/entity/EntityCinematicWorkspace.tsx');
must(entitySurface.includes('RELATION ≠ CAUSALITY'), 'ENTITY_CAUSALITY_BOUNDARY_MISSING');
must(entitySurface.includes("value: 'NO_VALUE'"), 'ENTITY_MISSING_MIHM_FRICTION_NOT_EXPLICIT');
must(entitySurface.includes('EntityCinematicFailure'), 'ENTITY_FAIL_CLOSED_VIEW_MISSING');
must(entitySurface.includes('CONTEXT_UNAVAILABLE'), 'ENTITY_SUCCESS_WITHOUT_CONTEXT_NOT_FAIL_CLOSED');

for (const [file, focus] of [
  ['src/app/ledger/page.tsx','LEDGER'],
  ['src/app/mihm/page.tsx','MIHM'],
  ['src/app/friction/page.tsx','FRICTION'],
  ['src/app/sfi/page.tsx','SFI'],
] as const) {
  const body = read(file);
  must(body.includes('InstitutionalCinematicView'), `INSTITUTIONAL_PAGE_NOT_CINEMATIC:${file}`);
  must(body.includes('readInstitutionalViewState'), `INSTITUTIONAL_PAGE_NOT_REAL:${file}`);
  must(body.includes(`focus="${focus}"`), `INSTITUTIONAL_PAGE_WRONG_FOCUS:${file}`);
}

const worldVector = read('src/app/world-vector/page.tsx');
must(worldVector.includes('getWorldVectorToday'), 'WORLD_VECTOR_TODAY_READ_MODEL_MISSING');
must(worldVector.includes('getWorldVectorStatus'), 'WORLD_VECTOR_STATUS_READ_MODEL_MISSING');
must(worldVector.includes('SfiCinematicSurface'), 'WORLD_VECTOR_NOT_CINEMATIC');
must(!worldVector.includes('calculateW10'), 'WORLD_VECTOR_SYNTHETIC_W10_STILL_PRESENT');
must(!worldVector.includes('[0.7, 0.8, 0.9]'), 'WORLD_VECTOR_DEMO_CONSTANTS_STILL_PRESENT');
must(worldVector.includes("value: 'NO_VALUE'"), 'WORLD_VECTOR_W10_NOT_FAIL_CLOSED');
must(worldVector.includes('Domain dispersion is not automatically labeled as systemic friction.'), 'WORLD_VECTOR_FRICTION_BOUNDARY_MISSING');

const moph = read('src/app/moph/page.tsx');
must(moph.includes('SfiCinematicSurface'), 'MOPH_NOT_CINEMATIC');
must(!moph.includes('calculatePsiMoph'), 'MOPH_DEMO_FORMULA_STILL_PRESENT');
must(moph.includes("value: 'NO_VALUE'"), 'MOPH_SESSION_VALUE_NOT_FAIL_CLOSED');
must(moph.includes('session/object scoped'), 'MOPH_SCOPE_BOUNDARY_MISSING');

const library = read('src/app/library/page.tsx');
must(library.includes('getSfiLibraryManifest'), 'LIBRARY_NOT_BOUND_TO_MANIFEST');
must(library.includes('getSfiLibraryDocuments'), 'LIBRARY_NOT_BOUND_TO_DOCUMENT_INDEX');
must(library.includes('DOCUMENT ≠ EXECUTION AUTHORITY'), 'LIBRARY_AUTHORITY_BOUNDARY_MISSING');

const member = read('src/app/member/page.tsx');
must(member.includes('requireSfiMemberPage'), 'MEMBER_NOT_BOUND_TO_MEMBERSHIP_READ_MODEL');
must(member.includes('workspace.caseCount') && member.includes('workspace.objectCount') && member.includes('workspace.pendingReturnCount'), 'MEMBER_REAL_WORKSPACE_COUNTS_MISSING');
must(member.includes('VISIBILITY ≠ AUTHORITY'), 'MEMBER_AUTHORITY_BOUNDARY_MISSING');

const pipeline = read('src/app/pipeline/page.tsx');
must(pipeline.includes('requireRootObserverPage'), 'PIPELINE_ROOT_OBSERVER_BOUNDARY_MISSING');
must(pipeline.includes('RootOperatingField'), 'PIPELINE_REAL_OPERATING_FIELD_MISSING');
must(pipeline.includes('RootCycleAnalysisDockAuto'), 'PIPELINE_REAL_CYCLE_ANALYSIS_MISSING');
must(pipeline.includes('ANALYSIS ≠ APPROVAL'), 'PIPELINE_APPROVAL_BOUNDARY_MISSING');

const field = read('src/app/field/page.tsx');
must(field.includes('readPublicObservatoryState'), 'FIELD_WORLD_CONTEXT_NOT_REAL');
must(field.includes('FieldOperationalConsole'), 'FIELD_OPERATIONAL_CONSOLE_MISSING');
const fieldConsole = read('src/components/field/FieldOperationalConsole.tsx');
must(fieldConsole.includes("fetch('/api/field/cases'"), 'FIELD_CASES_NOT_PERSISTED');
must(fieldConsole.includes('Sin lectura MIHM persistida.'), 'FIELD_MISSING_MIHM_NOT_FAIL_CLOSED');

const observatory = read('src/app/observatory/page.tsx');
must(observatory.includes('readGovernedPublicObservatoryState'), 'PUBLIC_OBSERVATORY_NOT_GOVERNED');
const observatorySurface = read('src/components/observatory/public/PublicObservatoryUnified.tsx');
must(observatorySurface.includes('SIN EVIDENCIA PUBLICABLE EN ESTE CORTE.'), 'PUBLIC_OBSERVATORY_MISSING_EVIDENCE_NOT_EXPLICIT');
must(observatorySurface.includes('PROVENANCE'), 'PUBLIC_OBSERVATORY_PROVENANCE_MISSING');

const methodLab = read('src/app/method-lab/page.tsx');
must(methodLab.includes('MethodLabCinematicFrame'), 'METHOD_LAB_NOT_IN_CINEMATIC_FRAME');
must(methodLab.includes('readMethodLabState'), 'METHOD_LAB_NOT_BOUND_TO_REAL_STATE');

const rootPage = read('src/app/root/page.tsx');
must(rootPage.includes('readRootSovereignState'), 'ROOT_NOT_BOUND_TO_SOVEREIGN_STATE');
must(rootPage.includes('RootSovereignConsole'), 'ROOT_SOVEREIGN_CONSOLE_MISSING');
const rootLayout = read('src/app/root/layout.tsx');
must(rootLayout.includes('CognitiveSpineStatusBar'), 'ROOT_COGNITIVE_SPINE_STATUS_NOT_PERSISTENT');
must(rootLayout.includes("allowedRoles={['root']}"), 'ROOT_PRIVATE_BOUNDARY_MISSING');

const labCanon = read('docs/canon/09_METHOD_LAB_AND_SIMULATION.md');
must(labCanon.includes('Simulation output is always `SIMULATED`'), 'METHOD_LAB_SIMULATION_BOUNDARY_CHANGED');
must(labCanon.includes('may not mutate canonical state directly'), 'METHOD_LAB_CANONICAL_MUTATION_BOUNDARY_CHANGED');

const uxAdr = read('docs/architecture/sfi/ADR-SFI-UX-SURFACES-002.md');
must(uxAdr.includes('**Status:** ACCEPTED / IMPLEMENTED'), 'CINEMATIC_SURFACE_ADR_NOT_ACCEPTED');
must(uxAdr.includes('The previously designed cinematic views are not disposable mockups.'), 'DESIGNED_VIEWS_NOT_DECLARED_CANONICAL');
must(uxAdr.includes('VISUAL COMPLETENESS = DATA     FORBIDDEN'), 'VISUAL_COMPLETENESS_DATA_BOUNDARY_MISSING');

console.log(JSON.stringify({
  ok: true,
  gate: 'SFI_CINEMATIC_HUMAN_SURFACES_V1',
  surfaces: [
    'STUDIO','CASE_PLATFORM','FIELD','PUBLIC_OBSERVATORY','ATLAS','ENTITY','LEDGER','MIHM','FRICTION','SFI',
    'WORLD_VECTOR','MOP_H','LIBRARY','MEMBER','PIPELINE','METHOD_LAB','ROOT','PUBLIC_MOPS',
  ],
  canonicalDesignedViews: true,
  noInventedMissingValues: true,
  noDemoMetricsInCanonicalStateViews: true,
  commercialTruthAuthority: false,
  simulationEqualsObservation: false,
  publicCertificateFailClosed: true,
}, null, 2));
