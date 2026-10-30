/**
 * Offline P2 documentary lagged-dynamics replay. Does NOT fetch sources.
 * Run: node --import tsx scripts/research/mihm-foundation-p2-lagged-dynamics.ts
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assessMihmFoundationLaggedDynamics} from '../../src/lib/mihm/foundationLaggedDynamics';
import type {MihmManhattanP1Archive} from '../../src/lib/mihm/foundationSourceMetrology';

const file='docs/research/evidence/MIHM-MANHATTAN-365D-2025-10-2026-09.json';
const raw=readFileSync(file);
const archiveSHA256=createHash('sha256').update(raw).digest('hex');
assert.equal(archiveSHA256,'41e384e3199ca8d6878b39cdca51425b82e01a4d5fec6121d6494d53c5ceacc5');
const archive=JSON.parse(raw.toString('utf8')) as MihmManhattanP1Archive;
assert.equal(archive.dataAsOfOriginalDates,'NOT_VERIFIED');
const result=assessMihmFoundationLaggedDynamics(archive);
assert.equal(result.status,'RETROSPECTIVE_DIAGNOSTIC__VINTAGE_BLOCKED',result.reasons.join(';'));
assert.equal(result.pairs.length,4);
assert.equal(result.canonicalPhiCalculated,false);
assert.equal(result.homeostasisEstablished,false);
assert.equal(result.productionPromotionAllowed,false);
assert.equal(result.independentProspectiveValidation,false);
const summary={
  contract:result.contract,status:result.status,sourceArchiveSHA256:archiveSHA256,
  chronology:result.chronology,fixedMethod:result.fixedMethod,
  reasons:result.reasons,
  targets:result.pairs.map(p=>({
    target:p.target,driver:p.driver,declaredRelation:p.declaredRelation,
    targetUnit:p.targetUnit,driverUnit:p.driverUnit,
    samples:p.samples,
    validation:Object.fromEntries(Object.entries(p.models).map(([k,v])=>[k,v.validation])),
    historicalAuditAlreadyInspected:Object.fromEntries(Object.entries(p.models).map(([k,v])=>[k,v.historicalAudit])),
    validationGain:p.validationGain,historicalAuditGain:p.historicalAuditGain,
    causalPropagationEstablished:p.causalPropagationEstablished,
    realWorldForecastEligible:p.realWorldForecastEligible,
  })),
  canonicalPhiCalculated:result.canonicalPhiCalculated,
  homeostasisEstablished:result.homeostasisEstablished,
  independentProspectiveValidation:result.independentProspectiveValidation,
  productionPromotionAllowed:result.productionPromotionAllowed,
};
// The research receipt is a reproducible derived record, not a real-world return.
const receipt=JSON.parse(readFileSync(
  'docs/research/evidence/MIHM-FOUNDATION-P2-LAGGED-DYNAMICS-2026-10-30.json','utf8',
));
assert.equal(receipt.schema,'SFI-MIHM-FOUNDATION-P2-RETROSPECTIVE-REPLAY-0.1');
assert.equal(receipt.classification,'DERIVED_POSTHOC_REAL_SOURCE_ARCHIVE__NOT_INDEPENDENT_PROSPECTIVE');
assert.equal(receipt.sourceArchiveSHA256,archiveSHA256);
assert.equal(receipt.sourceOriginalAsOfVintage,'NOT_VERIFIED');
assert.equal(receipt.originalResponseBytesIndependentlyReverified,false);
assert.equal(receipt.originalDataAtHistoricT0IndependentlyVerified,false);
assert.equal(receipt.experimentalModelNotEquivalentToCanonicalMIHM,true);
assert.equal(receipt.productionPromotionAllowed,false);
assert.deepEqual(summary,receipt.summary,'P2 experimental receipt drift; fail closed on source or code change');
console.log(JSON.stringify({ok:true,receiptVerified:true,summary},null,2));
