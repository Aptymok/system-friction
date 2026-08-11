import assert from 'node:assert/strict';
import { SFI_DEVELOPMENT_REGISTRY, summarizeSfiDevelopmentRegistry } from '../src/lib/institutional/developmentRegistry';

const ids = new Set<string>();
for (const item of SFI_DEVELOPMENT_REGISTRY) {
  assert.ok(item.id.trim(), 'empty_development_id');
  assert.ok(!ids.has(item.id), `duplicate_development_id:${item.id}`);
  ids.add(item.id);
  assert.ok(item.name.trim(), `missing_name:${item.id}`);
  assert.ok(item.purpose.trim(), `missing_purpose:${item.id}`);
  assert.ok(item.method.trim(), `missing_method:${item.id}`);
  assert.ok(item.implementation.trim(), `missing_implementation:${item.id}`);
  assert.ok(Number.isFinite(item.maturityEstimate) && item.maturityEstimate >= 0 && item.maturityEstimate <= 100, `invalid_maturity_estimate:${item.id}`);
  assert.ok(item.product.trim(), `missing_product:${item.id}`);
  assert.ok(item.nextGate.trim(), `missing_next_gate:${item.id}`);
  if (item.classification === 'ARCHIVED') assert.equal(item.state, 'DEPRECATED', `archived_not_deprecated:${item.id}`);
  if (item.classification === 'ABSORBED') assert.ok(item.absorbedInto?.length, `absorbed_without_target:${item.id}`);
}

for (const required of ['longitudinal-system-friction-framework','mihm','mop-h','worldspect','observatory','studio','field','method-lab','cognitive-twin','ct-a01-lineage','root-acp','agent-assurance','mop-s','digital-ecosystem-observatory','directed-autonomous-growth','protocol-registry']) {
  assert.ok(ids.has(required), `missing_required_development_entry:${required}`);
}

const root = SFI_DEVELOPMENT_REGISTRY.find(item => item.id === 'root-acp');
assert.equal(root?.classification, 'INFRASTRUCTURE');
assert.ok((root?.maturityEstimate ?? 0) >= 90);

const externalResonance = SFI_DEVELOPMENT_REGISTRY.find(item => item.id === 'external-resonance-engine');
assert.equal(externalResonance?.classification, 'ARCHIVED');
assert.equal(externalResonance?.state, 'DEPRECATED');

const rPolicies = SFI_DEVELOPMENT_REGISTRY.find(item => item.id === 'r16-r18');
assert.equal(rPolicies?.classification, 'ABSORBED');
assert.ok(rPolicies?.absorbedInto?.includes('root-acp'));

const crl = SFI_DEVELOPMENT_REGISTRY.find(item => item.id === 'crl');
assert.equal(crl?.state, 'GATED');
assert.match(crl?.nextGate ?? '', /ROOT\/ACP/i);

const ct = SFI_DEVELOPMENT_REGISTRY.find(item => item.id === 'ct-a01-lineage');
assert.equal(ct?.state, 'EXPERIMENTAL');
assert.match(ct?.implementation ?? '', /individuation remains unproven/i);

const summary = summarizeSfiDevelopmentRegistry();
assert.equal(summary.total, SFI_DEVELOPMENT_REGISTRY.length);
assert.ok((summary.byClass.PRODUCT ?? 0) > 0);
assert.ok((summary.byClass.LAB_ONLY ?? 0) > 0);
assert.ok((summary.byClass.ABSORBED ?? 0) > 0);

console.log(JSON.stringify({ ok: true, ...summary }, null, 2));
