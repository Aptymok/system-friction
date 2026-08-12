import assert from 'node:assert/strict';
import {
  FOUNDER_COGNITIVE_CANON,
  assessCognitiveExperienceAgainstFounderCanon,
} from '../src/lib/cognitive-twin/founderCognitiveCanon';

assert.equal(FOUNDER_COGNITIVE_CANON.patterns.length,47,'founder_patterns_count_drift');
assert.equal(FOUNDER_COGNITIVE_CANON.rules.length,10,'founder_rules_count_drift');
assert.equal(FOUNDER_COGNITIVE_CANON.constraints.length,12,'founder_constraints_count_drift');
assert.equal(FOUNDER_COGNITIVE_CANON.exceptions.length,5,'founder_exceptions_count_drift');
assert.equal(FOUNDER_COGNITIVE_CANON.contract.length,22,'founder_contract_count_drift');
const counter=FOUNDER_COGNITIVE_CANON.counterPatterns.find(item=>item.id==='FCP-001');
assert.ok(counter,'missing_over_execution_counter_pattern');
for(const ref of ['CP-021','CP-022','CC-008'])assert.ok(counter.correctionRefs.includes(ref as never),`missing_counter_pattern_correction:${ref}`);

const premature=assessCognitiveExperienceAgainstFounderCanon({memoryType:'ERROR',sourceRef:'test',evidenceRefs:['E-1'],content:{closeRelationWithoutFunctionEvidence:true}});
assert.equal(premature.blocking,true);
assert.ok(premature.constraintRefs.includes('CC-008'));
assert.ok(premature.counterPatternRefs.includes('FCP-001'));

const prematureError=assessCognitiveExperienceAgainstFounderCanon({memoryType:'ERROR',sourceRef:'test',evidenceRefs:['E-2'],content:{errorClass:'OVER_EXECUTION_RELATIONAL_CLOSURE'}});
assert.ok(prematureError.counterPatternRefs.includes('FCP-001'));

const promotion=assessCognitiveExperienceAgainstFounderCanon({memoryType:'METHOD',sourceRef:'test',evidenceRefs:['E-3'],content:{promoteToRule:true}});
assert.equal(promotion.blocking,true);
assert.ok(promotion.warnings.includes('PROMOTION_REQUIRES_RIVAL_HYPOTHESIS'));
assert.ok(promotion.warnings.includes('PROMOTION_REQUIRES_COUNTEREXAMPLES'));
assert.ok(promotion.warnings.includes('PROMOTION_REQUIRES_DECLARED_SCOPE'));

const safe=assessCognitiveExperienceAgainstFounderCanon({memoryType:'STATE',sourceRef:'test',evidenceRefs:['E-4'],content:{summary:'observed candidate state'}});
assert.equal(safe.blocking,false);

console.log(JSON.stringify({ok:true,version:FOUNDER_COGNITIVE_CANON.version,patterns:47,rules:10,constraints:12,exceptions:5,contract:22,counterPatterns:FOUNDER_COGNITIVE_CANON.counterPatterns.map(item=>item.id)},null,2));
