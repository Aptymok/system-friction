#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const heartbeat = fs.readFileSync('src/app/api/cron/continuity-heartbeat/route.ts', 'utf8');
const world = fs.readFileSync('src/app/api/observatory/world/route.ts', 'utf8');
const timeline = fs.readFileSync('src/lib/observatory/public/worldSnapshotTimeline.ts', 'utf8');
const snapshotStore = fs.readFileSync('src/lib/worldspect/snapshotStore.ts', 'utf8');
const worldWorkflow = fs.readFileSync('.github/workflows/worldspect-cron.yml', 'utf8');

assert.match(heartbeat, /result\.dataPlane === 'NEON'/, 'Neon heartbeat must branch explicitly before effectful continuation lanes');
assert.match(heartbeat, /DEFERRED_PRIMARY_WRITE_REQUIRED/, 'Neon heartbeat must expose deferred effectful lanes instead of reporting false failures');
assert.match(heartbeat, /CORE_ONLY_NEON/, 'Neon heartbeat must state the bounded continuity scope');
assert.match(heartbeat, /pendingWorkPreserved:\s*true/, 'Neon heartbeat must preserve pending work instead of fabricating completion');

assert.match(world, /readContinuityPublicWorldBundle/, 'public world read must have a Neon continuity fallback');
assert.match(world, /readPlane/, 'public world response must expose which read plane served the data');
assert.match(world, /readDataPlaneState/, 'public world read must consult systemic data-plane state for truthful plane attribution');
assert.match(world, /mode !== 'PRIMARY'/, 'public world read must report Neon when systemic routing is in continuity or recovery');
assert.match(timeline, /getWorldSpectPublicHistoryRead/, 'public timeline must use the shared WorldSpect read-plane owner');
assert.match(snapshotStore, /readContinuityWorldSnapshotTimeline/, 'shared WorldSpect public-history owner must preserve the Neon continuity fallback');
assert.match(snapshotStore, /readPlane: 'NEON'/, 'shared WorldSpect public-history owner must expose the Neon read plane');
assert.match(timeline, /readPlane/, 'public timeline response must expose which read plane served the data');
assert.match(worldWorkflow, /SFI_WORLD_READJUDICATION_CONSUMPTION_VERIFIED/, 'historical readjudication workflow must verify the public consumer sees every targeted outcome');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-NEON-READPLANE-DEFERRED-LANES-QA-1.0',
  publicReadFallback: true,
  effectfulLanesFailClosed: true,
  canonicalAuthorityExpanded: false,
}));
