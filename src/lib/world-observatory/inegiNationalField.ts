import 'server-only';

import { createHash } from 'node:crypto';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const INEGI_NATIONAL_FIELD_VERSION = 'SFI-INEGI-NATIONAL-2026.08.1';

export type InegiIndicatorSpec = {
  key: string;
  indicatorId: string;
  label: string;
  geography: string;
  source: 'BISE' | 'BIE';
  affectedSystems: string[];
  actors: string[];
  scenarioIds: string[];
};

export const INEGI_NATIONAL_SCENARIOS = [
  {
    id: 'MEX-LABOR-01',
    label: 'Trabajo, informalidad y transición ocupacional',
    question: '¿Qué configuraciones laborales persisten, se desplazan o divergen entre entidades y cohortes?',
    lanes: ['API_INDICATORS', 'ENOE_MICRODATA'],
  },
  {
    id: 'MEX-HOUSEHOLD-01',
    label: 'Presión sobre hogares',
    question: '¿Dónde divergen ingreso, gasto, precios y capacidad material de los hogares?',
    lanes: ['API_INDICATORS', 'ENIGH_MICRODATA', 'INPC'],
  },
  {
    id: 'MEX-PRODUCTIVE-01',
    label: 'Estructura productiva territorial',
    question: '¿Cómo cambia la densidad, composición y concentración de unidades económicas por territorio?',
    lanes: ['DENUE_API', 'CENSOS_ECONOMICOS'],
  },
  {
    id: 'MEX-SECURITY-01',
    label: 'Seguridad, victimización y confianza institucional',
    question: '¿Dónde divergen incidencia, percepción, denuncia y confianza en instituciones?',
    lanes: ['ENVIPE_MICRODATA', 'ENSU', 'GOVERNMENT_STATISTICS'],
  },
  {
    id: 'MEX-TERRITORY-01',
    label: 'Territorio, demografía y acceso',
    question: '¿Qué cambios demográficos y territoriales alteran acceso, concentración y dependencia regional?',
    lanes: ['API_INDICATORS', 'CENSUS', 'GEOSTATISTICAL_DATA', 'DENUE_API'],
  },
  {
    id: 'MEX-WELLBEING-01',
    label: 'Bienestar observado y condiciones materiales',
    question: '¿Dónde convergen o se contradicen bienestar reportado y condiciones económicas observables?',
    lanes: ['ENBIARE', 'ENIGH_MICRODATA', 'API_INDICATORS'],
  },
] as const;

const DEFAULT_INDICATORS: InegiIndicatorSpec[] = [
  {
    key: 'population_total',
    indicatorId: '1002000001',
    label: 'Población total',
    geography: '00',
    source: 'BISE',
    affectedSystems: ['population', 'territory', 'public_services'],
    actors: ['households', 'government'],
    scenarioIds: ['MEX-TERRITORY-01'],
  },
];

const STATE_CODES = Array.from({ length: 32 }, (_, index) => String(index + 1).padStart(2, '0'));
const INDICATORS_DOC_URL = 'https://www.inegi.org.mx/servicios/api_indicadores.html';
const DENUE_DOC_URL = 'https://www.inegi.org.mx/servicios/api_denue.html';

type Row = Record<string, unknown>;

type NationalObservation = {
  sourceId: string;
  sourceFamily: string;
  publisher: string;
  observationKind: string;
  externalId: string;
  title: string;
  summary: string | null;
  observedAt: string | null;
  releasedAt: string | null;
  countryCodes: string[];
  actors: string[];
  affectedSystems: string[];
  payload: Row;
  sourceUrl: string;
  confidence: number;
};

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.map(record).filter((row) => Object.keys(row).length > 0) : [];
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replaceAll(',', ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function hash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function parseInegiDate(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) {
    const parsed = new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]), 12));
    return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
  }
  const parsed = new Date(raw);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function referencePeriodEnd(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  const year = raw.match(/^(\d{4})$/);
  if (year) return new Date(Date.UTC(Number(year[1]), 11, 31, 23, 59, 59, 999)).toISOString();

  const month = raw.match(/^(\d{4})[-/]([01]?\d)$/);
  if (month) return new Date(Date.UTC(Number(month[1]), Number(month[2]), 0, 23, 59, 59, 999)).toISOString();

  const quarter = raw.match(/^(\d{4})[-/ ]?(?:Q|T|TRIM(?:ESTRE)?)[ -]?([1-4])$/i);
  if (quarter) return new Date(Date.UTC(Number(quarter[1]), Number(quarter[2]) * 3, 0, 23, 59, 59, 999)).toISOString();

  return null;
}

function configuredIndicatorSpecs(): InegiIndicatorSpec[] {
  const raw = process.env.INEGI_INDICATOR_MANIFEST_JSON;
  if (!raw) return DEFAULT_INDICATORS;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_INDICATORS;
    const custom = parsed.flatMap((item): InegiIndicatorSpec[] => {
      const row = record(item);
      const indicatorId = text(row.indicatorId);
      const key = text(row.key);
      const label = text(row.label);
      if (!indicatorId || !key || !label) return [];
      return [{
        key,
        indicatorId,
        label,
        geography: text(row.geography) ?? '00',
        source: row.source === 'BIE' ? 'BIE' : 'BISE',
        affectedSystems: Array.isArray(row.affectedSystems) ? row.affectedSystems.map(String) : [],
        actors: Array.isArray(row.actors) ? row.actors.map(String) : [],
        scenarioIds: Array.isArray(row.scenarioIds) ? row.scenarioIds.map(String) : [],
      }];
    });
    return custom.length ? custom : DEFAULT_INDICATORS;
  } catch {
    return DEFAULT_INDICATORS;
  }
}

function indicatorsToken() {
  return process.env.INEGI_INDICATORS_TOKEN ?? process.env.INEGI_API_TOKEN ?? null;
}

function denueToken() {
  return process.env.INEGI_DENUE_TOKEN ?? process.env.INEGI_API_TOKEN ?? null;
}

async function fetchJson(url: string, timeoutMs = 20_000): Promise<unknown> {
  const response = await fetch(url, {
    cache: 'no-store',
    headers: { 'user-agent': 'SystemFrictionInstitute/INEGI-National-Field' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`INEGI_HTTP_${response.status}`);
  return response.json();
}

function indicatorUrl(spec: InegiIndicatorSpec, token: string) {
  return `https://www.inegi.org.mx/app/api/indicadores/desarrolladores/jsonxml/INDICATOR/${encodeURIComponent(spec.indicatorId)}/es/${encodeURIComponent(spec.geography)}/false/${spec.source}/2.0/${encodeURIComponent(token)}?type=json`;
}

async function collectIndicator(spec: InegiIndicatorSpec, token: string): Promise<NationalObservation[]> {
  const payload = record(await fetchJson(indicatorUrl(spec, token)));
  const series = rows(payload.Series)[0] ?? {};
  const observations = rows(series.OBSERVATIONS);
  const releasedAt = parseInegiDate(series.LASTUPDATE);

  return observations.flatMap((observation) => {
    const period = text(observation.TIME_PERIOD);
    const value = numberValue(observation.OBS_VALUE);
    if (!period || value === null) return [];
    const geo = text(observation.COBER_GEO) ?? spec.geography;
    const raw = {
      indicatorId: spec.indicatorId,
      indicatorKey: spec.key,
      referencePeriod: period,
      value,
      unit: series.UNIT ?? null,
      frequency: series.FREQ ?? null,
      topic: series.TOPIC ?? null,
      source: series.SOURCE ?? spec.source,
      observationStatus: observation.OBS_STATUS ?? null,
      observationException: observation.OBS_EXCEPTION ?? null,
      observationSource: observation.OBS_SOURCE ?? null,
      observationNote: observation.OBS_NOTE ?? null,
      geography: geo,
      scenarioIds: spec.scenarioIds,
      knowledgeBoundary: {
        referenceAt: referencePeriodEnd(period),
        releasedAt,
        ingestionDoesNotBackdateKnowledge: true,
      },
    };
    return [{
      sourceId: 'inegi-indicators',
      sourceFamily: 'official_statistics',
      publisher: 'INEGI',
      observationKind: 'statistical_series_point',
      externalId: `indicator:${spec.indicatorId}:${geo}:${period}`,
      title: `${spec.label} · ${geo} · ${period}`,
      summary: `${spec.label}: ${value}${text(series.UNIT) ? ` ${text(series.UNIT)}` : ''}`,
      observedAt: referencePeriodEnd(period),
      releasedAt,
      countryCodes: ['MX'],
      actors: spec.actors,
      affectedSystems: spec.affectedSystems,
      payload: raw,
      sourceUrl: INDICATORS_DOC_URL,
      confidence: 0.98,
    } satisfies NationalObservation];
  });
}

function denueValue(row: Row, patterns: RegExp[], fallbackIndex: number): unknown {
  for (const [key, value] of Object.entries(row)) {
    if (patterns.some((pattern) => pattern.test(key))) return value;
  }
  return Object.values(row)[fallbackIndex];
}

async function collectDenueStateCounts(token: string): Promise<NationalObservation[]> {
  const areas = STATE_CODES.join(',');
  const url = `https://www.inegi.org.mx/app/api/denue/v1/consulta/Cuantificar/0/${areas}/0/${encodeURIComponent(token)}`;
  const fetchedAt = new Date().toISOString();
  const responseRows = rows(await fetchJson(url));

  return responseRows.flatMap((row) => {
    const activity = text(denueValue(row, [/actividad/i, /^ae$/i, /id.*act/i], 0)) ?? '0';
    const area = text(denueValue(row, [/area/i, /^ag$/i, /geo/i], 1));
    const total = numberValue(denueValue(row, [/total/i, /establec/i], 2));
    if (!area || total === null) return [];
    const payload = {
      activity,
      geographicArea: area,
      establishmentCount: total,
      stratum: '0',
      raw: row,
      scenarioIds: ['MEX-PRODUCTIVE-01', 'MEX-TERRITORY-01'],
      knowledgeBoundary: {
        currentSnapshot: true,
        releasedAt: fetchedAt,
        ingestionDoesNotBackdateKnowledge: true,
      },
    };
    return [{
      sourceId: 'inegi-denue',
      sourceFamily: 'official_economic_directory',
      publisher: 'INEGI',
      observationKind: 'establishment_count_snapshot',
      externalId: `denue:count:${activity}:${area}:stratum:0`,
      title: `DENUE · establecimientos · ${area}`,
      summary: `${total} establecimientos observados en el corte DENUE consultado`,
      observedAt: fetchedAt,
      releasedAt: fetchedAt,
      countryCodes: ['MX'],
      actors: ['businesses', 'workers', 'local_government'],
      affectedSystems: ['economic_structure', 'employment', 'territory', 'business_ecology'],
      payload,
      sourceUrl: DENUE_DOC_URL,
      confidence: 0.98,
    } satisfies NationalObservation];
  });
}

async function persistObservations(observations: NationalObservation[]) {
  const db = createServiceSupabaseClient();
  let persisted = 0;
  const failures: string[] = [];

  for (const observation of observations) {
    const rawHash = hash(observation.payload);
    const result = await db.from('world_source_observations').upsert({
      source_id: observation.sourceId,
      source_family: observation.sourceFamily,
      publisher: observation.publisher,
      observation_kind: observation.observationKind,
      external_id: observation.externalId,
      title: observation.title,
      summary: observation.summary,
      observed_at: observation.observedAt,
      released_at: observation.releasedAt,
      latitude: null,
      longitude: null,
      country_codes: observation.countryCodes,
      actors: observation.actors,
      affected_systems: observation.affectedSystems,
      payload: observation.payload,
      raw_hash: rawHash,
      source_url: observation.sourceUrl,
      collector_version: INEGI_NATIONAL_FIELD_VERSION,
      confidence: observation.confidence,
    }, { onConflict: 'source_id,external_id,raw_hash' }).select('id').maybeSingle();
    if (result.error) failures.push(`${observation.externalId}:${result.error.message}`);
    else if (result.data) persisted += 1;
  }

  return { persisted, failures };
}

export function readInegiNationalFieldConfiguration() {
  const indicatorSpecs = configuredIndicatorSpecs();
  return {
    version: INEGI_NATIONAL_FIELD_VERSION,
    indicatorsConfigured: Boolean(indicatorsToken()),
    denueConfigured: Boolean(denueToken()),
    indicatorManifest: indicatorSpecs.map((item) => ({ ...item, token: undefined })),
    scenarios: INEGI_NATIONAL_SCENARIOS,
    microdata: {
      policy: 'BATCH_AGGREGATION_ONLY',
      rawPersonLevelEmbedding: false,
      required: ['survey weights', 'data dictionary', 'geographic grain', 'reference period', 'release/acquisition time', 'provenance'],
      plannedPrograms: ['ENOE', 'ENIGH', 'ENVIPE'],
    },
    epistemicBoundary: 'INEGI records are imported evidence. They do not become friction readings, causal claims, hypotheses or canonical Cognitive Twin memory automatically.',
  };
}

export async function ingestInegiNationalField(input?: { includeStates?: boolean; includeDenue?: boolean }) {
  const specs = configuredIndicatorSpecs();
  const indicatorKey = indicatorsToken();
  const denueKey = denueToken();
  const warnings: string[] = [];
  const collected: NationalObservation[] = [];

  if (indicatorKey) {
    const expanded = input?.includeStates
      ? specs.flatMap((spec) => spec.geography === '00'
        ? [spec, ...STATE_CODES.map((geography) => ({ ...spec, geography }))]
        : [spec])
      : specs;
    const settled = await Promise.allSettled(expanded.map((spec) => collectIndicator(spec, indicatorKey)));
    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') collected.push(...result.value);
      else warnings.push(`indicator:${expanded[index].key}:${expanded[index].geography}:${String(result.reason)}`);
    });
  } else {
    warnings.push('INEGI_INDICATORS_TOKEN_MISSING');
  }

  if (input?.includeDenue) {
    if (denueKey) {
      try {
        collected.push(...await collectDenueStateCounts(denueKey));
      } catch (error) {
        warnings.push(`denue:${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      warnings.push('INEGI_DENUE_TOKEN_MISSING');
    }
  }

  const persistence = await persistObservations(collected);
  return {
    ok: persistence.failures.length === 0 && collected.length > 0,
    collected: collected.length,
    persisted: persistence.persisted,
    warnings: [...warnings, ...persistence.failures],
    sources: Array.from(new Set(collected.map((item) => item.sourceId))),
    generatedAt: new Date().toISOString(),
    epistemicClass: 'IMPORTED',
    noAutomaticFrictionReading: true,
    noAutomaticHypothesisPromotion: true,
  };
}
