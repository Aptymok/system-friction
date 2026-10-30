/**
 * MIHM P4 readiness against REAL persisted P3 and P1 receipts.
 * This is intentionally NOT a prospective test. No registry read, writer,
 * mock evidence, artificial outcome, time backdating, or new clock.
 */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {evaluateMihmP4ExistingRegistry} from '../../src/lib/mihm/foundationProspectiveScoring';
const p3=JSON.parse(readFileSync(
 'docs/research/evidence/MIHM-FOUNDATION-P3-VIABILITY-RECOVERY-2026-10-30.json','utf8'));
const bytes=readFileSync('docs/research/evidence/MIHM-MANHATTAN-365D-2025-10-2026-09.json');
const archiveSha=createHash('sha256').update(bytes).digest('hex');
assert.equal(archiveSha,p3.sourceArchiveSHA256);
assert.equal(p3.institutionalReturnVerified,false);
assert.equal(p3.normativeViabilityConstraintAdmitted,false);
assert.equal(p3.originalDataAtEventTimeAvailabilityIndependentlyVerified,false);
const validation=evaluateMihmP4ExistingRegistry([],[]);
assert.equal(validation.status,'NO_PROSPECTIVE_PAIRS');
assert.equal(validation.independentScientificValidationEstablished,false);
assert.equal(validation.productionPromotionAllowed,false);
console.log(JSON.stringify({
 contract:validation.contract,
 observedExistingP3:true,
 observedProspectiveRegistryEntries:false,
 prospectiveRegistryQueried:false,
 reason:'P3 receipts lack original T0 vintages, independently adjudicated outcomes and precommitted operational viability constraints. Prospective registry has NOT been read by this offline audit.',
 sourceArchiveSHA256:archiveSha,
 P3InstitutionalReturnVerified:false,
 status:'BLOCKED_PENDING_REAL_P4_REGISTRY_PRECOMMIT_AND_FUTURE_OUTCOMES',
 scoringBehaviorTestedInUnitTests:true,
 syntheticUnitTestsCountAsEmpiricalEvidence:false,
 institutionallyValidated:false,
 MIHMHomeostasisEstablished:false,
 productionPromotionAllowed:false,
},null,2));
