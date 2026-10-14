/**
 * MIHM-T Timeline v0.1 / scientific truth and interface protection checks.
 * QA for source admissibility, not evidence of MIHM-T empirical validity.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TIMELINE_CLOCKS, projectTimelineClockProfile, TIMELINE_CLOCK_CONTRACT} from '../src/lib/mihm/timelineClocks';

const read=(path:string)=>fs.readFileSync(path,'utf8');
const when='2026-10-12T09:00:00Z';
const proof=(at:string,meaning='Explicit observed stamp')=>({
  at,sourceRef:'source-1',meaning,
  basis:'OBSERVED_TIME' as const,epistemicClass:'OBSERVED' as const,
});
const profile=(clocks:Parameters<typeof projectTimelineClockProfile>[0]['clocks'])=>
  projectTimelineClockProfile({eventId:'worldspect:1',anchorAt:when,anchorMeaning:'historical calendar anchor',clocks});
const by=(p:ReturnType<typeof profile>,clock:string)=>p.readings.find(x=>x.clock===clock)!;

// The seven-clock conceptual axes never borrow dates from the record anchor.
const zero=profile({});
assert.equal(zero.contract,TIMELINE_CLOCK_CONTRACT);
assert.equal(TIMELINE_CLOCKS.length,7);
assert.equal(zero.readings.filter(x=>x.at).length,0);
assert.equal(zero.incompleteClocks.length,7);
assert.equal(zero.documentedIntervals.length,0);
assert.equal(zero.sourceCompleteness,'NO_CLOCK_EVIDENCE');

const one=profile({RECORD:proof(when,'Recorded update, not witnessed event')});
assert.equal(by(one,'RECORD').at,when.replace('Z','.000Z'));
assert.equal(by(one,'EVENT').at,null);
assert.equal(by(one,'KNOWLEDGE').at,null);
assert.equal(by(one,'RETURN').state,'UNKNOWN');
assert.equal(one.documentedIntervals.length,0);
assert.equal(one.inference,'NO_INFERRED_TIMESTAMPS');

const invalid=profile({RECORD:{...proof('2026-10-12'),sourceRef:''},EVENT:proof('not-a-date')});
assert.equal(by(invalid,'RECORD').state,'UNKNOWN');
assert.equal(by(invalid,'EVENT').state,'UNKNOWN');

const future=profile({EVENT:{...proof(when),basis:'PROJECTED_TIME'}});
assert.equal(by(future,'EVENT').at,null);

const two=profile({OBSERVATION:proof('2026-10-12T09:00:00Z'),RECORD:proof('2026-10-12T09:12:00Z')});
assert.equal(two.documentedIntervals.length,1);
assert.equal(two.documentedIntervals[0].deltaMs,12*60*1000);
assert.equal(two.documentedIntervals[0].from,'OBSERVATION');
assert.equal(two.documentedIntervals[0].to,'RECORD');
assert.equal(two.documentedIntervals[0].state,'DATED_ORDER');
assert.equal(by(two,'AUTHORITY').at,null);

const reversed=profile({AUTHORITY:proof('2026-10-12T12:00:00Z'),EXECUTION:proof('2026-10-12T09:00:00Z')});
assert.equal(reversed.documentedIntervals[0].state,'REVERSED_OR_CONFLICTED');
assert.ok(reversed.documentedIntervals[0].deltaMs<0);

const duplicates=profile({EVENT:proof(when),RECORD:proof(when)});
assert.equal(duplicates.documentedIntervals[0].deltaMs,0);
assert.equal(duplicates.documentedIntervals[0].state,'DATED_ORDER');

const page=read('src/app/timeline/page.tsx');
const ui=read('src/components/sfi/OperationalTimeline.tsx');
const css=read('src/components/sfi/OperationalTimeline.css');
const source=read('src/lib/observatory/public/worldSnapshotTimeline.ts');
assert.ok(page.includes('await requireUserProfile()'),'timeline_requires_authenticated_profile');
assert.ok(page.includes('/login?next=%2Ftimeline'),'anonymous_must_not_enter_authenticated_timeline');
assert.ok(page.includes('/auth-unavailable?next=%2Ftimeline'),'auth_outage_must_not_mask_as_unauthorized');
assert.ok(page.includes("robots: { index: false"),'authenticated_timeline_must_not_be_indexed');
assert.ok(page.indexOf('await requireUserProfile()')<page.indexOf('SFI_CANONICAL_OBJECT_REGISTRY\\n    .filter')||
  page.indexOf('await requireUserProfile()')<page.indexOf('const institution: TimelineItem[]'),
  'timeline_auth_must_precede_reads');

assert.ok(source.includes("observedTimeSource: text(snapshot.observed_at)"),'source_timestamp_basis_missing');
assert.ok(page.includes("frame.observedTimeSource === 'observed_at'"),'created_at_fallback_must_not_be_an_observation');
assert.ok(page.includes("frame.recordCreatedAt"),'record_clock_requires_independent_timestamp');
assert.ok(page.includes("clockAnchorMeaning"),'anchor_kind_must_be_described');

assert.ok(ui.includes("projectTimelineClockProfile"),'seven_clock_inspector_not_connected');
assert.ok(ui.includes("OBSERVATORY OF CLOCKS"),'clock_observatory_mode_missing');
assert.ok(ui.includes("RECORDED CHRONOLOGY"),'chronological_mode_missing');
assert.ok(ui.includes("UNKNOWN"),'missing_clock_state_not_visible');
assert.ok(ui.includes("NO RECORDED ENTRIES IN SELECTED WINDOW"),'timeline_empty_state_missing');
assert.ok(ui.includes("sfiTemporalViewport"),'horizontal_scroll_region_missing');
assert.ok(ui.includes("sfiTemporalScrubber"),'functional_date_controls_missing');
assert.ok(!ui.includes('<footer'),'fake_footer_must_be_removed_from_operational_timeline');
assert.ok(css.includes('scrollbar-color:#d3ab67'),'SFI_colored_horizontal_scroll_missing');
assert.ok(!/Math\.random\s*\(/.test(page+ui),'synthetic_events_forbidden');

console.log(JSON.stringify({
  contract:TIMELINE_CLOCK_CONTRACT,sourceTruthGates:'PASSED',
  clocks:7,unknownPreserved:true,sourceIntervalsNotCausality:true,
  authenticatedRoute:true,publicChronologyReused:true,canonicalMIHMPhiChanged:false,
  validatedMIHMT:false
},null,2));
