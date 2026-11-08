import 'server-only';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { runZeroKeyDiscoveryResearch } from '@/lib/agents/publicResearch';

export const SFI_STUDIO_CAMPAIGN_PILOT = 'SFI-STUDIO-CAMPAIGN-PILOT-1.0';
const PILOT_KEY = 'SFI-SELF-OBSERVATION-2026-11';
const DAY = 86_400_000;

type Row = Record<string, unknown>;
function obj(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function list(value: unknown): Row[] { return Array.isArray(value) ? value.map(obj) : []; }
function dateMs(value: unknown) { const n = Date.parse(text(value)); return Number.isFinite(n) ? n : 0; }

export async function locateSfiStudioPilot() {
  const db = createServiceSupabaseClient();
  const res = await db.from('studio_sessions')
    .select('id,owner_id,title,status,metadata,created_at,updated_at')
    .eq('metadata->campaignPilot->>key', PILOT_KEY).order('created_at', { ascending: true }).limit(3);
  if (res.error) throw new Error('STUDIO_CAMPAIGN_LOOKUP_FAILED:' + res.error.message);
  const sessions = list(res.data);
  if (sessions.length > 1) throw new Error('STUDIO_CAMPAIGN_DUPLICATE_SESSIONS_BLOCKED');
  return sessions[0] ?? null;
}

/** Authorized founder bootstrap; reuse the already-owned Studio session model. */
export async function bootstrapSfiStudioPilot(ownerId: string) {
  const existing = await locateSfiStudioPilot();
  if (existing) return { created: false, sessionId: text(existing.id), ownerBound: text(existing.owner_id) === ownerId, status: text(existing.status) };
  const db = createServiceSupabaseClient();
  const startedAt = new Date().toISOString();
  const result = await db.from('studio_sessions').insert({
    owner_id: ownerId, title: 'SFI · Autoobservación institucional · Campaña de calibración',
    status: 'active',
    metadata: { campaignPilot: {
      contract: SFI_STUDIO_CAMPAIGN_PILOT, key: PILOT_KEY, subject: 'System Friction Institute',
      canonicalDomain: 'systemfriction.org', startAt: startedAt,
      channels: ['instagram','medium','linkedin','email','web_search','prospects'],
      calibrationDays: 15, strategyDays: 90, publicationMode: 'MANUAL_APPROVAL_REQUIRED',
      hypothesis: 'Una comunicación verificable y útil facilita descubrimiento y conversaciones institucionales; contrastar frente a ausencia de ese resultado.',
      historicalReconstruction: 'STUDIO_ARCHIVE_AND_SOURCE_REFERENCES_ONLY',
      visualRule: 'REUSE_VERIFIED_OWNED_VISUAL_ELSE_PROPOSE_NO_AUTOGENERATION',
      authority: 'OBSERVE_PROPOSE_ONLY', automatedOutboundAllowed: false,
    } },
  }).select('id,owner_id,status').single();
  if (result.error || !result.data) throw new Error('STUDIO_CAMPAIGN_CREATE_FAILED:' + (result.error?.message ?? 'no_row'));
  return { created: true, sessionId: String(result.data.id), ownerBound: String(result.data.owner_id) === ownerId, status: result.data.status };
}

/** Daily readback grounded in existing Studio and World records; zero provider calls. */
export async function reviewSfiStudioPilotMorning(now = new Date()) {
  const session = await locateSfiStudioPilot();
  if (!session) return { ok: true, status: 'NO_PILOT', writesPerformed: false, contract: SFI_STUDIO_CAMPAIGN_PILOT };
  if (text(session.status) !== 'active') return { ok: true, status: 'PILOT_INACTIVE', writesPerformed: false };
  const ownerId = text(session.owner_id);
  const campaign = obj(obj(session.metadata).campaignPilot);
  const startMs = dateMs(campaign.startAt);
  const day = startMs ? Math.max(1, Math.floor((now.getTime() - startMs) / DAY) + 1) : 1;
  const dayKey = now.toISOString().slice(0, 10);
  const db = createServiceSupabaseClient();
  const [previous, historical, ownedObjects, world, drafts] = await Promise.all([
    db.from('studio_archive_events').select('id,payload,created_at').eq('session_id', String(session.id))
      .eq('event_type','SFI_CAMPAIGN_MORNING_REVIEW').order('created_at',{ascending:false}).limit(1),
    db.from('studio_archive_events').select('id,event_type,label,source,created_at').eq('session_id',String(session.id))
      .order('created_at',{ascending:false}).limit(24),
    db.from('studio_objects').select('id,title,object_type,metadata,status').eq('session_id',String(session.id))
      .eq('owner_id',ownerId).limit(35),
    db.from('world_source_observations').select('id,title,source_url,source_id,observed_at,released_at')
      .gte('observed_at',new Date(now.getTime()-48*60*60*1000).toISOString())
      .order('observed_at',{ascending:false}).limit(35),
    db.from('studio_evidence_traces').select('id,source,label,payload,created_at')
      .eq('owner_id',ownerId).order('created_at',{ascending:false}).limit(30),
  ]);
  const failure = [previous,historical,ownedObjects,world,drafts].find(x=>x.error);
  if (failure?.error) return { ok: false,status:'READ_DEGRADED',error: failure.error.message,writesPerformed:false };
  const prior = list(previous.data)[0];
  if (text(obj(prior?.payload).dayKey) === dayKey) return {
    ok:true,status:'ALREADY_REVIEWED',day,sessionId:session.id,receiptId:prior?.id,writesPerformed:false,
  };
  // One zero-key daily listening observation. Keep outside sources separate from
  // the Institute's self-publications; unsuccessful retrieval is NOT absence.
  const listening = await runZeroKeyDiscoveryResearch('"System Friction Institute"').catch((error) => ({
    ok:false, provider:'unavailable', sources:[], warnings:[error instanceof Error ? error.message : String(error)],
  }));
  const listenSources = listening.sources.slice(0,12).map(source=>({
    url:source.url,title:source.title,publisher:source.publisher,
    publishedAt:source.publishedAt,retrievedAt:source.retrievedAt,
    identity:'CANDIDATE_UNVERIFIED',
  }));
  const past = list(historical.data).filter(x => text(x.event_type) !== 'SFI_CAMPAIGN_MORNING_REVIEW');
  const objects = list(ownedObjects.data);
  const visuals = objects.filter(x=>text(x.object_type)==='image' || text(x.object_type)==='video');
  const signals = list(world.data).filter(x=> /\b(ai|artificial intelligence|research|science|governance|technology|innovation|sistema|investigaci[oó]n|institut|institution)\b/i.test(text(x.title))).slice(0,8);
  const evidence = list(drafts.data).filter(x => /social|campaign|engagement|publication|discovery|external/i.test(text(x.source))).slice(0,10);
  const qualifiedSignals = signals.filter(x=>Boolean(text(x.source_url)));
  const socialPerformanceObserved = evidence.some(x=>obj(x.payload).externalPostId && obj(x.payload).observedMetrics);
  const historicalEvidence = past.length;
  const horizon = day<=15?'MICRO_CALIBRATION':day<=90?'STRATEGIC_90D':'REVIEW_DUE';
  // No inferred world causality, no spurious MIHM score, no vanity KPI mistaken for adoption.
  const decision = !qualifiedSignals.length ? 'HOLD_PENDING_WORLD_EVIDENCE'
    : !socialPerformanceObserved ? 'HOLD_PENDING_EXTERNAL_PERFORMANCE'
    : 'REVIEW_SIGNALS_MANUALLY';
  const visual = visuals.length?'CONSIDER_OWNED_ASSETS_VERIFY_RIGHTS':'PROPOSE_ORIGINAL_VISUAL_NO_AUTOGENERATION';
  const receipt = {
    contract:SFI_STUDIO_CAMPAIGN_PILOT, dayKey, day, horizon, decision,
    epistemicClass:'DERIVED', sourceWorldIds: qualifiedSignals.map(x=>x.id),
    relevantSignals: qualifiedSignals.map(x=>({title:x.title,url:x.source_url,observedAt:x.observed_at})),
    externalListening: {
      status:listening.ok?'SEARCH_RESULTS_REPORTED':'UNAVAILABLE',
      provider:listening.provider,sourceCount:listenSources.length,sources:listenSources,
      limits:'Result URLs are leads for verification. SFI-authored pages are not independent mentions. No sentiment is inferred.',
      warnings:listening.warnings.slice(0,5),
    },
    historicalArchiveCount:historicalEvidence, historicalReconstruction:'DOCUMENTED_ONLY',
    candidateVisualCount:visuals.length, visual,
    candidateVisualObjectIds:visuals.map(x=>x.id),
    socialPerformanceObserved, socialEvidenceTraceIds:evidence.map(x=>x.id),
    campaignChannels: campaign.channels, fourteenDayCheckpoint:day>=15,
    ninetyDayCheckpoint:day>=90, mihm:'NOT_OBSERVED_WITHOUT_VALIDATED_MEASUREMENT',
    mihmT:'DESCRIPTIVE_TIMELINE_ONLY_NOT_VALIDATED_PREDICTION',
    nextAction: !socialPerformanceObserved ? 'Obtain connected network analytics and real post identifiers before judging campaign effectiveness.' : 'Compare channel-specific results to precommitted hypothesis; propose reversible adjustment.',
    missing: [
      ...(visuals.length?[]:['VERIFIED_PROJECT_VISUAL']),
      ...(!socialPerformanceObserved?['EXTERNAL_CHANNEL_PERFORMANCE']:[]),
      ...(!qualifiedSignals.length?['RELEVANT_RECENT_WORLD_SIGNAL']:[]),
      ...(!listening.ok?['BRAND_LISTENING_PROVIDER_UNAVAILABLE']:[]),
    ],
    outboundExecuted:false, publicationExecuted:false, authorityExpanded:false,
    limitations:['World title relevance is lexical screening, not verified causal effect.',
      'No platform API is inferred as connected. No audience, sentiment, prospect or success metrics are fabricated.',
      'Campaign cannot self-approve publication or send email.'],
  };
  const inserted=await db.from('studio_archive_events').insert({
    session_id:session.id,owner_id:ownerId,event_type:'SFI_CAMPAIGN_MORNING_REVIEW',
    label:'SFI campaign morning · '+dayKey,source:'studio_campaign_pilot_v1',payload:receipt,
  }).select('id').single();
  if(inserted.error || !inserted.data?.id) return {ok:false,status:'PERSIST_FAILED',error:inserted.error?.message??'no_receipt',writesPerformed:false};
  const readback=await db.from('studio_archive_events').select('id,payload').eq('id',inserted.data.id).maybeSingle();
  if(readback.error || !readback.data || text(obj(readback.data.payload).dayKey)!==dayKey) return {
    ok:false,status:'READBACK_FAILED',writesPerformed:true,receiptId:inserted.data.id,
  };
  return {ok:true,status:'REVIEW_PERSISTED',sessionId:session.id,receiptId:inserted.data.id,
    day,horizon,decision,visual,signalCount:qualifiedSignals.length,
    socialPerformanceObserved,brandListeningStatus:receipt.externalListening.status,
    brandSourceCount:listenSources.length,missing:receipt.missing,writesPerformed:true,
    publicationExecuted:false};
}
