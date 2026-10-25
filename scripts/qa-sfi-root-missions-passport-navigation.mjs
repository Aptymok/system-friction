#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const field=readFileSync('src/components/sfi/RootNeuralGraphView.tsx','utf8');
const workspace=readFileSync('src/components/sfi/SfiRootWorkspace.tsx','utf8');
const css=readFileSync('src/components/sfi/RootNeuralGraphView.css','utf8');

assert.match(field, /data-root-visual="SFI-ROOT-PANORAMIC-FIELD-2\.0"/);
assert.match(field, /ref=\{shellRef\}/);
assert.match(field, /const viewport=shellRef\.current/);
assert.match(field, /viewport\.scrollBy\(\{left:delta,behavior:'smooth'\}\)/);
assert.doesNotMatch(field, /onWheel=\{event=>\{if\(Math\.abs\(event\.deltaY\)>Math\.abs\(event\.deltaX\)\)/);

assert.match(field, /className="rootOpenMissions" onClick=\{openMissions\}/);
assert.match(field, /className="rootPassportMissions"/);
assert.match(field, /missionsRef\.current\.open=true/);
assert.match(field, /missionsOpen&&<SfiRootWorkspace enabled missionOnly\/>/);
assert.match(field, /<SfiRootWorkspace enabled decisionOnly\/>/);
assert.ok(field.indexOf('className="rootPassportMissions"') < field.indexOf('className="rootGovernanceSingleReading"'),
  'Agent controls must appear above long Passport reading, not beneath graph relations.');

assert.match(workspace, /missionOnly = false/);
assert.match(workspace, /if \(missionOnly\) return <section/);
assert.match(workspace, /data-root-missions-panel="SFI-ROOT-ACTUAL-FIELD-MISSION-CONSOLE-1\.0"/);
assert.match(workspace, /const missionSurface =/);
assert.match(workspace, /\{missionSurface\}/);
assert.match(workspace, /data-c07-authorized-canary-control=/);
assert.match(workspace, /!missionQueueEnabled\|\|missionBusy/);
assert.match(workspace, /readOwnedC07MissionSummary|\/api\/root\/cognitive-runtime/);
assert.match(css, /rootGovernanceConsole\{[\s\S]*?overscroll-behavior:contain!important/);
assert.match(css, /rootPassportMissions>summary/);
assert.match(css, /rootFieldQuickAccess/);
assert.match(css, /\.rootMissionEmbedded button:disabled/);
console.log('PASS ROOT cockpit: C07 agent operations reachable in actual field, Passport scroll isolated, no permission bypass.');
