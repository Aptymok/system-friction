import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
function read(file: string) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function exists(file: string) { return fs.existsSync(path.join(root, file)); }
function must(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(`SFI_CINEMATIC_QA:${message}`); }

const required = [
  'src/components/sfi/cinematic/SfiCinematicSurface.tsx',
  'src/components/sfi/cinematic/sfi-cinematic.css',
  'src/components/studio/workspace/StudioCinematicWorkspace.tsx',
  'src/components/cases/SfiCaseCinematicWorkspace.tsx',
  'src/components/cases/CaseProfileField.tsx',
  'src/app/cases/page.tsx',
  'src/app/cases/[caseId]/page.tsx',
  'src/core/observation/observationScope.ts',
  'src/core/artifacts/sfiArtifactIdentity.ts',
  'src/app/e/[artifactId]/page.tsx',
  'src/lib/studio/external/kxtxrRegistrySeed.ts',
];
for (const file of required) must(exists(file), `MISSING:${file}`);

const shell = read('src/components/studio/production/StudioProductionShell.tsx');
must(shell.includes('StudioCinematicWorkspace'), 'STUDIO_NOT_ROUTED_TO_CINEMATIC_WORKSPACE');
must(!shell.includes('StudioWorkspace state='), 'LEGACY_STUDIO_WORKSPACE_STILL_PRIMARY');

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

const caseField = read('src/components/cases/CaseProfileField.tsx');
for (const profile of ['AI_IMPLEMENTATION_DIAGNOSTIC','AI_GOVERNANCE_ASSURANCE','TENDER_ASSURANCE','CONTRACT_WARRANTY_ASSURANCE','SERVICE_OBSERVABILITY','ENTERPRISE_MEMORY','SYSTEM_OBSERVATORY','AI_ADOPTION_INTEGRATION']) must(caseField.includes(profile), `SERVICE_FIELD_MISSING:${profile}`);
must(caseField.includes('NO WINNER AUTHORITY'), 'TENDER_HUMAN_AUTHORITY_BOUNDARY_MISSING');

const surface = read('src/components/sfi/cinematic/SfiCinematicSurface.tsx');
must(!/left sidebar|pipeline persistente|sin mocks/i.test(surface), 'META_OBSERVATION_COPY_PRESENT');
for (const tone of ['OBSERVED','DERIVED','INFERRED','PROJECTED','SIMULATED','MISSING','CONTRADICTED','GOVERNED']) must(surface.includes(tone), `EPISTEMIC_TONE_MISSING:${tone}`);

const labCanon = read('docs/canon/09_METHOD_LAB_AND_SIMULATION.md');
must(labCanon.includes('Simulation output is always `SIMULATED`'), 'METHOD_LAB_SIMULATION_BOUNDARY_CHANGED');
must(labCanon.includes('may not mutate canonical state directly'), 'METHOD_LAB_CANONICAL_MUTATION_BOUNDARY_CHANGED');

console.log('SFI cinematic surfaces QA PASS');
