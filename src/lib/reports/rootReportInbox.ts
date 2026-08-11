import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { getLlmProviderStatus } from '@/lib/ai/providerRouter';

export type RootReportCategory = 'world' | 'internal' | 'prospects' | 'attractor' | 'evidence' | 'drafts' | 'other';
export type RootReportCadence = 'daily' | 'weekly' | 'event' | 'manual' | 'unknown';

export type RootReportInboxItem = {
  id: string;
  source: 'report_agent' | 'prospect_radar' | 'continuity';
  sourceTable: string;
  category: RootReportCategory;
  cadence: RootReportCadence;
  scheduleKey: string | null;
  reportType: string;
  title: string;
  body: string;
  status: string;
  createdAt: string | null;
  provider: string | null;
  model: string | null;
  evidence: string[];
  warnings: string[];
  trace: Record<string, unknown>;
  approvalQueue: Record<string, unknown>;
  metadata: Record<string, unknown>;
};

export type RootReportInbox = {
  generatedAt: string;
  items: RootReportInboxItem[];
  warnings: string[];
  counts: Record<RootReportCategory | 'total', number>;
};

export type ScheduledReportLane = {
  key: 'world_daily' | 'world_weekly' | 'internal_daily' | 'prospect_weekly' | 'attractor_daily';
  cadence: 'daily' | 'weekly';
  label: string;
  lastGeneratedAt: string | null;
  lastStatus: string | null;
  currentPeriodPresent: boolean;
  state: 'CURRENT' | 'CURRENT_BLOCKED' | 'MISSING_CURRENT_PERIOD' | 'NEVER_GENERATED';
};

export type RootReportHealth = {
  generatedAt: string;
  inboxReadable: boolean;
  totalReports: number;
  latestReportAt: string | null;
  providers: Array<{ id: string; available: boolean; model?: string | null }>;
  lanes: ScheduledReportLane[];
  warnings: string[];
};

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}
function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}
function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))];
}
function iso(value: unknown): string | null {
  const candidate = text(value);
  if (!candidate) return null;
  const parsed = new Date(candidate);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : candidate;
}

function mexicoParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
  return {
    dateKey: `${pick('year')}-${pick('month')}-${pick('day')}`,
    weekday: pick('weekday').toLowerCase(),
  };
}

function isoWeekKey(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  const target = new Date(date);
  const day = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / 604_800_000);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function categoryFrom(type: string, scheduleKey: string | null, objective: string): RootReportCategory {
  const value = `${type} ${scheduleKey ?? ''} ${objective}`.toLowerCase();
  if (value.includes('prospect') || value.includes('ifnorm') || value.includes('client')) return 'prospects';
  if (value.includes('attractor')) return 'attractor';
  if (value.includes('world')) return 'world';
  if (value.includes('evidence') || value.includes('graph')) return 'evidence';
  if (value.includes('draft') || value.includes('linkedin') || value.includes('contact')) return 'drafts';
  if (value.includes('internal') || value.includes('calibration') || value.includes('continuity') || value.includes('institution')) return 'internal';
  return 'other';
}

function cadenceFrom(scheduleKey: string | null, value: unknown): RootReportCadence {
  const explicit = text(value).toLowerCase();
  if (explicit === 'daily' || explicit === 'weekly' || explicit === 'event' || explicit === 'manual') return explicit;
  if (scheduleKey?.includes('daily')) return 'daily';
  if (scheduleKey?.includes('weekly')) return 'weekly';
  return scheduleKey ? 'unknown' : 'manual';
}

function normalizeAgentRun(input: Row): RootReportInboxItem {
  const output = row(input.output_envelope);
  const snapshot = row(input.input_snapshot);
  const schedule = row(snapshot.schedule);
  const scheduleKey = text(snapshot.scheduleKey ?? schedule.key) || null;
  const type = text(output.type ?? snapshot.reportType, 'report');
  const objective = text(input.objective, 'Reporte');
  return {
    id: text(input.id, `report:${text(input.task_id, crypto.randomUUID())}`),
    source: 'report_agent',
    sourceTable: 'sfi_cognitive_twin_runs',
    category: categoryFrom(type, scheduleKey, objective),
    cadence: cadenceFrom(scheduleKey, schedule.cadence),
    scheduleKey,
    reportType: type,
    title: text(output.title, objective),
    body: text(output.body, 'MISSING · el run no contiene body legible.'),
    status: text(input.status, 'UNKNOWN'),
    createdAt: iso(input.created_at ?? input.finished_at ?? input.started_at),
    provider: text(input.provider ?? output.provider) || null,
    model: text(input.model) || null,
    evidence: unique([...strings(output.evidence), ...strings(input.evidence_refs)]),
    warnings: unique([...strings(output.warnings), ...strings(input.limitations)]),
    trace: row(output.trace),
    approvalQueue: row(output.approval_queue),
    metadata: { taskId: input.task_id ?? null, objective, inputSnapshot: snapshot },
  };
}

function normalizeProspect(input: Row, sourceRows: Row[], runRows: Row[]): RootReportInboxItem {
  const runId = text(input.run_id);
  const fit = row(input.sfi_fit);
  const window = row(input.critical_window);
  const contact = row(input.contact);
  const payload = row(input.payload);
  const sources = sourceRows.filter((item) => text(item.run_id) === runId);
  const run = runRows.find((item) => text(item.id) === runId) ?? {};
  const evidence = unique(sources.map((item) => text(item.url)));
  const company = text(input.company_name, 'Prospecto no identificado');
  const body = [
    `EMPRESA / ENTIDAD\n${company}`,
    `\nDOLOR OBSERVADO\n${text(input.pain_statement, 'MISSING')}`,
    `\nVENTANA CRÍTICA / PROYECTADA\n${text(window.startDate ?? window.start_date, '—')} → ${text(window.endDate ?? window.end_date, '—')}`,
    `\nENCAJE SFI\n${text(fit.offerId ?? fit.offer_id, '—')} · ${text(fit.offerName ?? fit.offer_name, '')}`,
    `\nCONTACTO\n${contact.verified === true ? text(contact.role, 'verificado') : 'No verificado; no inferir nombre ni correo.'}`,
    `\nPROPUESTA\n${text(input.proposal_document, 'MISSING')}`,
  ].join('');
  return {
    id: text(input.id, `prospect:${runId}`),
    source: 'prospect_radar',
    sourceTable: 'prospect_opportunity_reports',
    category: 'prospects',
    cadence: text(payload.scheduleCadence).toLowerCase() === 'weekly' ? 'weekly' : 'event',
    scheduleKey: text(payload.scheduleKey) || null,
    reportType: 'prospect_radar',
    title: `Prospect Radar · ${company}`,
    body,
    status: text(input.epistemic_status, 'projected_not_validated'),
    createdAt: iso(input.created_at),
    provider: text(run.search_provider ?? payload.provider) || null,
    model: null,
    evidence,
    warnings: unique([...strings(payload.limitations), ...strings(run.warnings)]),
    trace: { runId, sourceCount: sources.length, confidence: input.confidence ?? null },
    approvalQueue: { approval_required: true, action: 'review_before_contact', status: 'queued_for_approval' },
    metadata: { sector: input.sector ?? null, region: input.region ?? null, confidence: input.confidence ?? null, researchRun: { id: runId, mode: run.mode ?? null, searchProvider: run.search_provider ?? null, queryPlan: run.query_plan ?? [], status: run.status ?? null }, payload },
  };
}

function normalizeContinuity(input: Row): RootReportInboxItem {
  return {
    id: text(input.id, `continuity:${text(input.period_end, crypto.randomUUID())}`),
    source: 'continuity',
    sourceTable: 'sfi_continuity_reports',
    category: 'internal',
    cadence: 'daily',
    scheduleKey: 'continuity_daily',
    reportType: 'continuity_daily',
    title: `Continuidad institucional · ${text(input.mode, 'UNKNOWN')}`,
    body: text(input.content, JSON.stringify(input.summary ?? {}, null, 2)),
    status: 'OBSERVED_INTERNAL_REPORT',
    createdAt: iso(input.created_at ?? input.period_end),
    provider: 'deterministic:continuity-runtime',
    model: null,
    evidence: [],
    warnings: [],
    trace: { periodStart: input.period_start ?? null, periodEnd: input.period_end ?? null },
    approvalQueue: {},
    metadata: { summary: input.summary ?? {}, mode: input.mode ?? null },
  };
}

export async function readRootReportInbox(limit = 240): Promise<RootReportInbox> {
  const db = createServiceSupabaseClient();
  const [agentRuns, prospectReports, prospectSources, prospectRuns, continuityReports] = await Promise.all([
    db.from('sfi_cognitive_twin_runs')
      .select('id,task_id,status,objective,input_snapshot,output_envelope,evidence_refs,limitations,provider,model,started_at,finished_at,created_at')
      .eq('role', 'report_agent')
      .order('created_at', { ascending: false })
      .limit(limit),
    db.from('prospect_opportunity_reports')
      .select('id,run_id,company_name,sector,region,pain_statement,critical_window,sfi_fit,contact,proposal_document,confidence,epistemic_status,payload,created_at')
      .order('created_at', { ascending: false })
      .limit(80),
    db.from('prospect_research_sources')
      .select('run_id,url,title,publisher,reliability,created_at')
      .order('created_at', { ascending: false })
      .limit(400),
    db.from('prospect_research_runs')
      .select('id,mode,status,search_provider,query_plan,warnings,created_at,completed_at')
      .order('created_at', { ascending: false })
      .limit(100),
    db.from('sfi_continuity_reports')
      .select('id,period_start,period_end,mode,summary,content,created_at')
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  const warnings = unique([
    agentRuns.error ? `sfi_cognitive_twin_runs:${agentRuns.error.message}` : null,
    prospectReports.error ? `prospect_opportunity_reports:${prospectReports.error.message}` : null,
    prospectSources.error ? `prospect_research_sources:${prospectSources.error.message}` : null,
    prospectRuns.error ? `prospect_research_runs:${prospectRuns.error.message}` : null,
    continuityReports.error ? `sfi_continuity_reports:${continuityReports.error.message}` : null,
  ]);
  const sourceRows = rows(prospectSources.data);
  const runRows = rows(prospectRuns.data);
  const items = [
    ...rows(agentRuns.data).map(normalizeAgentRun),
    ...rows(prospectReports.data).map((item) => normalizeProspect(item, sourceRows, runRows)),
    ...rows(continuityReports.data).map(normalizeContinuity),
  ]
    .sort((a, b) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''))
    .slice(0, limit);

  const categories: RootReportCategory[] = ['world', 'internal', 'prospects', 'attractor', 'evidence', 'drafts', 'other'];
  const counts = Object.fromEntries(categories.map((category) => [category, items.filter((item) => item.category === category).length])) as Record<RootReportCategory, number>;

  return {
    generatedAt: new Date().toISOString(),
    items,
    warnings,
    counts: { total: items.length, ...counts },
  };
}

function currentTaskId(key: ScheduledReportLane['key'], dateKey: string, weekKey: string) {
  const period = key.includes('weekly') ? weekKey : dateKey;
  return `scheduled-report:${key}:${period}`;
}

export async function readRootReportHealth(existingInbox?: RootReportInbox): Promise<RootReportHealth> {
  const inbox = existingInbox ?? await readRootReportInbox(260);
  const { dateKey } = mexicoParts();
  const weekKey = isoWeekKey(dateKey);
  const laneDefs: Array<Pick<ScheduledReportLane, 'key' | 'cadence' | 'label'>> = [
    { key: 'world_daily', cadence: 'daily', label: 'Mundo · diario' },
    { key: 'world_weekly', cadence: 'weekly', label: 'Mundo · semanal' },
    { key: 'internal_daily', cadence: 'daily', label: 'SFI interno · diario' },
    { key: 'prospect_weekly', cadence: 'weekly', label: 'Prospectos · semanal' },
    { key: 'attractor_daily', cadence: 'daily', label: 'Atractor institucional · diario' },
  ];

  const lanes = laneDefs.map((definition): ScheduledReportLane => {
    const laneItems = inbox.items.filter((item) => item.scheduleKey === definition.key);
    const latest = laneItems[0] ?? null;
    const expectedTaskId = currentTaskId(definition.key, dateKey, weekKey);
    const current = laneItems.find((item) => text(item.metadata.taskId) === expectedTaskId) ?? null;
    const currentPeriodPresent = Boolean(current);
    const blocked = Boolean(current && ['BLOCKED', 'FAILED', 'REJECTED'].includes(current.status.toUpperCase()));
    return {
      ...definition,
      lastGeneratedAt: latest?.createdAt ?? null,
      lastStatus: latest?.status ?? null,
      currentPeriodPresent,
      state: currentPeriodPresent ? (blocked ? 'CURRENT_BLOCKED' : 'CURRENT') : latest ? 'MISSING_CURRENT_PERIOD' : 'NEVER_GENERATED',
    };
  });

  const providers = getLlmProviderStatus().map((item) => ({ id: item.id, available: item.available, model: item.model || null }));
  return {
    generatedAt: new Date().toISOString(),
    inboxReadable: !inbox.warnings.some((warning) => warning.startsWith('sfi_cognitive_twin_runs:')),
    totalReports: inbox.items.length,
    latestReportAt: inbox.items[0]?.createdAt ?? null,
    providers,
    lanes,
    warnings: inbox.warnings,
  };
}
