import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function main() {
  const [campaign, root, continuity, social] = await Promise.all([
    readFile('src/lib/studio/campaign/studioCampaignPilot.ts','utf8'),
    readFile('src/app/api/external/v1/root/operate/route.ts','utf8'),
    readFile('src/app/api/cron/continuity-report/route.ts','utf8'),
    readFile('src/observatory/social/socialDraftPipeline.ts','utf8'),
  ]);
  for(const key of [
    'SFI-STUDIO-CAMPAIGN-PILOT-1.0',
    "from('studio_sessions')",
    "from('studio_archive_events')",
    "from('studio_objects')",
    "from('world_source_observations')",
    'calibrationDays: 15',
    'strategyDays: 90',
    'publicationMode: \'MANUAL_APPROVAL_REQUIRED\'',
    'automatedOutboundAllowed: false',
    'historicalReconstruction',
    'socialPerformanceObserved',
    'NO_PILOT',
    'ALREADY_REVIEWED',
    'READBACK_FAILED',
    'MIHM',
  ]) assert(campaign.toLowerCase().includes(key.toLowerCase()),'missing campaign guard '+key);
  assert(campaign.includes('importSfiStudioGenealogy'), 'genealogical import must use Studio existing owner');
  assert(campaign.includes("event_type:'SFI_GENEALOGY_IMPORT'"), 'historic lineage must use canonical Studio archive events');
  assert(campaign.includes("privateSecretsPersisted:false"), 'no raw secrets allowed in archive payload');
  assert(campaign.includes('READBACK_UNVERIFIED'), 'genealogy requires exact readback');
  assert(root.includes("operation === 'studio_sfi_genealogy_import'"), 'sovereign bounded genealogy endpoint missing');
  assert(campaign.includes('runZeroKeyDiscoveryResearch'), 'must perform bounded daily public listening');
  assert(campaign.includes('CANDIDATE_UNVERIFIED'), 'external listening must not presume third-party endorsement');
  assert(campaign.includes('resolveMihmMethod({'), 'Studio must invoke canonical MIHM method selector');
  assert(campaign.includes("subject: 'SFI_SYSTEM'"), 'SFI self-case must route as institution');
  assert(campaign.includes("temporalScope: 'LONGITUDINAL'"), 'temporal window must be explicit');
  assert(campaign.includes('projectTimelineClockProfile({'), 'Studio must invoke canonical MIHM-T descriptive clocks');
  assert(campaign.includes("RECORD: {"), 'dated archive record must map to RECORD only');
  assert(campaign.includes('validatedTransferModel: false'), 'descriptive timeline cannot claim validated transfer');
  assert(campaign.includes('historicalTimeline:'), 'MIHM-T clock evidence must be persisted in morning receipt');
  assert(campaign.includes('methodologicalRouting:'), 'canonical MIHM selection must be persisted in morning receipt');
  assert(root.includes("operation === 'studio_sfi_campaign_bootstrap'"));
  assert(root.includes("operation === 'studio_sfi_campaign_review'"));
  assert(root.includes('root.credential.subjectId!'), 'pilot must be owner-bound');
  assert(continuity.includes('reviewSfiStudioPilotMorning()'), 'reuse existing continuity owner');
  assert(continuity.includes('scheduledEgressGuardResponse()'), 'must retain restricted egress guard');
  assert(social.includes('OAuth write no habilitado.'), 'no bypass of publication gate');
  assert(!campaign.includes('sendEmail('), 'campaign must not send email');
  assert(!campaign.includes('runLlmTask('), 'campaign must not spend inference quota');
  assert(!campaign.includes('fetch('), 'campaign must use already-observed world evidence');
  console.log(JSON.stringify({ok:true,contract:'SFI-STUDIO-CAMPAIGN-PILOT-1.0',checks:23}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
