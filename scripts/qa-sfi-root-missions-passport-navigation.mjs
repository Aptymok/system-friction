#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const field=readFileSync('src/components/sfi/RootNeuralGraphView.tsx','utf8');
const workspace=readFileSync('src/components/sfi/SfiRootWorkspace.tsx','utf8');
const css=readFileSync('src/components/sfi/RootNeuralGraphView.css','utf8');

assert.match(field, /data-root-visual="SFI-ROOT-PANORAMIC-FIELD-2\.0"/);
assert.match(field, /data-root-layout="FIELD-AND-READING"/);
assert.match(field, /const \[passportOpen,setPassportOpen\]=useState\(false\)/);
assert.match(field, /hidden=\{!passportOpen\}/);
assert.match(field, /role="dialog" aria-modal=\{passportOpen\}/);
assert.match(field, /onKeyDown=\{event=>\{if\(event\.key==='Escape'\)/);
assert.match(field, /className="rootBackToGraph" onClick=\{closePassport\}/);
assert.match(field, /const openPassport=\(\)=>setPassportOpen\(true\)/);
assert.match(field, /passportRef\.current\?\.scrollTo\(\{top:0,behavior:'auto'\}\)/);
assert.doesNotMatch(field, /viewport\.scrollBy|scrollBy\(\{left:|revealPanel\(/);
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
assert.match(css, /data-root-layout="FIELD-AND-READING"/);
assert.match(css, /rootGovernanceConsole\{[\s\S]*?overflow-x:hidden!important;overflow-y:scroll!important/);
assert.match(css, /rootGovernanceConsole\[hidden\]\{[\s\S]*?display:none!important/);
assert.match(css, /rootHorizontalRail\{[\s\S]*?grid-template-columns:var\(--root-side\) minmax\(0,1fr\)!important/);
assert.doesNotMatch(css, /2880px/);
assert.match(css, /rootPassportScrim/);
assert.match(css, /@media\(max-width:650px\)/);
assert.match(css, /rootPassportMissions>summary/);
assert.match(css, /rootFieldQuickAccess/);
assert.match(css, /\.rootMissionEmbedded button:disabled/);
console.log('PASS ROOT cockpit: no horizontal rail, accessible independent vertical Passport, C07 gates unchanged.');
