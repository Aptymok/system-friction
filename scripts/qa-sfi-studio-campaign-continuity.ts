/**
 * Synthetic software contract QA only. Never counted as field observations,
 * measured campaign results, calibrated causal effects or authorized releases.
 */
import assert from 'node:assert/strict';
import { studioAttractorProjection } from '../src/components/studio/studioAttractorProjection';
import {
  planStudioContinuityCampaign,
} from '../src/components/studio/localNarrativeCampaignPlanner';
import {
  sequenceStudioReleases,type ReleaseSequenceItem,
} from '../src/components/studio/localAlbumReleaseSequencer';
import {
  contrastCampaignObservations,
} from '../src/components/studio/localCampaignContrast';
import {
  extractStudioGovernedReferences,
} from '../src/lib/studio/passport/governedReferenceProjection';

const sessionId='00000000-0000-4000-8000-000000000001';
const field={
  attractor:{id:'kxtxr-qa-identifier',label:'KXTXR',declaredAt:'2026-11-15T00:00:00Z'},
  nodes:[
    {id:'release-a',label:'REM618',kind:'project',parentId:'kxtxr-qa-identifier',description:'Synthetic past arc'},
    {id:'release-b',label:'111',kind:'project',parentId:'kxtxr-qa-identifier',description:'Synthetic middle arc'},
    {id:'release-c',label:'QUE NO',kind:'project',parentId:'kxtxr-qa-identifier',description:'Synthetic contrast arc'},
    {id:'release-d',label:'LUGAR LUNAR',kind:'project',parentId:'kxtxr-qa-identifier',description:'Synthetic next arc'},
    {id:'post-c',label:'TikTok proposal',kind:'node',parentId:'release-c',description:'QA-only post'},
  ],
  edges:[
    {id:'ed1',sourceId:'release-a',targetId:'release-b',relationType:'DERIVED_FROM'},
    {id:'ed2',sourceId:'release-b',targetId:'release-c',relationType:'INFLUENCES'},
    {id:'ed3',sourceId:'release-c',targetId:'release-d',relationType:'PROJECTS'},
  ],
};
const objects=[{
  id:'qa-audio-object',title:'QUE NO WAV',session_id:sessionId,
  metadata:{fieldNodeId:'release-c'},
}];
const graph=studioAttractorProjection(objects,[{id:sessionId,title:'SFI QA',metadata:{field}}]);
const anchor=graph.nodes.find(node=>node.label==='QUE NO'&&node.kind==='project');
assert.ok(anchor);
assert.ok(graph.edges.some(edge=>edge.relation==='PROJECTS'));
assert.ok(graph.nodes.some(node=>node.sourceObjectId==='qa-audio-object'&&node.parentId===anchor.id));
const plan=planStudioContinuityCampaign(graph,{
  anchorId:anchor.id,phase:'POST_RELEASE',startDate:'2026-11-16',
  weeks:3,channels:['instagram','tiktok'],
  assetFormats:['PHOTOGRAPH','VIDEO','TEXT'],
  releaseCandidates:['2026-12-11','2026-12-18'],
  externalObservations:[{
    sourceUrl:'https://example.org/qa-event-only',sourceTitle:'QA fixture — hypothetical dated event',
    observedAt:'2026-11-15T10:00:00Z',relevance:'UNKNOWN',
    relevanceRationale:'Synthetic unit test',observationKind:'DATED_FUTURE_EVENT',
    eventDate:'2026-12-11',
  }],
});
assert.equal(plan.contract,'SFI-STUDIO-CONTINUITY-CAMPAIGN-1.0');
assert.equal(plan.schedule.length,6);
assert.equal(plan.timeWindow.start,'2026-11-16');
assert.equal(plan.timeWindow.end,'2026-12-06');
assert.equal(plan.releaseWindows[0].conflicts.length,1);
assert.equal(plan.releaseWindows[1].conflicts.length,0);
assert.deepEqual(plan.narrativeLineage.predecessors.map(n=>n.title),['111','REM618']);
assert.deepEqual(plan.narrativeLineage.successors.map(n=>n.title),['LUGAR LUNAR']);
assert.equal(plan.narrativeLineage.interpretation,'DECLARED_RELATIONSHIPS_NOT_CAUSAL_CERTIFICATION');
assert.equal(plan.hypotheses.h1,'NARRATIVE_IDENTITY');
assert.equal(plan.hypotheses.h2,'LISTENING_EXPERIENCE');
assert.equal(plan.planningInputs.channels.length,2);
assert.ok(plan.schedule.every(item=>item.state==='PROPOSED_NOT_EXECUTED'&&
  item.executionReceipt===null&&item.observedReturn===null));
assert.equal(plan.authority.publication,'NOT_AUTHORIZED');
assert.equal(plan.proof.campaignExecuted,false);
assert.equal(plan.proof.winningHypothesis,null);
assert.ok(plan.continuity.preservedNarrative.includes('Synthetic contrast arc'));
assert.throws(()=>planStudioContinuityCampaign(graph,{
  anchorId:'nonexistent',phase:'POST_RELEASE',startDate:'2026-11-16',
  weeks:1,channels:['instagram'],assetFormats:['PHOTOGRAPH'],
}),/ATTRACTOR_NODE_NOT_FOUND/);
assert.throws(()=>planStudioContinuityCampaign(graph,{
  anchorId:anchor.id,phase:'POST_RELEASE',startDate:'2026-02-30',
  weeks:1,channels:['instagram'],assetFormats:['PHOTOGRAPH'],
}),/INVALID_DATE/);
assert.throws(()=>planStudioContinuityCampaign(graph,{
  anchorId:anchor.id,phase:'POST_RELEASE',startDate:'2026-11-16',
  weeks:0,channels:['instagram'],assetFormats:['PHOTOGRAPH'],
}),/CAMPAIGN_WEEKS_OUT_OF_RANGE/);

const songs:ReleaseSequenceItem[]=[
  {id:'rem',title:'REM618',narrative:'QA',originalOrder:0,
    acousticEnergyProxy:0.16,proxySource:'RECORDED_STUDIO_FEATURE',priorReleaseDate:null},
  {id:'one',title:'111',narrative:'QA',originalOrder:1,
    acousticEnergyProxy:0.78,proxySource:'RECORDED_STUDIO_FEATURE',priorReleaseDate:null},
  {id:'no',title:'QUE NO',narrative:'QA',originalOrder:2,
    acousticEnergyProxy:0.51,proxySource:'RECORDED_STUDIO_FEATURE',priorReleaseDate:null},
];
const sequence=sequenceStudioReleases({items:songs,earliestDate:'2026-11-15',spacingWeeks:3});
assert.equal(sequence.schedule.length,3);
assert.equal(sequence.schedule[0].date,'2026-11-27');
assert.equal(sequence.schedule[0].spotifyPitchDeadline,'2026-11-20');
assert.equal(sequence.schedule[1].date,'2026-12-18');
assert.equal(sequence.schedule[2].date,'2027-01-08');
assert.ok(sequence.schedule.every(item=>item.status==='PROPOSED_NOT_APPROVED'));
assert.equal(sequence.determination.optimality,'NOT_CALIBRATED');
assert.equal(sequence.scenarios.filter(s=>s.available).length,3);
const ramp=sequenceStudioReleases({items:songs,earliestDate:'2026-11-15',
  spacingWeeks:2,scenarioId:'ENERGY_RAMP'});
assert.deepEqual(ramp.scenarios.find(x=>x.id==='ENERGY_RAMP')?.order,['rem','no','one']);
const unknownAcoustic=[...songs.slice(0,2),{...songs[2],acousticEnergyProxy:null,proxySource:'UNAVAILABLE' as const}];
assert.throws(()=>sequenceStudioReleases({items:unknownAcoustic,
  earliestDate:'2026-11-15',spacingWeeks:2,scenarioId:'ENERGY_RAMP'}),
  /SELECTED_SEQUENCE_SCENARIO_UNSUPPORTED_BY_MEASUREMENTS/);
assert.equal(sequenceStudioReleases({items:unknownAcoustic,
  earliestDate:'2026-11-15',spacingWeeks:2}).scenarios[1].available,false);
assert.throws(()=>sequenceStudioReleases({items:songs,earliestDate:'2026-11-15',
  spacingWeeks:0}),/INVALID_RELEASE_SPACING/);

const observed=contrastCampaignObservations([
  {variant:'A',url:'https://example.org/post-a',observedAt:'2026-12-03T19:00:00Z',
    impressions:1000,saves:50,meaningfulInteractions:70,source:'MANUAL_PLATFORM_READBACK'},
  {variant:'B',url:'https://example.org/post-b',observedAt:'2026-12-03T20:00:00Z',
    impressions:1000,saves:30,meaningfulInteractions:40,source:'MANUAL_PLATFORM_READBACK'},
]);
assert.equal(observed.status,'CONTRASTABLE');
assert.equal(observed.relativeOutcome,'A_HIGHER_OBSERVED');
assert.equal(observed.winnerCertified,false);
const references=extractStudioGovernedReferences({
  projectName:'QUE NO',sourceText:'ROOT approved the campaign',
});
assert.equal(references.rootReceiptRefs.length,0);
assert.equal(references.caseIds.length,0);
assert.equal(references.agentIds.length,0);

console.log('PASS · Studio campaign continuity: explicit attractor, phase timeline, A/B, 7-day industry gate, sequencing, evidence limits and no false authority');
