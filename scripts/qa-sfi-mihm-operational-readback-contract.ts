// Source-contract QA. No mocks, synthetic observations, database writes or network.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const controller = read('src/lib/continuity/operationalAutoAdvance.ts');
const model = read('src/lib/mihm/operationalShadowRead.ts');
const route = read('src/app/api/sfi/mihm-audit/route.ts');
const page = read('src/app/method-lab/page.tsx');

assert.match(controller, /persistShadow: true|input\.persistShadow/);
assert.match(controller, /appendEpistemicEvent\(/);
assert.match(controller, /EVENT_READBACK_PAYLOAD_MISMATCH/);
assert.match(controller, /NO_PROCESSING_WINDOW/);
assert.match(controller, /\.eq\('event_id', eventId\)/);
assert.match(controller, /recordedBeforeDecision: false/);
assert.match(model, /\.from\('epistemic_events'\)/);
assert.match(model, /\.eq\('logbook_id', LOGBOOK\)/);
assert.match(model, /\.eq\('event_name', EVENT_NAME\)/);
assert.match(model, /\.order\('sequence', \{ ascending: false \}\)/);
assert.match(model, /NO_OBSERVATIONS/);
assert.match(model, /SOURCE_UNAVAILABLE/);
assert.match(model, /readMihmRegistryInventory/);
assert.match(model, /field_mihm_readings/);
assert.match(model, /mihm_state_registry/);
assert.match(model, /sfi_prediction_entries/);
assert.match(model, /sfi_prediction_verifications/);
assert.match(model, /count: 'exact'/);
assert.match(model, /'UNKNOWN'/);
assert.match(route, /requireRootActor\('mihm\.audit\.read'\)/);
assert.match(route, /readMihmOperationalShadow\(/);
assert.doesNotMatch(route, /export async function POST|appendEpistemicEvent|runOperationalAutoAdvance/);
assert.match(page, /readMihmOperationalShadow\(/);
assert.match(page, /observer\.isRoot/);
assert.match(page, /No existen observaciones/);
assert.doesNotMatch(model, /\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(/);
console.log('PASS MIHM operational audit: canonical bounded read, ROOT gate, no mutation, no fabricated records');
