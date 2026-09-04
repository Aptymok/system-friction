import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(path,'utf8');
const observatory=read('src/components/sfi/ObservatoryConsole.tsx');

const occurrences=(source:string,needle:string)=>source.split(needle).length-1;

// #366 assurance gate. This does not prescribe WS-03 state architecture or copy.
// It only rejects the observed failure class: an unavailable/non-authoritative
// public read must not be rendered as an authoritative numeric zero.
assert.ok(
  /\bworldR\.ok\b/.test(observatory),
  'observatory_world_availability_must_consume_http_success_state',
);

for(const [label,pattern] of [
  ['observations',/<dd>\s*\{nodes\.length\}\s*<\/dd>/],
  ['active_sources',/<dd>\s*\{sourceIds\.length\}\s*<\/dd>/],
  ['hypotheses',/<dd>\s*\{filteredHypotheses\.length\}\s*<\/dd>/],
  ['in_return',/<dd>\s*\{openHypotheses\}\s*<\/dd>/],
] as const){
  assert.doesNotMatch(
    observatory,
    pattern,
    `public_false_zero_unguarded_counter:${label}`,
  );
}

// Preserve the bounded read-plane while WS-03 repairs availability semantics.
// The current public instrument has three authoritative endpoint domains and one
// 20-second refresh loop. #366 must not be fixed by adding duplicate polling.
assert.equal(occurrences(observatory,"fetchJson('/api/observatory/world')"),1,'observatory_world_read_must_remain_single_per_refresh');
assert.equal(occurrences(observatory,"fetchJson('/api/observatory/state')"),1,'observatory_state_read_must_remain_single_per_refresh');
assert.equal(occurrences(observatory,"fetchJson('/api/observatory/timeline')"),1,'observatory_timeline_read_must_remain_single_per_refresh');
assert.equal(occurrences(observatory,'setInterval(pull,20000)'),1,'observatory_polling_loop_must_not_multiply');

console.log(JSON.stringify({
  ok:true,
  contract:'SFI-PUBLIC-OBSERVATORY-AVAILABILITY-1.0',
  issue:'#366',
  owner:'WS-08 assurance gate; WS-03 owns implementation semantics',
  invariants:[
    'UNAVAILABLE_NEVER_RENDERS_AS_AUTHORITATIVE_ZERO',
    'HTTP_AVAILABILITY_IS_CONSUMED',
    'ONE_OBSERVATORY_WORLD_READ_PER_REFRESH',
    'ONE_OBSERVATORY_STATE_READ_PER_REFRESH',
    'ONE_OBSERVATORY_TIMELINE_READ_PER_REFRESH',
    'ONE_20S_POLLING_LOOP',
  ],
},null,2));
