#!/usr/bin/env node
// REAL observations only. No mock providers, fixture rows, fallback values, or synthetic RETURN.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const outputDir = process.env.SFI_WORLD_SIGNAL_OBSERVER_EVIDENCE_DIR || 'artifacts/world-signal-observer';
const outputPath = path.join(outputDir, 'live-lineage.json');
const startedAt = new Date().toISOString();
const observationReceiptPath = path.join(outputDir, 'receipt.json');

const state = {
  contract: 'SFI-LIVE-WORLD-LINEAGE-1.0',
  startedAt, completedAt: null, mode: 'REAL_PUBLIC_SOURCE_AND_CANONICAL_READBACK',
  source: 'USGS Earthquake Hazards Program',
  result: 'NOT_OBSERVED', stages: [], linkedObservationId: null,
  linkedReadingId: null, externalEventId: null, sourceUrl: null,
  rawHash: null, collectorReceipt: null, warnings: [],
  institutionalFullCycle: { result: 'NOT_EVALUATED', reason: 'World source observation is not a consented Field intervention/RETURN.' },
};
const stage = (name, result, detail) => state.stages.push({ name, result, detail });
const fail = (reason) => { throw Error(reason); };
const isSha256 = value => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
const isFiniteNumber = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

async function readLive(query) {
  const { data, error } = await query;
  if (error) fail('LIVE_SUPABASE_READ_FAILED:' + error.message);
  return data;
}
async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !key) fail('CANONICAL_SUPABASE_READ_CREDENTIALS_MISSING');
  const receipt = JSON.parse(await fs.readFile(observationReceiptPath,'utf8'));
  if (receipt.pass !== true || receipt.agent?.authority !== 'OBSERVE') fail('WORLD_AGENT_RECEIPT_NOT_SUCCESSFUL');
  if (!(Number(receipt.execution?.sourceCounts?.['usgs-earthquakes']) > 0)) {
    fail('USGS_NOT_OBSERVED_IN_THIS_REAL_EXECUTION');
  }
  if (!Number.isFinite(Date.parse(receipt.startedAt)) || !Number.isFinite(Date.parse(receipt.completedAt))) {
    fail('WORLD_AGENT_RECEIPT_TIME_MISSING');
  }
  stage('canonical_observer', 'PASS', { startedAt: receipt.startedAt, completedAt: receipt.completedAt, observed: receipt.execution.observed, persistedReported: receipt.execution.persisted });
  const db = createClient(supabaseUrl,key,{auth:{persistSession:false,autoRefreshToken:false}});
  // Exact observation and derived IDs are returned by THIS invocation's
  // canonical DB upserts. A matching time window alone is not provenance.
  const bound = Array.isArray(receipt.execution?.sourceLineage)
    ? receipt.execution.sourceLineage.find(ref =>
        ref.sourceId === 'usgs-earthquakes'
        && typeof ref.observationId === 'string'
        && typeof ref.readingId === 'string'
        && isSha256(ref.rawHash))
    : null;
  if (!bound) fail('EXACT_SOURCE_AND_READING_IDS_MISSING_FROM_LIVE_RECEIPT');
  const observation=await readLive(db.from('world_source_observations')
    .select('id,source_id,external_id,source_url,raw_hash,fetched_at')
    .eq('id',bound.observationId).single());
  if (!observation || observation.id !== bound.observationId
    || observation.source_id !== bound.sourceId
    || observation.external_id !== bound.externalId
    || observation.source_url !== bound.sourceUrl
    || observation.raw_hash !== bound.rawHash
    || !/^https:\/\/earthquake\.usgs\.gov\/earthquakes\/eventpage\/[a-zA-Z0-9]+$/.test(observation.source_url || '')
    || !observation.source_url.endsWith('/'+observation.external_id)) {
    fail('USGS_CANONICAL_OBSERVATION_DIFFERENT_FROM_ACTUAL_WRITER_RECEIPT');
  }
  state.linkedObservationId=observation.id;
  state.externalEventId=observation.external_id;
  state.sourceUrl=observation.source_url;
  state.rawHash=observation.raw_hash;
  stage('source_persisted','PASS',{ id:observation.id, sourceId:observation.source_id, fetchedAt:observation.fetched_at, rawHash:observation.raw_hash });

  const reading=await readLive(db.from('world_friction_readings')
    .select('id,observation_id,methodology_version,systemic_friction,interaction_density,systemic_coherence,created_at')
    .eq('id',bound.readingId).eq('observation_id',bound.observationId).single());
  if (!reading || reading.id !== bound.readingId || reading.observation_id !== observation.id) {
    fail('DERIVED_READING_ID_NOT_BOUND_TO_THIS_SOURCE_UPSERT');
  }
  for (const name of ['systemic_friction','interaction_density','systemic_coherence']) {
    if (!isFiniteNumber(reading[name])) fail('DERIVED_READING_VALUE_MISSING:'+name);
  }
  if (!reading.methodology_version) fail('DERIVED_READING_METHOD_VERSION_MISSING');
  state.linkedReadingId=reading.id;
  stage('derived_readback','PASS',{id:reading.id,sourceObservationId:reading.observation_id,methodologyVersion:reading.methodology_version,values:{systemicFriction:reading.systemic_friction,interactionDensity:reading.interaction_density,systemicCoherence:reading.systemic_coherence}});
  // USGS's live endpoint verifies the externally sourced event id independently.
  // USGS may revise a value; we NEVER substitute the retained observation.
  const sourceEndpoint='https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&eventid='+encodeURIComponent(observation.external_id);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);
  let response;
  try { response=await fetch(sourceEndpoint,{headers:{accept:'application/json','user-agent':'SystemFrictionInstitute-Real-Lineage-Audit/1.0'},signal:controller.signal}); }
  finally {clearTimeout(timer);}
  if (!response.ok) fail('USGS_LIVE_EVENT_HTTP_'+response.status);
  const json=await response.json();
  const fetchedId=json?.id ?? json?.features?.[0]?.id ?? null;
  if (fetchedId !== observation.external_id) fail('USGS_OFFICIAL_EVENT_ID_MISMATCH');
  stage('independent_public_source','PASS',{officialApi:sourceEndpoint,officialEventId:fetchedId,observedAt:new Date().toISOString()});

  // Institutional closure is a distinct, ROOT-governed contract.
  // Inspect actual persisted identities; never turn World observation into
  // Field consent, Method Lab execution, independent RETURN or Twin memory.
  const operating=await readLive(db.from('sfi_operating_cycles')
    .select('id,cycle_code,status,evidence_refs,method_lab_refs,field_case_ref,return_refs,cognitive_twin_refs')
    .order('updated_at',{ascending:false}).limit(1));
  if (!operating?.length) {
    state.institutionalFullCycle={result:'BLOCKED',reason:'NO_OPERATING_CYCLE_PERSISTED',checks:{}};
  } else {
    const c=operating[0];
    const uuid = value => typeof value==='string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
    const refs = key => Array.isArray(c[key]) ? c[key].filter(uuid) : [];
    const checks={};
    const evidenceIds=refs('evidence_refs');
    const roots=evidenceIds.length
      ? await readLive(db.from('root_evidence_entries').select('id,epistemic_event_id').in('id',evidenceIds))
      : [];
    checks.linkedRootEvidence=roots?.some(row=>Boolean(row.epistemic_event_id))===true;
    const labIds=refs('method_lab_refs');
    const labs=labIds.length
      ? await readLive(db.from('sfi_lab_analyses').select('id').in('id',labIds))
      : [];
    checks.linkedLabAnalysis=Boolean(labs?.length);
    const fieldCase=uuid(c.field_case_ref)
      ? await readLive(db.from('field_cases').select('id,status,consent').eq('id',c.field_case_ref).limit(1))
      : [];
    checks.consentedFieldCase=Boolean(fieldCase?.length&&fieldCase[0].consent===true);
    const returnIds=refs('return_refs');
    const returns=returnIds.length && c.field_case_ref
      ? await readLive(db.from('field_returns').select('id,case_id,status,intervention_id,returned_at').in('id',returnIds).eq('case_id',c.field_case_ref))
      : [];
    checks.linkedAcceptedReturn=Boolean(returns?.some(row=>row.status==='RETURN_ACCEPTED'&&row.intervention_id));
    checks.twinReferenceRecorded=refs('cognitive_twin_refs').length>0;
    // Even all reference checks passing does not validate provenance/time or
    // certify the Field outcome. Only ROOT's real full-cycle verifier may close.
    const missing=Object.entries(checks).filter(([,observed])=>!observed).map(([key])=>key);
    state.institutionalFullCycle={
      result:missing.length?'BLOCKED':'NEEDS_ROOT_FULL_CYCLE_VERIFICATION',
      cycleId:c.id,
      cycleCode:c.cycle_code,
      observedStatus:c.status,
      checks,
      missingLinks:missing,
      reason:missing.length?'PERSISTED_CROSS_ORGAN_LINKS_INCOMPLETE':'IDENTITIES_PRESENT_BUT_OUTCOME_NOT_INDEPENDENTLY_VALIDATED',
    };
  }
  stage('institutional_boundary',state.institutionalFullCycle.result,state.institutionalFullCycle);
  state.result='WORLD_LINEAGE_PASS';
}
try { await main(); }
catch (error) {
  state.result='NOT_OBSERVED';
  const message=error instanceof Error?error.message:String(error);
  state.warnings.push(message);
  stage('verification_blocked','NOT_OBSERVED',{reason:message});
}
finally {
  state.completedAt=new Date().toISOString();
  await fs.mkdir(outputDir,{recursive:true});
  await fs.writeFile(outputPath,JSON.stringify(state,null,2)+'\n');
  console.log(JSON.stringify(state));
}
process.exitCode=state.result==='WORLD_LINEAGE_PASS'?0:2;
