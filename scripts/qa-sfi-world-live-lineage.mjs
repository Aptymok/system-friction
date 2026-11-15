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
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
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
  // Scoped by THIS execution's observed timestamps, not a hardcoded event id,
  // historical fixture, or 'latest record' from an unrelated run.
  const observations = await readLive(db.from('world_source_observations')
    .select('id,source_id,external_id,source_url,raw_hash,fetched_at')
    .eq('source_id','usgs-earthquakes')
    .gte('fetched_at',receipt.startedAt).lte('fetched_at',receipt.completedAt)
    .order('fetched_at',{ascending:false}).limit(15));
  if (!observations?.length) fail('USGS_SOURCE_NOT_READ_BACK_IN_SAME_EXECUTION_WINDOW');
  const observation=observations.find(o => isSha256(o.raw_hash) && /^https:\/\/earthquake\.usgs\.gov\/earthquakes\/eventpage\/[a-zA-Z0-9]+$/.test(o.source_url || '') && o.source_url.endsWith('/'+o.external_id));
  if (!observation) fail('USGS_SOURCE_PROVENANCE_INCOMPLETE');
  state.linkedObservationId=observation.id;
  state.externalEventId=observation.external_id;
  state.sourceUrl=observation.source_url;
  state.rawHash=observation.raw_hash;
  stage('source_persisted','PASS',{ id:observation.id, sourceId:observation.source_id, fetchedAt:observation.fetched_at, rawHash:observation.raw_hash });

  let reading;
  for (let attempt=0;attempt<3;attempt++) {
    const rows=await readLive(db.from('world_friction_readings')
      .select('id,observation_id,methodology_version,systemic_friction,interaction_density,systemic_coherence,created_at')
      .eq('observation_id',observation.id).order('created_at',{ascending:false}).limit(1));
    reading=rows?.[0];
    if (reading) break;
    await delay(1000);
  }
  if (!reading) fail('DERIVED_READING_NOT_PERSISTED_FOR_SOURCE_ID');
  for (const name of ['systemic_friction','interaction_density','systemic_coherence']) {
    if (!isFiniteNumber(reading[name])) fail('DERIVED_READING_VALUE_MISSING:'+name);
  }
  if (!reading.methodology_version || reading.observation_id !== observation.id) fail('DERIVED_READING_LINEAGE_MISMATCH');
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

  // The existing real operating-cycle ledger is inspected, not made up.
  // We explicitly do NOT claim that World data has become a ROOT/Case/Field RETURN.
  const operating=await readLive(db.from('sfi_operating_cycles')
    .select('id,cycle_code,status,evidence_refs,method_lab_refs,field_case_ref,return_refs,cognitive_twin_refs')
    .order('updated_at',{ascending:false}).limit(1));
  if (!operating?.length) {
    state.institutionalFullCycle={result:'BLOCKED',reason:'NO_OPERATING_CYCLE_PERSISTED'};
  } else {
    const c=operating[0];
    const missing=['evidence_refs','method_lab_refs','return_refs','cognitive_twin_refs']
      .filter(k=>!Array.isArray(c[k]) || !c[k].length);
    if (!c.field_case_ref) missing.push('field_case_ref');
    state.institutionalFullCycle={
      result:'BLOCKED',
      cycleId:c.id,
      cycleCode:c.cycle_code,
      observedStatus:c.status,
      reason:missing.length ? 'LINKED_ORGANS_MISSING' : 'INDEPENDENT_FIELD_AND_RETURN_ACCEPTANCE_STILL_REQUIRED',
      missingLinks:missing,
    };
  }
  stage('institutional_boundary','BLOCKED',state.institutionalFullCycle);
  state.result='WORLD_LINEAGE_PASS_INSTITUTIONAL_BLOCKED';
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
process.exitCode=state.result==='WORLD_LINEAGE_PASS_INSTITUTIONAL_BLOCKED'?0:2;
