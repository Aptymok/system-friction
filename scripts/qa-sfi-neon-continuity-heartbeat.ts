import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
const checks: Array<{ name: string; ok: boolean }> = [];
const check = (name: string, ok: boolean) => checks.push({ name, ok });

const postgres = read('src/lib/sfi/continuityPostgres.ts');
const gate = read('src/lib/continuity/actionableWorkGate.ts');
const runtime = read('src/lib/continuity/runtime.ts');
const store = read('src/lib/continuity/neonHeartbeatStore.ts');
const guard = read('src/lib/continuity/scheduledEgressGuard.ts');
const heartbeat = read('src/app/api/cron/continuity-heartbeat/route.ts');
const primaryMirror = read('src/lib/persistence/primaryMirror.ts');
const dataPlaneRpc = read('src/lib/persistence/dataPlaneRpc.ts');
const continuityRecovery = read('src/lib/persistence/continuityRecovery.ts');
const dataPlaneFetch = read('src/lib/persistence/dataPlaneFetch.ts');
const dataPlaneConfig = read('src/lib/persistence/dataPlaneConfig.ts');
const neonDataPlaneGovernor = read('scripts/db/neon-data-plane-governor.sql');
const hourlyContinuity = read('.github/workflows/sfi-continuity-hourly.yml');
const canonicalTwinMemory = read('src/core/cognitive-twin/canonicalMemoryView.ts');
const twinState = read('src/core/cognitive-twin/readState.ts');
const amvAgent = read('src/lib/agents/amvAgent.ts');
const scorefrictionLab = read('src/app/api/scorefriction/lab/analyze/route.ts');
const runtimeObserver = read('src/runtime/layers/Observer.ts');
const runtimeIntentLayer = read('src/runtime/layers/IntentLayer.ts');
const worldReobserveRoute = read('src/app/api/field/map/world/reobserve/route.ts');
const ingestReadRoute = read('src/app/api/ingest/read/route.ts');
const ingestRealRoute = read('src/app/api/ingest/real/route.ts');
const signalsReadRoute = read('src/app/api/signals/read/route.ts');
const signalsRoute = read('src/app/api/signals/route.ts');
const fieldEventsRoute = read('src/app/api/field/events/route.ts');
const fieldStateRoute = read('src/app/api/field/state/route.ts');
const amvFieldResponseRoute = read('src/app/api/amv/field-response/route.ts');
const socialResonanceRoute = read('src/app/api/social/resonance/route.ts');
const mediaDraftsRoute = read('src/app/api/media/drafts/route.ts');
const bitacoraRegenerateRoute = read('src/app/api/bitacora/regenerate/route.ts');
const phenomenologicalCalendarRoute = read('src/app/api/calendar/phenomenological/route.ts');
const fieldPersistRoute = read('src/app/api/field/persist/route.ts');
const liturgiaAmvRoute = read('src/app/api/liturgia/amv/route.ts');
const epistemicEventWriter = read('src/core/memory/epistemicEventWriter.ts');
const operationalSnapshotRoute = read('src/app/api/sfi/operational-snapshot/route.ts');
const globalMetricsRoute = read('src/app/api/global-metrics/route.ts');
const mophSessionStore = read('src/lib/moph/session-store.ts');
const scorefrictionMeasurementRoute = read('src/app/api/scorefriction/assets/[asset_id]/measurements/route.ts');
const cognitiveLabService = read('src/lib/cognitive-lab/service.ts');
const sfiAssetsService = read('src/lib/server/sfiAssets.ts');
const nodeBootstrapRoute = read('src/app/api/node/bootstrap/route.ts');
const runtimeBootstrapRoute = read('src/app/api/runtime/bootstrap/route.ts');
const productionBackend = read('src/lib/server/productionBackend.ts');
const actorNodeProjection = read('src/lib/server/actorNodeProjection.ts');
const entitlementsService = read('src/lib/licensing/entitlements.ts');
const mihmRuntimeMatrix = read('src/observatory/field/catalog/mihmRuntimeMatrix.ts');
const mutationProposeRoute = fs.readFileSync(path.join(process.cwd(), 'src/app/api/mutations/propose/route.ts'), 'utf8');
const mutationCloseRoute = fs.readFileSync(path.join(process.cwd(), 'src/app/api/root/mutations/[id]/close/route.ts'), 'utf8');
const rootContinuityRoute = fs.readFileSync(path.join(process.cwd(), 'src/app/api/root/continuity/route.ts'), 'utf8');
const rootDecisionsRoute = fs.readFileSync(path.join(process.cwd(), 'src/app/api/root/decisions/route.ts'), 'utf8');
const rootCognitiveTwinRoute = fs.readFileSync(path.join(process.cwd(), 'src/app/api/root/cognitive-twin/route.ts'), 'utf8');
const rootEvidenceRoute = fs.readFileSync(path.join(process.cwd(), 'src/app/api/root/evidence/route.ts'), 'utf8');
const operationalCommon = read('src/lib/operational/common.ts');
const rootServer = read('src/lib/root/server.ts');

check('Scorefriction lab persistence uses the canonical systemic data-plane client and does not claim Supabase provenance',
  scorefrictionLab.includes("createServiceSupabaseClient")
  && !scorefrictionLab.includes('from "@supabase/supabase-js"')
  && scorefrictionLab.includes('persistenceSource: "systemic_data_plane"')
  && !scorefrictionLab.includes('persistenceSource: "supabase"'));

check('runtime Observer and IntentLayer reuse the canonical systemic service client instead of parallel Supabase clients',
  runtimeObserver.includes("createServiceSupabaseClient")
  && runtimeIntentLayer.includes("createServiceSupabaseClient")
  && !runtimeObserver.includes("from '@supabase/supabase-js'")
  && !runtimeIntentLayer.includes("from '@supabase/supabase-js'"));

check('world reobserve does not spend five count-only data-plane queries after executing its cycles',
  !worldReobserveRoute.includes("count: 'exact', head: true"));

check('high-frequency ingest and signal reads use bounded actor-scoped canonical ledger projections',
  ingestReadRoute.includes("from('epistemic_events')")
  && ingestReadRoute.includes(".select('id,created_at,payload')")
  && ingestReadRoute.includes(".eq('actor_id', ctx.user.id)")
  && ingestReadRoute.includes(".eq('node_id', ctx.node.id)")
  && signalsReadRoute.includes("from('epistemic_events')")
  && signalsReadRoute.includes(".select('id,node_id,event_name,created_at,payload')")
  && signalsReadRoute.includes(".eq('actor_id', ctx.user.id)")
  && signalsReadRoute.includes(".eq('node_id', ctx.node.id)")
  && !ingestReadRoute.includes("from('cognitive_event_stream')")
  && !signalsReadRoute.includes("from('cognitive_event_stream')")
  && !ingestReadRoute.includes(".select('*')")
  && !signalsReadRoute.includes(".select('*')"));

check('actor command writers converge on the canonical epistemic writer with deterministic idempotency where declared',
  epistemicEventWriter.includes('eventId?: string')
  && epistemicEventWriter.includes("from('epistemic_events')")
  && signalsRoute.includes('emitEpistemicEvent')
  && signalsRoute.includes('eventId: canonicalEventId')
  && signalsRoute.includes("epistemicClass: 'declared'")
  && !signalsRoute.includes("from('cognitive_event_stream')")
  && fieldEventsRoute.includes('emitEpistemicEvent')
  && fieldEventsRoute.includes('eventId: canonicalEventId')
  && fieldEventsRoute.includes("epistemicClass: 'declared'")
  && !fieldEventsRoute.includes("from('cognitive_event_stream')")
  && ingestRealRoute.includes('emitEpistemicEvent')
  && ingestRealRoute.includes("epistemicClass: 'observed'")
  && !ingestRealRoute.includes("from('cognitive_event_stream')"));

check('Field State reads only actor-scoped canonical signal, ingest and AMV events',
  fieldStateRoute.includes("from('epistemic_events')")
  && fieldStateRoute.includes(".select('id,node_id,event_name,payload,created_at')")
  && fieldStateRoute.includes(".eq('actor_id', ctx.user.id)")
  && fieldStateRoute.includes(".eq('node_id', ctx.node.id)")
  && fieldStateRoute.includes(".in('event_name', ['SIGNAL_DECLARED', 'AMV_RESPONSE', 'REAL_OBSERVATION_INGESTED'])")
  && fieldStateRoute.includes('streamTypeOf')
  && !fieldStateRoute.includes("from('cognitive_event_stream')")
  && !fieldStateRoute.includes(".select('*')"));

check('AMV Field responses are derived actor events in the canonical epistemic ledger',
  amvFieldResponseRoute.includes('emitEpistemicEvent')
  && amvFieldResponseRoute.includes("eventName: 'AMV_RESPONSE'")
  && amvFieldResponseRoute.includes("epistemicClass: 'derived'")
  && amvFieldResponseRoute.includes("streamType: 'agent'")
  && !amvFieldResponseRoute.includes("from('cognitive_event_stream')"));

check('manual social resonance is a declared actor event without legacy social persistence',
  socialResonanceRoute.includes('emitEpistemicEvent')
  && socialResonanceRoute.includes("eventName: 'social_resonance_ingested'")
  && socialResonanceRoute.includes("epistemicClass: 'declared'")
  && socialResonanceRoute.includes("sourceState: 'declared'")
  && !socialResonanceRoute.includes("from('social_resonance_events')")
  && !socialResonanceRoute.includes("from('cognitive_event_stream')"));

check('media drafts are actor ledger events pending human validation, never implicit publications',
  mediaDraftsRoute.includes("from('epistemic_events')")
  && mediaDraftsRoute.includes("eventName: 'SFI_MEDIA_DRAFT_RECORDED'")
  && mediaDraftsRoute.includes("epistemicClass: 'declared'")
  && mediaDraftsRoute.includes("status: 'pending_human_validation'")
  && mediaDraftsRoute.includes(".eq('actor_id', ctx.user.id)")
  && mediaDraftsRoute.includes(".eq('node_id', ctx.node.id)")
  && !mediaDraftsRoute.includes("from('media_drafts')")
  && !mediaDraftsRoute.includes("from('sfi_publications')"));

check('bitacora public fragments stop at a pending draft event',
  bitacoraRegenerateRoute.includes("eventName: 'SFI_MEDIA_DRAFT_RECORDED'")
  && bitacoraRegenerateRoute.includes("epistemicClass: 'derived'")
  && bitacoraRegenerateRoute.includes("status: 'pending_human_validation'")
  && !bitacoraRegenerateRoute.includes("from('media_drafts')")
  && !bitacoraRegenerateRoute.includes("from('sfi_publications')"));

check('remaining actor-facing legacy surfaces use canonical ledger and live stores only',
  bitacoraRegenerateRoute.includes("from('epistemic_events')")
  && bitacoraRegenerateRoute.includes('emitEpistemicEvent')
  && phenomenologicalCalendarRoute.includes("from('field_interventions')")
  && phenomenologicalCalendarRoute.includes("from('epistemic_events')")
  && fieldPersistRoute.includes('emitEpistemicEvent')
  && fieldPersistRoute.includes("from('epistemic_events')")
  && liturgiaAmvRoute.includes("from('epistemic_events')")
  && liturgiaAmvRoute.includes('writeInstitutionalMemory')
  && !liturgiaAmvRoute.includes("from('sfi_amv_memory')")
  && liturgiaAmvRoute.includes('emitEpistemicEvent')
  && !bitacoraRegenerateRoute.includes("from('cognitive_event_stream')")
  && !phenomenologicalCalendarRoute.includes("from('cognitive_event_stream')")
  && !fieldPersistRoute.includes("from('cognitive_event_stream')")
  && !liturgiaAmvRoute.includes("from('cognitive_event_stream')")
  && !phenomenologicalCalendarRoute.includes("from('audits')")
  && !phenomenologicalCalendarRoute.includes("from('actions')")
  && !phenomenologicalCalendarRoute.includes("from('interaction_events')")
  && !liturgiaAmvRoute.includes("from('audits')")
  && !liturgiaAmvRoute.includes("from('actions')")
  && !liturgiaAmvRoute.includes("from('memory_facts')")
  && !liturgiaAmvRoute.includes("from('amv_sessions')")
  && !liturgiaAmvRoute.includes("from('amv_messages')"));

check('Field social drafts use append-only actor ledger instead of missing media_drafts',
  fieldPersistRoute.includes("body.action === 'social_draft'")
  && fieldPersistRoute.includes("eventName: 'SFI_MEDIA_DRAFT_RECORDED'")
  && fieldPersistRoute.includes("sourceType: 'SFI_FIELD_SOCIAL_DRAFT'")
  && fieldPersistRoute.includes("epistemicClass: 'declared'")
  && !fieldPersistRoute.includes("from('media_drafts')"));

check('Field persistence recent runtime status uses bounded rows instead of exact-count probes',
  fieldPersistRoute.includes(".select('id,created_at')")
  && fieldPersistRoute.includes(".limit(100)")
  && !fieldPersistRoute.includes("count: 'exact'"));

check('public global metrics read canonical bounded indicator snapshots instead of absent legacy audits',
  globalMetricsRoute.includes("from('sfi_indicator_snapshots')")
  && globalMetricsRoute.includes(".select('captured_at,ihg,source_status')")
  && globalMetricsRoute.includes('.limit(WINDOW_LIMIT)')
  && globalMetricsRoute.includes("sourceState:")
  && globalMetricsRoute.includes("lastUpdated: observedAt")
  && !globalMetricsRoute.includes("from('audits')")
  && !globalMetricsRoute.includes(".select('*')"));

check('operational snapshot write-return avoids wildcard row transfer',
  !operationalSnapshotRoute.includes(".select('*')"));

check('proposal type filtering remains bounded while preserving legacy nested proposal-type compatibility',
  operationalCommon.includes("const candidateLimit = proposalTypes?.length ? Math.max(limit * 4, 80) : limit")
  && operationalCommon.includes("const proposalType = proposalTypeFrom(row)")
  && operationalCommon.includes("return { data: filtered.slice(0, limit), error: null }")
  && !operationalCommon.includes("query.in('proposal_type', proposalTypes)"));

check('root audit mutation returns only the identifier required for epistemic lineage',
  rootServer.includes(".from('root_audit_events')")
  && rootServer.includes(".select('id')"));

check('Cognitive Lab execution reads use explicit semantic contracts even when up to 500 events are required',
  cognitiveLabService.includes(".select('id,session_key,title,objective,condition,status,technology_nodes,human_nodes,baseline_session_id,metadata,created_by,started_at,ended_at,created_at,updated_at')")
  && cognitiveLabService.includes(".select('id,session_id,event_kind,provenance,actor_key,relation_from,relation_to,payload,evidence_refs,source_ref,occurred_at,created_by,created_at')"));

check('active entitlement reads use canonical sfi_user_entitlements instead of missing legacy licenses',
  entitlementsService.includes("from('sfi_user_entitlements')")
  && !entitlementsService.includes("from('licenses')")
  && nodeBootstrapRoute.includes("from('sfi_user_entitlements')"));

check('MIHM runtime reads canonical field_mihm_readings and understands metrics envelope',
  operationalCommon.includes("from('field_mihm_readings')")
  && operationalCommon.includes("id,case_id,owner_id,status,metrics,tensions,formula_version,evidence_ids,created_at")
  && mihmRuntimeMatrix.includes("const metrics = asRecord(observed.metrics)")
  && !operationalCommon.includes("from('mihm_analyses')"));

check('node bootstrap requests asset summaries without four historical child collections',
  sfiAssetsService.includes("options: { includeHistory?: boolean } = {}")
  && sfiAssetsService.includes("options.includeHistory === false")
  && nodeBootstrapRoute.includes("loadSfiAssets(ctx, { includeHistory: false })"));

check('ScoreFriction measurement mutation returns an explicit DTO instead of the full database row',
  scorefrictionMeasurementRoute.includes(".select('id,asset_id,ihg,nti_obs,ldi_hours,xi_noise,phi_sf,regime,runway_days,measured_at,created_at')")
  && !scorefrictionMeasurementRoute.includes(".insert(measurement).select('*')"));

check('MOPH session persistence projects exactly the rowToSession contract on write-return and read',
  (mophSessionStore.match(/\.select\('id,session_key,consent_state,movement_trace_digest,choices,texts,behavioral_nodes,metrics,public_summary,created_at'\)/g) || []).length === 2
  && !mophSessionStore.includes(".select('*')"));

check('action proposal type contract normalizes new writes without hiding legacy nested proposal types',
  operationalCommon.includes("proposal_type: input.proposalType")
  && operationalCommon.includes("const candidateLimit = proposalTypes?.length ? Math.max(limit * 4, 80) : limit")
  && operationalCommon.includes("const proposalType = proposalTypeFrom(row)")
  && !operationalCommon.includes("query = query.in('proposal_type', proposalTypes)"));

check('actor ownership and bootstrap use canonical actor projection instead of absent legacy nodes',
  actorNodeProjection.includes("from('field_mihm_readings')")
  && productionBackend.includes('readActorNodeProjection')
  && nodeBootstrapRoute.includes('readActorNodeProjection')
  && runtimeBootstrapRoute.includes('readActorNodeProjection')
  && !productionBackend.includes("from('nodes')")
  && !nodeBootstrapRoute.includes("from('nodes')")
  && !runtimeBootstrapRoute.includes("from('nodes')"));

check('node bootstrap does not resurrect absent audit, memory or action stores',
  !nodeBootstrapRoute.includes("from('audits')")
  && !nodeBootstrapRoute.includes("from('memory_facts')")
  && !nodeBootstrapRoute.includes("from('actions')")
  && nodeBootstrapRoute.includes("legacy_state: 'not_recreated'")
  && !nodeBootstrapRoute.includes(".select('*')"));

check('operational latest-row reads are table-typed and explicitly projected',
  operationalCommon.includes("const OPERATIONAL_READ_PROJECTIONS = {")
  && operationalCommon.includes("type OperationalReadTable = keyof typeof OPERATIONAL_READ_PROJECTIONS")
  && operationalCommon.includes("service.from('logbook_mutations').select(OPERATIONAL_READ_PROJECTIONS.logbook_mutations)")
  && operationalCommon.includes("service.from('logbook_knowledge').select(OPERATIONAL_READ_PROJECTIONS.logbook_knowledge)")
  && operationalCommon.includes("service.from('logbook_signals').select(OPERATIONAL_READ_PROJECTIONS.logbook_signals)")
  && operationalCommon.includes("service.from('field_mihm_readings').select(OPERATIONAL_READ_PROJECTIONS.mihm_analyses)")
  && !operationalCommon.includes("service.from(table).select('*')"));

check('mutation write returns use the explicit mutation DTO instead of wildcard hydration',
  mutationProposeRoute.includes(".select('id,event_id,mutation_key,target,current_state,proposed_state,coherence_delta,status,proposal_id,actor_id,mutation_type,payload,created_at,updated_at')")
  && mutationCloseRoute.includes(".select('id,event_id,mutation_key,target,current_state,proposed_state,coherence_delta,status,proposal_id,actor_id,mutation_type,payload,created_at,updated_at')")
  && !mutationProposeRoute.includes(".select('*')")
  && !mutationCloseRoute.includes(".select('*')"));

check('ROOT continuity state uses the schema-backed singleton DTO',
  rootContinuityRoute.includes(".select('id,mode,founder_available,activated_at,expected_return_at,last_heartbeat_at,last_successful_run_at,last_report_at,halt_reason,metadata,updated_at')")
  && !rootContinuityRoute.includes("sfi_continuity_state').select('*')")
  && !rootContinuityRoute.includes("sfi_continuity_state').update(patch).eq('id', 'institution').select('*')"));

check('ROOT sovereign decision queue uses explicit authority-preserving DTOs',
  rootDecisionsRoute.includes(".select('id,proposal_type,title,description,status,expected_field_delta,proportionality_check,outcome,created_at')")
  && rootDecisionsRoute.includes(".select('id,decision_id,situation,rejected_condition,correct_state,general_rule,required_evidence,evidence_refs,status,approved_by,approved_at,created_by,decision_kind,created_at,updated_at')")
  && !rootDecisionsRoute.includes(".select('*')")
  && rootCognitiveTwinRoute.includes(".select('id,decision_id,situation,rejected_condition,correct_state,general_rule,required_evidence,evidence_refs,status,approved_by,approved_at,created_by,decision_kind,created_at,updated_at')")
  && !rootCognitiveTwinRoute.includes(".select('*')"));

check('ROOT evidence uses schema-backed evidence and mutation DTOs without erasing graph compatibility',
  rootEvidenceRoute.includes(".select('id,evidence_hash,actor_id,title,content,evidence_type,target_node_id,payload,epistemic_event_id,created_at')")
  && rootEvidenceRoute.includes(".select('id,event_id,mutation_key,target,current_state,proposed_state,coherence_delta,status,proposal_id,actor_id,mutation_type,payload,created_at,updated_at')")
  && rootEvidenceRoute.includes("from('graph_nodes').upsert")
  && rootEvidenceRoute.includes("from('graph_edges').upsert"));

check('current-main access-critical Neon readers are preserved',
  postgres.includes('readContinuityInstitutionalAccountGrantByEmail')
  && postgres.includes('readContinuityMemberWorkspaceCounts')
  && postgres.includes('readContinuityFieldCaseOwner')
  && postgres.includes('readContinuityStudioObjectOwner'));

check('shared continuity SQL handle exists without second connector',
  postgres.includes('export function continuityDatabase()')
  && postgres.includes('return db()'));

check('actionable work gate reads Neon only after primary failure',
  gate.includes('readNeonActionableWorkSnapshot')
  && gate.includes("dataPlane: 'NEON'")
  && gate.indexOf('if (readError || missingContinuityState)') < gate.indexOf('const fallback = await readNeonActionableWorkSnapshot()'));

check('Neon Data API infrastructure contract binds institutional JWKS to the bounded service role',
  neonDataPlaneGovernor.includes('auth_provider=external')
  && neonDataPlaneGovernor.includes('https://www.systemfriction.org/api/system/data-plane/jwks')
  && neonDataPlaneGovernor.includes('audience=sfi-neon-data-api')
  && neonDataPlaneGovernor.includes('grant sfi_continuity_service to authenticator'));

check('transparent failover resolves the canonical Neon Data API endpoint instead of requiring a duplicate environment variable',
  dataPlaneConfig.includes('DEFAULT_SFI_NEON_DATA_API_URL')
  && dataPlaneFetch.includes("import('@/lib/persistence/dataPlaneConfig')")
  && dataPlaneFetch.includes('sfiNeonDataApiUrl')
  && !dataPlaneFetch.includes("(process.env.SFI_NEON_DATA_API_URL || '').trim()"));

check('heartbeat observes Supabase Storage independently from DB REST and Neon continuity',
  dataPlaneRpc.includes('export async function probePrimaryStoragePlane')
  && dataPlaneRpc.includes('/storage/v1/bucket/field-evidence')
  && runtime.includes('primaryStorageProbe')
  && hourlyContinuity.includes('primaryStorageProbe'));

check('heartbeat distinguishes Neon REST authentication from direct Neon SQL continuity',
  dataPlaneRpc.includes('export async function probeNeonDataPlane')
  && dataPlaneRpc.includes('SFI_NEON_DATA_API_JWKS_MISMATCH')
  && dataPlaneRpc.includes('mintSfiDataPlaneServiceJwt()')
  && runtime.includes('continuityRestProbe'));

check('heartbeat determines physical primary provenance with a direct non-fallback probe before trusting transparent client results',
  dataPlaneRpc.includes('export async function probePrimaryDataPlane')
  && runtime.includes("import('@/lib/persistence/dataPlaneRpc')")
  && runtime.includes('probePrimaryDataPlane')
  && runtime.includes('primaryPhysicalProbe')
  && runtime.includes("dataPlane = 'NEON'"));

check('continuity recovery is owned by the existing heartbeat and only attempted after a direct healthy primary probe',
  continuityRecovery.includes('export async function recoverPrimaryDataPlane')
  && runtime.includes("import('@/lib/persistence/continuityRecovery')")
  && runtime.includes('recoverPrimaryDataPlane')
  && runtime.includes('primaryPhysicalProbe.ok')
  && runtime.includes('recoveryAttempt'));

check('heartbeat persists run/check/incident/state to Neon fallback',
  store.includes('createNeonContinuityRun')
  && store.includes('insertNeonContinuityHealthChecks')
  && store.includes('insertNeonContinuityIncidents')
  && store.includes('finalizeNeonContinuityRun')
  && store.includes('updateNeonContinuityState')
  && runtime.includes("dataPlane = 'NEON'")
  && runtime.includes('readNeonContinuityHeartbeatState'));

check('continuity dashboard observes and resolves primary plus authorized Neon continuity plane',
  store.includes('readNeonContinuityObservation')
  && runtime.includes('readNeonContinuityObservation')
  && runtime.includes('planeComparison')
  && runtime.includes('divergenceObserved')
  && runtime.includes('PRIMARY_CANONICAL_CONTINUITY_STATE_SELECTED')
  && runtime.includes('AUTHORIZED_CONTINUITY_PLANE_SELECTED_BECAUSE_PRIMARY_IS_UNAVAILABLE_DEGRADED_OR_OLDER'));

check('Cognitive Twin canonical memory falls back to Neon only after primary read failure and restarts on one plane',
  postgres.includes('readContinuityCanonicalCognitiveTwinMemoryRows')
  && canonicalTwinMemory.includes('readContinuityCanonicalCognitiveTwinMemoryRows')
  && canonicalTwinMemory.includes("readPlane = 'NEON'")
  && canonicalTwinMemory.includes('latestByKey.clear()')
  && canonicalTwinMemory.includes('seenKeys.clear()'));

check('Cognitive Twin runtime state falls back to bounded Neon snapshot after primary read failure',
  postgres.includes('readContinuityCognitiveTwinStateSnapshot')
  && twinState.includes('readContinuityCognitiveTwinStateSnapshot')
  && twinState.includes("runtimeReadPlane = 'NEON'")
  && twinState.includes('primaryRuntimeErrors.length && isSfiContinuityConfigured()'));

check('AMV operational memory falls back to bounded Neon memory after primary read failure',
  postgres.includes('readContinuityAmvMemory')
  && amvAgent.includes('readContinuityAmvMemory')
  && amvAgent.includes("readPlane: 'NEON' as const")
  && amvAgent.includes('primary_diagnostic'));

check('scheduled egress guard requires explicit continuity opt-in',
  guard.includes('allowContinuityFallback?: boolean')
  && guard.includes('input.allowContinuityFallback && isSfiContinuityConfigured()'));


check('primary mirror maintenance is owned by the existing continuity heartbeat',
  primaryMirror.includes('export async function flushPrimaryMirror')
  && runtime.includes("import('@/lib/persistence/primaryMirror')")
  && runtime.includes('flushPrimaryMirror')
  && runtime.includes('primaryMirror'));

check('idle wakeup cannot suppress required data-plane mirror certification maintenance',
  gate.includes("import('@/lib/persistence/dataPlaneContinuityStore')")
  && gate.includes('mirrorMaintenanceRequired')
  && gate.includes('DATA_PLANE_MIRROR_MAINTENANCE_REQUIRED'));

check('existing half-hour continuity scheduler is sufficient for the two-hour mirror freshness gate',
  hourlyContinuity.includes("cron: '15 * * * *'")
  && hourlyContinuity.includes("cron: '45 * * * *'"));

check('continuity heartbeat is the explicit scheduled fallback caller',
  heartbeat.includes('scheduledEgressGuardResponse({ allowContinuityFallback: true })'));

for (const route of [
  'src/app/api/cron/notas-temporales/route.ts',
  'src/app/api/cron/predictive-engine/route.ts',
  'src/app/api/cron/sfi-indicators/route.ts',
  'src/app/api/cron/worldspect/route.ts',
  'src/app/api/cron/world-observatory/route.ts',
  'src/app/api/cron/continuity-report/route.ts',
  'src/app/api/cron/sfi-institutional-cycle/route.ts',
]) {
  const source = read(route);
  check(`${route} remains fail-closed while scheduled egress is restricted`,
    source.includes('scheduledEgressGuardResponse()')
    && !source.includes('allowContinuityFallback: true'));
}

check('restricted probe responses are not reported as operational',
  runtime.includes("payload?.status === 'EGRESS_RESTRICTED'")
  && runtime.includes("errorCode: 'scheduled_egress_restricted'"));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} · ${item.name}`);
if (failed.length) {
  console.error(`\nNeon continuity heartbeat QA failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nNeon continuity heartbeat QA passed: ${checks.length}/${checks.length}`);
