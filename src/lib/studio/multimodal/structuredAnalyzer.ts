import 'server-only';

import type { StudioGenericFeature, StudioModality } from './types';
import { StudioMultimodalError } from './types';

type Row = Record<string, unknown>;

function decode(bytes: Buffer) {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes).replace(/\u0000/g, '').trim();
}

function parseDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      cells.push(value.trim());
      value = '';
    } else {
      value += character;
    }
  }
  cells.push(value.trim());
  return cells;
}

function parseDelimited(text: string, delimiter: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const headers = parseDelimitedLine(lines[0], delimiter).map((header, index) => header || `column_${index + 1}`);
  return lines.slice(1).map((line) => {
    const cells = parseDelimitedLine(line, delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? null]));
  });
}

function toRows(bytes: Buffer, extension: string): Row[] {
  const text = decode(bytes);
  if (extension === 'json') {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (Array.isArray(parsed)) return parsed.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item));
      if (parsed && typeof parsed === 'object') {
        const record = parsed as Row;
        const candidate = Object.values(record).find((value) => Array.isArray(value));
        if (Array.isArray(candidate)) return candidate.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item));
        return [record];
      }
      return [];
    } catch (error) {
      throw new StudioMultimodalError('DOCUMENT_PARSE_FAILED', 'Structured JSON is invalid.', 422, {
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }
  if (extension === 'csv') return parseDelimited(text, ',');
  if (extension === 'tsv') return parseDelimited(text, '\t');
  return text.split(/\r?\n/).filter(Boolean).map((line, index) => ({ index, text: line }));
}

function keyValue(row: Row, candidates: string[]) {
  const match = Object.entries(row).find(([key]) => candidates.includes(key.toLowerCase()));
  return match?.[1] ?? null;
}

function stringValue(value: unknown) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function normalizedMessage(value: string) {
  return value.toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

function topTerms(texts: string[]) {
  const stop = new Set(['the','and','for','que','con','por','para','una','uno','los','las','del','this','that','from','como','pero','sin']);
  const counts = new Map<string, number>();
  texts.join(' ').toLocaleLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.forEach((token) => {
    if (token.length < 3 || stop.has(token)) return;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([term, count]) => ({ term, count }));
}

function parseDate(value: unknown) {
  const text = stringValue(value);
  if (!text) return null;
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

export function analyzeStructuredStudioObject(bytes: Buffer, extension: string, modality: 'community' | 'time_coordinate') {
  const rows = toRows(bytes, extension).slice(0, 100_000);
  const source = `studio_${modality}:structured_records_v1`;
  if (!rows.length) throw new StudioMultimodalError('DOCUMENT_PARSE_FAILED', 'Structured object contains no records.', 422, { modality });

  if (modality === 'community') {
    const participantCandidates = ['participant','participant_id','user','user_id','author','sender','member','name','email'];
    const messageCandidates = ['message','text','content','body','comment','observation','statement'];
    const timestampCandidates = ['timestamp','created_at','observed_at','date','time','datetime'];
    const participants = rows.map((row) => stringValue(keyValue(row, participantCandidates))).filter((value): value is string => Boolean(value));
    const messages = rows.map((row) => stringValue(keyValue(row, messageCandidates))).filter((value): value is string => Boolean(value));
    const timestamps = rows.map((row) => parseDate(keyValue(row, timestampCandidates))).filter((value): value is Date => Boolean(value));
    const uniqueParticipants = new Set(participants);
    const normalizedMessages = messages.map(normalizedMessage).filter(Boolean);
    const uniqueMessages = new Set(normalizedMessages);
    const recurrence = normalizedMessages.length ? 1 - uniqueMessages.size / normalizedMessages.length : null;
    const completeness = rows.length ? rows.filter((row) => stringValue(keyValue(row, participantCandidates)) && stringValue(keyValue(row, messageCandidates))).length / rows.length : null;
    let density: number | null = null;
    if (timestamps.length > 1) {
      const min = Math.min(...timestamps.map((date) => date.getTime()));
      const max = Math.max(...timestamps.map((date) => date.getTime()));
      density = messages.length / Math.max((max - min) / 86_400_000, 1);
    } else if (messages.length) {
      density = messages.length;
    }
    const clusters = topTerms(messages);
    const warnings = ['NO_AFFECTIVE_TONE_ENGINE', 'NO_COMMUNITY_FRICTION_MODEL', 'TOPIC_CLUSTERS_ARE_TERM_FREQUENCIES'];
    const features: StudioGenericFeature[] = [
      { key: 'participant_count', label: 'PARTICIPANT COUNT', numericValue: uniqueParticipants.size || null, textValue: null, unit: 'participants', source, confidence: participants.length ? 0.95 : null, status: participants.length ? 'DERIVED' : 'MISSING', explanation: 'Distinct participant identifiers found in structured records.', warnings },
      { key: 'message_count', label: 'MESSAGE COUNT', numericValue: messages.length, textValue: null, unit: 'messages', source, confidence: 1, status: 'OBSERVED', explanation: 'Records containing a recognized message field.', warnings },
      { key: 'message_density', label: 'MESSAGE DENSITY', numericValue: density, textValue: null, unit: timestamps.length > 1 ? 'messages/day' : 'messages', source, confidence: density === null ? null : timestamps.length > 1 ? 0.85 : 0.6, status: density === null ? 'MISSING' : 'DERIVED', explanation: timestamps.length > 1 ? 'Messages divided by observed time span.' : 'Message count; no reliable time span was available.', warnings },
      { key: 'community_recurrence', label: 'MESSAGE RECURRENCE', numericValue: recurrence, textValue: null, unit: 'ratio', source, confidence: recurrence === null ? null : 0.85, status: recurrence === null ? 'MISSING' : 'DERIVED', explanation: 'Repeated normalized-message ratio.', warnings },
      { key: 'record_coherence', label: 'RECORD COMPLETENESS', numericValue: completeness, textValue: null, unit: 'ratio', source, confidence: completeness === null ? null : 0.9, status: completeness === null ? 'MISSING' : 'DERIVED', explanation: 'Share of records containing both participant and message fields; not social coherence.', warnings: [...warnings, 'NOT_SOCIAL_COHERENCE'] },
      { key: 'community_terms', label: 'COMMUNITY TERMS', numericValue: null, textValue: clusters.map((item) => `${item.term}:${item.count}`).join(', ') || null, unit: null, source, confidence: clusters.length ? 0.75 : null, status: clusters.length ? 'DERIVED' : 'MISSING', explanation: 'Frequent terms from message content.', warnings },
    ];

    return {
      features,
      table: 'studio_community_features' as const,
      row: {
        participant_count: uniqueParticipants.size || null,
        message_density: density,
        topic_clusters: clusters,
        affective_tone: null,
        recurrence,
        coherence: completeness,
        friction: null,
        payload: {
          engine: source,
          recordCount: rows.length,
          messageCount: messages.length,
          timestampCount: timestamps.length,
          affectiveToneStatus: 'MISSING_NO_AFFECTIVE_ENGINE',
          frictionStatus: 'MISSING_NO_FRICTION_MODEL',
          warnings,
        },
      },
      warnings,
    };
  }

  const timestampCandidates = ['timestamp','created_at','observed_at','date','time','datetime','start','end'];
  const placeCandidates = ['place','place_label','location','city','country','region','site'];
  const timestamps = rows.flatMap((row) => Object.entries(row).filter(([key]) => timestampCandidates.includes(key.toLowerCase())).map(([, value]) => parseDate(value))).filter((value): value is Date => Boolean(value));
  const places = rows.flatMap((row) => Object.entries(row).filter(([key]) => placeCandidates.includes(key.toLowerCase())).map(([, value]) => stringValue(value))).filter((value): value is string => Boolean(value));
  const sortedTimes = timestamps.map((date) => date.getTime()).sort((a, b) => a - b);
  const timeRange = sortedTimes.length ? `${new Date(sortedTimes[0]).toISOString()} / ${new Date(sortedTimes.at(-1) as number).toISOString()}` : null;
  const placeCounts = new Map<string, number>();
  places.forEach((place) => placeCounts.set(place, (placeCounts.get(place) ?? 0) + 1));
  const placeLabel = [...placeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const anchors = topTerms(rows.flatMap((row) => Object.values(row).map(stringValue).filter((value): value is string => Boolean(value))));
  const warnings = ['NO_HISTORICAL_VECTOR_CLASSIFIER', 'NO_TENSION_MODEL'];
  const features: StudioGenericFeature[] = [
    { key: 'coordinate_record_count', label: 'COORDINATE RECORDS', numericValue: rows.length, textValue: null, unit: 'records', source, confidence: 1, status: 'OBSERVED', explanation: 'Structured records parsed from the uploaded object.', warnings },
    { key: 'timestamp_count', label: 'TIMESTAMP COUNT', numericValue: timestamps.length, textValue: null, unit: 'timestamps', source, confidence: 1, status: 'OBSERVED', explanation: 'Values that parsed as dates in recognized timestamp fields.', warnings },
    { key: 'place_count', label: 'PLACE COUNT', numericValue: new Set(places).size, textValue: null, unit: 'places', source, confidence: places.length ? 0.9 : null, status: places.length ? 'DERIVED' : 'MISSING', explanation: 'Distinct place labels in recognized location fields.', warnings },
    { key: 'time_range', label: 'TIME RANGE', numericValue: null, textValue: timeRange, unit: null, source, confidence: timeRange ? 0.9 : null, status: timeRange ? 'DERIVED' : 'MISSING', explanation: 'Minimum and maximum parsed timestamps.', warnings },
    { key: 'dominant_place', label: 'DOMINANT PLACE LABEL', numericValue: null, textValue: placeLabel, unit: null, source, confidence: placeLabel ? 0.75 : null, status: placeLabel ? 'DERIVED' : 'MISSING', explanation: 'Most recurrent explicit place label.', warnings },
    { key: 'semantic_anchors', label: 'SEMANTIC ANCHORS', numericValue: null, textValue: anchors.map((item) => `${item.term}:${item.count}`).join(', ') || null, unit: null, source, confidence: anchors.length ? 0.7 : null, status: anchors.length ? 'DERIVED' : 'MISSING', explanation: 'Frequent terms across structured coordinate records.', warnings },
  ];

  return {
    features,
    table: 'studio_time_coordinates' as const,
    row: {
      time_range: timeRange,
      place_label: placeLabel,
      semantic_anchors: anchors,
      historical_vector_tags: [],
      dominant_tensions: [],
      gap_description: timestamps.length ? null : 'No parseable timestamp fields were found.',
      payload: {
        engine: source,
        recordCount: rows.length,
        timestampCount: timestamps.length,
        distinctPlaces: new Set(places).size,
        historicalVectorStatus: 'MISSING_NO_CLASSIFIER',
        tensionsStatus: 'MISSING_NO_TENSION_MODEL',
        warnings,
      },
    },
    warnings,
  };
}
