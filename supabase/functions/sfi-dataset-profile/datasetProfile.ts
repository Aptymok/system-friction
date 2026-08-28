import JSZip from 'npm:jszip@3.10.1';

export const DATASET_PROFILE_CONTRACT = 'SFI-DATASET-PROFILE-1.0';
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_SHEET_XML_CHARS = 120_000_000;
const MAX_SHARED_STRINGS_XML_CHARS = 80_000_000;
const TOP_VALUE_TRACK_LIMIT = 5_000;
const REPEAT_VALUE_TRACK_LIMIT = 100_000;
const TOP_VALUE_OUTPUT_LIMIT = 12;

export type DatasetProfileInput = {
  filename: string;
  contentType: string;
  bytes: Uint8Array;
};

type Scalar = string | number | boolean | null;
type TypeCounts = { blank: number; text: number; number: number; boolean: number; date: number };
type RowRecord = Map<number, Scalar>;

type ColumnProfile = {
  index: number;
  name: string;
  sensitiveHint: boolean;
  nonEmpty: number;
  missing: number;
  typeCounts: TypeCounts;
  numeric: { min: number | null; max: number | null; mean: number | null };
  date: { min: string | null; max: string | null };
  distinct: { count: number | null; lowerBound: number; exact: boolean };
  repeatability: { tracked: boolean; repeatedRows: number | null; repeatedShare: number | null; exact: boolean };
  topValues: Array<{ value: string; count: number }>;
  topValuesSuppressedReason: string | null;
  maxTextLength: number;
};

type TemporalCheck = {
  key: string;
  leftColumn: string;
  rightColumn: string;
  comparableRows: number;
  violations: number;
  violationShare: number | null;
  relation: string;
};

type DurationProfile = {
  key: string;
  startColumn: string;
  endColumn: string;
  comparableRows: number;
  negativeRows: number;
  medianHours: number | null;
  p90Hours: number | null;
  meanHours: number | null;
  maxHours: number | null;
};

export type DatasetSheetProfile = {
  name: string;
  rowCount: number;
  analyzableRowCount: number;
  malformedRows: number;
  columnCount: number;
  headers: string[];
  columns: ColumnProfile[];
  temporalConsistency: TemporalCheck[];
  durations: DurationProfile[];
  creationMonthCounts: Array<{ month: string; count: number }>;
  formulaCells: number;
};

export type DatasetProfile = {
  contract: typeof DATASET_PROFILE_CONTRACT;
  generatedAt: string;
  source: {
    filename: string;
    contentType: string;
    size: number;
    contentHash: string;
    contentHashBasis: 'SERVER_VERIFIED_SHA256';
  };
  format: 'XLSX' | 'CSV' | 'JSON' | 'JSONL';
  observations: {
    sheetCount: number;
    totalRows: number;
    totalAnalyzableRows: number;
    totalMalformedRows: number;
  };
  sheets: DatasetSheetProfile[];
  epistemicPartition: {
    observed: string[];
    extracted: string[];
    derived: string[];
  };
  security: {
    formulasEvaluated: false;
    macrosExecuted: false;
    externalLinksFollowed: false;
    arbitraryCellTextTreatedAsInstructions: false;
    rawRowsReturned: false;
    piiDistributionSuppression: true;
  };
  warnings: string[];
};

function normalizeHeader(value: Scalar, index: number) {
  const text = scalarText(value).trim().replace(/\s+/g, ' ');
  return text ? text.slice(0, 180) : `COLUMN_${index + 1}`;
}

function normalizedName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isSensitiveHeader(value: string) {
  const name = normalizedName(value);
  return /(^| )(nombre|name|email|correo|mail|telefono|phone|celular|usuario|user|empleado|employee|rfc|curp|domicilio|address|direccion|ip|mac|serial|serie|cuenta|account)( |$)/.test(name);
}

function isRepeatabilityHeader(value: string) {
  const name = normalizedName(value);
  return /(solicitud|request|descripcion|description|detalle|asunto|summary|subject|motivo|incidencia|problema)/.test(name) && !isSensitiveHeader(value);
}

function isDateHeader(value: string) {
  const name = normalizedName(value);
  return /(fecha|date|creacion|created|inicio|start|fin|end|cierre|closed|closure|atencion|attention)/.test(name);
}

function scalarText(value: Scalar) {
  if (value === null) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

function safeOutputValue(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
}

function parseDateText(value: string): Date | null {
  const source = value.trim();
  if (!source) return null;
  const isoLike = source.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):?(\d{2})?(?::?(\d{2}))?)?/);
  if (isoLike) {
    const [, y, m, d, hh = '0', mm = '0', ss = '0'] = isoLike;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss)));
    return Number.isFinite(date.getTime()) ? date : null;
  }
  const latin = source.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}):?(\d{2})?(?::?(\d{2}))?)?/);
  if (latin) {
    const [, d, m, y, hh = '0', mm = '0', ss = '0'] = latin;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss)));
    return Number.isFinite(date.getTime()) ? date : null;
  }
  return null;
}

function excelSerialToIso(value: number, date1904: boolean) {
  const base = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  const millis = base + value * 86_400_000;
  const date = new Date(millis);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function xmlDecode(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function attr(source: string, name: string) {
  const match = source.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`));
  return match ? xmlDecode(match[1]) : null;
}

function columnIndexFromRef(cellRef: string | null) {
  const letters = (cellRef ?? '').match(/[A-Za-z]+/)?.[0]?.toUpperCase() ?? '';
  if (!letters) return null;
  let result = 0;
  for (const char of letters) result = result * 26 + (char.charCodeAt(0) - 64);
  return result - 1;
}

async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

class ColumnAccumulator {
  readonly index: number;
  readonly name: string;
  readonly sensitiveHint: boolean;
  readonly repeatabilityTracked: boolean;
  nonEmpty = 0;
  missing = 0;
  typeCounts: TypeCounts = { blank: 0, text: 0, number: 0, boolean: 0, date: 0 };
  numericCount = 0;
  numericSum = 0;
  numericMin: number | null = null;
  numericMax: number | null = null;
  dateMin: string | null = null;
  dateMax: string | null = null;
  maxTextLength = 0;
  distinct = new Set<string>();
  distinctExact = true;
  topValues = new Map<string, number>();
  topValuesTruncated = false;
  repeatValues: Map<string, number> | null;
  repeatExact = true;

  constructor(index: number, name: string) {
    this.index = index;
    this.name = name;
    this.sensitiveHint = isSensitiveHeader(name);
    this.repeatabilityTracked = isRepeatabilityHeader(name);
    this.repeatValues = this.repeatabilityTracked ? new Map() : null;
  }

  add(value: Scalar) {
    if (value === null || (typeof value === 'string' && !value.trim())) {
      this.missing += 1;
      this.typeCounts.blank += 1;
      return;
    }
    this.nonEmpty += 1;
    const textValue = scalarText(value).trim();
    this.maxTextLength = Math.max(this.maxTextLength, textValue.length);

    if (this.distinctExact) {
      if (this.distinct.size < REPEAT_VALUE_TRACK_LIMIT || this.distinct.has(textValue)) this.distinct.add(textValue);
      else this.distinctExact = false;
    }

    if (!this.sensitiveHint) {
      if (this.topValues.has(textValue)) this.topValues.set(textValue, (this.topValues.get(textValue) ?? 0) + 1);
      else if (this.topValues.size < TOP_VALUE_TRACK_LIMIT) this.topValues.set(textValue, 1);
      else this.topValuesTruncated = true;
    }

    if (this.repeatValues) {
      if (this.repeatValues.has(textValue)) this.repeatValues.set(textValue, (this.repeatValues.get(textValue) ?? 0) + 1);
      else if (this.repeatValues.size < REPEAT_VALUE_TRACK_LIMIT) this.repeatValues.set(textValue, 1);
      else this.repeatExact = false;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      this.typeCounts.number += 1;
      this.numericCount += 1;
      this.numericSum += value;
      this.numericMin = this.numericMin === null ? value : Math.min(this.numericMin, value);
      this.numericMax = this.numericMax === null ? value : Math.max(this.numericMax, value);
      return;
    }
    if (typeof value === 'boolean') {
      this.typeCounts.boolean += 1;
      return;
    }
    if (isDateHeader(this.name)) {
      const parsed = parseDateText(textValue);
      if (parsed) {
        this.typeCounts.date += 1;
        const iso = parsed.toISOString();
        this.dateMin = this.dateMin === null || iso < this.dateMin ? iso : this.dateMin;
        this.dateMax = this.dateMax === null || iso > this.dateMax ? iso : this.dateMax;
        return;
      }
    }
    this.typeCounts.text += 1;
  }

  output(totalRows: number): ColumnProfile {
    const distinctCount = this.distinctExact ? this.distinct.size : null;
    const lowerBound = this.distinct.size;
    let topValuesSuppressedReason: string | null = null;
    let topValues: Array<{ value: string; count: number }> = [];
    if (this.sensitiveHint) topValuesSuppressedReason = 'PII_OR_IDENTIFIER_HEADER';
    else if (this.topValuesTruncated) topValuesSuppressedReason = 'HIGH_CARDINALITY';
    else {
      const cardinalityRatio = this.nonEmpty ? this.topValues.size / this.nonEmpty : 0;
      if (this.topValues.size > 200 || cardinalityRatio > 0.2) topValuesSuppressedReason = 'HIGH_CARDINALITY';
      else {
        topValues = [...this.topValues.entries()]
          .filter(([, count]) => count >= 2)
          .sort((a, b) => b[1] - a[1])
          .slice(0, TOP_VALUE_OUTPUT_LIMIT)
          .map(([value, count]) => ({ value: safeOutputValue(value), count }));
      }
    }

    let repeatedRows: number | null = null;
    let repeatedShare: number | null = null;
    if (this.repeatValues && this.repeatExact) {
      repeatedRows = [...this.repeatValues.values()].reduce((sum, count) => sum + (count > 1 ? count : 0), 0);
      repeatedShare = this.nonEmpty ? repeatedRows / this.nonEmpty : 0;
    }

    return {
      index: this.index,
      name: this.name,
      sensitiveHint: this.sensitiveHint,
      nonEmpty: this.nonEmpty,
      missing: Math.max(this.missing, totalRows - this.nonEmpty),
      typeCounts: this.typeCounts,
      numeric: {
        min: this.numericMin,
        max: this.numericMax,
        mean: this.numericCount ? this.numericSum / this.numericCount : null,
      },
      date: { min: this.dateMin, max: this.dateMax },
      distinct: { count: distinctCount, lowerBound, exact: this.distinctExact },
      repeatability: {
        tracked: this.repeatabilityTracked,
        repeatedRows,
        repeatedShare,
        exact: Boolean(this.repeatValues && this.repeatExact),
      },
      topValues,
      topValuesSuppressedReason,
      maxTextLength: this.maxTextLength,
    };
  }
}

class SheetAccumulator {
  readonly name: string;
  headers: string[] = [];
  columns: ColumnAccumulator[] = [];
  rowCount = 0;
  analyzableRowCount = 0;
  malformedRows = 0;
  formulaCells = 0;
  headerSet = false;
  creationIndex: number | null = null;
  startIndex: number | null = null;
  endIndex: number | null = null;
  closeIndex: number | null = null;
  temporal = new Map<string, { left: number; right: number; comparable: number; violations: number; relation: string }>();
  durations = new Map<string, { start: number; end: number; values: number[]; negative: number }>();
  creationMonthCounts = new Map<string, number>();

  constructor(name: string) { this.name = name; }

  setHeader(cells: RowRecord) {
    const maxIndex = Math.max(-1, ...cells.keys());
    this.headers = Array.from({ length: maxIndex + 1 }, (_, index) => normalizeHeader(cells.get(index) ?? null, index));
    this.columns = this.headers.map((header, index) => new ColumnAccumulator(index, header));
    this.headerSet = true;
    const names = this.headers.map(normalizedName);
    const find = (patterns: RegExp[]) => {
      const index = names.findIndex((name) => patterns.some((pattern) => pattern.test(name)));
      return index >= 0 ? index : null;
    };
    this.creationIndex = find([/creacion/, /created/, /fecha alta/, /^registro$/]);
    this.startIndex = find([/inicio.*atencion/, /start.*attention/, /^inicio$/]);
    this.endIndex = find([/fin.*atencion/, /end.*attention/, /^fin$/]);
    this.closeIndex = find([/fecha.*cierre/, /cierre/, /closed/, /closure/]);
    this.registerTemporal('START_BEFORE_CREATION', this.startIndex, this.creationIndex, 'LEFT_SHOULD_NOT_PRECEDE_RIGHT');
    this.registerTemporal('CLOSE_BEFORE_END', this.closeIndex, this.endIndex, 'LEFT_SHOULD_NOT_PRECEDE_RIGHT');
    this.registerTemporal('CLOSE_BEFORE_CREATION', this.closeIndex, this.creationIndex, 'LEFT_SHOULD_NOT_PRECEDE_RIGHT');
    this.registerDuration('CREATION_TO_CLOSE', this.creationIndex, this.closeIndex);
    this.registerDuration('START_TO_END', this.startIndex, this.endIndex);
  }

  registerTemporal(key: string, left: number | null, right: number | null, relation: string) {
    if (left !== null && right !== null) this.temporal.set(key, { left, right, comparable: 0, violations: 0, relation });
  }

  registerDuration(key: string, start: number | null, end: number | null) {
    if (start !== null && end !== null) this.durations.set(key, { start, end, values: [], negative: 0 });
  }

  addDataRow(cells: RowRecord) {
    this.rowCount += 1;
    if (!this.headerSet) return;
    const nonEmpty = [...cells.values()].some((value) => value !== null && scalarText(value).trim());
    if (!nonEmpty) return;
    const maxIndex = Math.max(-1, ...cells.keys());
    const malformed = maxIndex >= this.headers.length;
    if (malformed) this.malformedRows += 1;
    else this.analyzableRowCount += 1;

    for (let index = 0; index < this.columns.length; index += 1) this.columns[index].add(cells.get(index) ?? null);

    for (const check of this.temporal.values()) {
      const left = this.cellDate(cells.get(check.left) ?? null, this.headers[check.left]);
      const right = this.cellDate(cells.get(check.right) ?? null, this.headers[check.right]);
      if (!left || !right) continue;
      check.comparable += 1;
      if (left.getTime() < right.getTime()) check.violations += 1;
    }

    for (const duration of this.durations.values()) {
      const start = this.cellDate(cells.get(duration.start) ?? null, this.headers[duration.start]);
      const end = this.cellDate(cells.get(duration.end) ?? null, this.headers[duration.end]);
      if (!start || !end) continue;
      const hours = (end.getTime() - start.getTime()) / 3_600_000;
      if (hours < 0) duration.negative += 1;
      else duration.values.push(hours);
    }

    if (this.creationIndex !== null) {
      const created = this.cellDate(cells.get(this.creationIndex) ?? null, this.headers[this.creationIndex]);
      if (created) {
        const month = created.toISOString().slice(0, 7);
        this.creationMonthCounts.set(month, (this.creationMonthCounts.get(month) ?? 0) + 1);
      }
    }
  }

  cellDate(value: Scalar, header: string) {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    if (typeof value === 'number') return null;
    return isDateHeader(header) ? parseDateText(value) : null;
  }

  output(): DatasetSheetProfile {
    const temporalConsistency: TemporalCheck[] = [...this.temporal.entries()].map(([key, value]) => ({
      key,
      leftColumn: this.headers[value.left],
      rightColumn: this.headers[value.right],
      comparableRows: value.comparable,
      violations: value.violations,
      violationShare: value.comparable ? value.violations / value.comparable : null,
      relation: value.relation,
    }));
    const durations: DurationProfile[] = [...this.durations.entries()].map(([key, value]) => {
      const sorted = [...value.values].sort((a, b) => a - b);
      const mean = sorted.length ? sorted.reduce((sum, item) => sum + item, 0) / sorted.length : null;
      return {
        key,
        startColumn: this.headers[value.start],
        endColumn: this.headers[value.end],
        comparableRows: sorted.length + value.negative,
        negativeRows: value.negative,
        medianHours: percentile(sorted, 0.5),
        p90Hours: percentile(sorted, 0.9),
        meanHours: mean,
        maxHours: sorted.length ? sorted[sorted.length - 1] : null,
      };
    });
    return {
      name: this.name,
      rowCount: this.rowCount,
      analyzableRowCount: this.analyzableRowCount,
      malformedRows: this.malformedRows,
      columnCount: this.headers.length,
      headers: this.headers,
      columns: this.columns.map((column) => column.output(this.rowCount)),
      temporalConsistency,
      durations,
      creationMonthCounts: [...this.creationMonthCounts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count })),
      formulaCells: this.formulaCells,
    };
  }
}

function percentile(values: number[], fraction: number) {
  if (!values.length) return null;
  const index = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * fraction) - 1));
  return values[index];
}

function detectDelimiter(text: string) {
  const first = text.split(/\r?\n/, 1)[0] ?? '';
  const candidates = [',', ';', '\t', '|'];
  return candidates.sort((a, b) => (first.split(b).length - first.split(a).length))[0];
}

function* csvRows(text: string, delimiter: string): Generator<Scalar[]> {
  let row: Scalar[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { field += '"'; index += 1; continue; }
      if (char === '"') { quoted = false; continue; }
      field += char;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === delimiter) { row.push(field); field = ''; continue; }
    if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field); field = '';
      yield row;
      row = [];
      continue;
    }
    field += char;
  }
  if (field.length || row.length) { row.push(field); yield row; }
}

function rowRecordFromArray(values: Scalar[]) {
  const row = new Map<number, Scalar>();
  values.forEach((value, index) => row.set(index, value));
  return row;
}

function profileDelimited(text: string, name: string): DatasetSheetProfile {
  const accumulator = new SheetAccumulator(name);
  let header = true;
  for (const values of csvRows(text, detectDelimiter(text))) {
    const cells = rowRecordFromArray(values);
    if (header) { accumulator.setHeader(cells); header = false; continue; }
    accumulator.addDataRow(cells);
  }
  return accumulator.output();
}

function rowsFromJson(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item));
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const object = value as Record<string, unknown>;
    for (const key of ['data', 'records', 'rows', 'items']) {
      if (Array.isArray(object[key])) return (object[key] as unknown[]).filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item));
    }
    return [object];
  }
  return [];
}

function scalarFromJson(value: unknown): Scalar {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return JSON.stringify(value).slice(0, 4_000);
}

function profileJson(text: string, name: string, jsonl: boolean): DatasetSheetProfile {
  const rows = jsonl
    ? text.split(/\r?\n/).filter((line) => line.trim()).flatMap((line) => rowsFromJson(JSON.parse(line)))
    : rowsFromJson(JSON.parse(text));
  const headers = [...new Set(rows.flatMap((item) => Object.keys(item)))];
  const accumulator = new SheetAccumulator(name);
  accumulator.setHeader(rowRecordFromArray(headers));
  for (const item of rows) accumulator.addDataRow(rowRecordFromArray(headers.map((header) => scalarFromJson(item[header]))));
  return accumulator.output();
}

function parseSharedStrings(xml: string) {
  if (xml.length > MAX_SHARED_STRINGS_XML_CHARS) throw new Error('SFI_DATASET_SHARED_STRINGS_TOO_LARGE');
  const values: string[] = [];
  for (const match of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    const fragments = [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((item) => xmlDecode(item[1]));
    values.push(fragments.join(''));
  }
  return values;
}

function dateStyleIndexes(stylesXml: string | null) {
  const custom = new Map<number, string>();
  if (stylesXml) {
    for (const match of stylesXml.matchAll(/<numFmt\b([^>]*)\/?\s*>/g)) {
      const id = Number(attr(match[1], 'numFmtId'));
      const code = attr(match[1], 'formatCode') ?? '';
      if (Number.isFinite(id)) custom.set(id, code);
    }
  }
  const builtInDateIds = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);
  const indexes = new Set<number>();
  const cellXfs = stylesXml?.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] ?? '';
  let styleIndex = 0;
  for (const match of cellXfs.matchAll(/<xf\b([^>]*)\/?\s*>/g)) {
    const numFmtId = Number(attr(match[1], 'numFmtId') ?? 0);
    const customCode = custom.get(numFmtId) ?? '';
    const normalizedCode = customCode.replace(/"[^"]*"/g, '').replace(/\\./g, '');
    if (builtInDateIds.has(numFmtId) || /[ymdhis]/i.test(normalizedCode)) indexes.add(styleIndex);
    styleIndex += 1;
  }
  return indexes;
}

function xlsxCellValue(input: { attrs: string; body: string; sharedStrings: string[]; dateStyles: Set<number>; date1904: boolean }): Scalar {
  const type = attr(input.attrs, 't') ?? '';
  const style = Number(attr(input.attrs, 's') ?? -1);
  const raw = input.body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? null;
  if (type === 'inlineStr') {
    const fragments = [...input.body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((item) => xmlDecode(item[1]));
    return fragments.join('');
  }
  if (raw === null) return null;
  const decoded = xmlDecode(raw);
  if (type === 's') return input.sharedStrings[Number(decoded)] ?? '';
  if (type === 'b') return decoded === '1';
  if (type === 'str' || type === 'e') return decoded;
  const numeric = Number(decoded);
  if (Number.isFinite(numeric)) {
    if (input.dateStyles.has(style)) return excelSerialToIso(numeric, input.date1904) ?? numeric;
    return numeric;
  }
  return decoded;
}

function parseWorkbookSheets(workbookXml: string, relsXml: string) {
  const relationTargets = new Map<string, string>();
  for (const match of relsXml.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)) {
    const id = attr(match[1], 'Id');
    const target = attr(match[1], 'Target');
    if (id && target) relationTargets.set(id, target);
  }
  const result: Array<{ name: string; path: string }> = [];
  for (const match of workbookXml.matchAll(/<sheet\b([^>]*)\/?\s*>/g)) {
    const name = attr(match[1], 'name') ?? `Sheet${result.length + 1}`;
    const relId = attr(match[1], 'r:id');
    const target = relId ? relationTargets.get(relId) : null;
    if (!target) continue;
    const normalized = target.replace(/^\//, '').replace(/^xl\//, '');
    result.push({ name, path: `xl/${normalized}`.replace(/\/\.\//g, '/') });
  }
  return result;
}

function profileWorksheetXml(input: { xml: string; name: string; sharedStrings: string[]; dateStyles: Set<number>; date1904: boolean }) {
  if (input.xml.length > MAX_SHEET_XML_CHARS) throw new Error(`SFI_DATASET_SHEET_TOO_LARGE:${input.name}`);
  const accumulator = new SheetAccumulator(input.name);
  let header = true;
  for (const rowMatch of input.xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = new Map<number, Scalar>();
    let fallbackIndex = 0;
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const cellRef = attr(cellMatch[1], 'r');
      const index = columnIndexFromRef(cellRef) ?? fallbackIndex;
      fallbackIndex = index + 1;
      if (cellMatch[2].includes('<f')) accumulator.formulaCells += 1;
      row.set(index, xlsxCellValue({
        attrs: cellMatch[1],
        body: cellMatch[2],
        sharedStrings: input.sharedStrings,
        dateStyles: input.dateStyles,
        date1904: input.date1904,
      }));
    }
    if (header) { accumulator.setHeader(row); header = false; continue; }
    accumulator.addDataRow(row);
  }
  return accumulator.output();
}

async function profileXlsx(bytes: Uint8Array) {
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: true, createFolders: false });
  const workbookFile = zip.file('xl/workbook.xml');
  const relsFile = zip.file('xl/_rels/workbook.xml.rels');
  if (!workbookFile || !relsFile) throw new Error('SFI_DATASET_XLSX_WORKBOOK_STRUCTURE_MISSING');
  const workbookXml = await workbookFile.async('string');
  const relsXml = await relsFile.async('string');
  const sharedFile = zip.file('xl/sharedStrings.xml');
  const sharedStrings = sharedFile ? parseSharedStrings(await sharedFile.async('string')) : [];
  const stylesFile = zip.file('xl/styles.xml');
  const stylesXml = stylesFile ? await stylesFile.async('string') : null;
  const dateStyles = dateStyleIndexes(stylesXml);
  const date1904 = /<workbookPr\b[^>]*date1904="(?:1|true)"/i.test(workbookXml);
  const sheets = parseWorkbookSheets(workbookXml, relsXml).slice(0, 32);
  if (!sheets.length) throw new Error('SFI_DATASET_XLSX_NO_WORKSHEETS');
  const profiles: DatasetSheetProfile[] = [];
  for (const sheet of sheets) {
    const file = zip.file(sheet.path);
    if (!file) continue;
    const xml = await file.async('string');
    profiles.push(profileWorksheetXml({ xml, name: sheet.name, sharedStrings, dateStyles, date1904 }));
  }
  if (!profiles.length) throw new Error('SFI_DATASET_XLSX_WORKSHEETS_UNREADABLE');
  return profiles;
}

export async function profileDataset(input: DatasetProfileInput): Promise<DatasetProfile> {
  if (input.bytes.byteLength <= 0 || input.bytes.byteLength > MAX_FILE_BYTES) throw new Error(`SFI_DATASET_FILE_SIZE_INVALID:${MAX_FILE_BYTES}`);
  const filename = input.filename.trim() || 'dataset';
  const lower = filename.toLowerCase();
  const contentType = input.contentType.toLowerCase();
  const decoder = new TextDecoder('utf-8', { fatal: false });
  let format: DatasetProfile['format'];
  let sheets: DatasetSheetProfile[];
  const warnings: string[] = [];

  if (contentType.includes('spreadsheetml') || lower.endsWith('.xlsx')) {
    format = 'XLSX';
    sheets = await profileXlsx(input.bytes);
  } else if (contentType.includes('csv') || lower.endsWith('.csv')) {
    format = 'CSV';
    sheets = [profileDelimited(decoder.decode(input.bytes), filename)];
  } else if (lower.endsWith('.jsonl') || contentType.includes('jsonl')) {
    format = 'JSONL';
    sheets = [profileJson(decoder.decode(input.bytes), filename, true)];
  } else if (contentType.includes('json') || lower.endsWith('.json')) {
    format = 'JSON';
    sheets = [profileJson(decoder.decode(input.bytes), filename, false)];
  } else {
    throw new Error(`SFI_DATASET_FORMAT_NOT_SUPPORTED:${contentType || lower.split('.').at(-1) || 'unknown'}`);
  }

  for (const sheet of sheets) {
    if (sheet.formulaCells) warnings.push(`${sheet.name}:FORMULA_CELLS_PRESENT_NOT_EVALUATED:${sheet.formulaCells}`);
    for (const column of sheet.columns) {
      if (column.distinct.exact === false) warnings.push(`${sheet.name}:${column.name}:DISTINCT_COUNT_LOWER_BOUND_ONLY`);
      if (column.repeatability.tracked && column.repeatability.exact === false) warnings.push(`${sheet.name}:${column.name}:REPEATABILITY_LOWER_CONFIDENCE_CARDINALITY_LIMIT`);
    }
  }

  const contentHash = await sha256Hex(input.bytes);
  const totalRows = sheets.reduce((sum, sheet) => sum + sheet.rowCount, 0);
  const totalAnalyzableRows = sheets.reduce((sum, sheet) => sum + sheet.analyzableRowCount, 0);
  const totalMalformedRows = sheets.reduce((sum, sheet) => sum + sheet.malformedRows, 0);

  return {
    contract: DATASET_PROFILE_CONTRACT,
    generatedAt: new Date().toISOString(),
    source: {
      filename,
      contentType: input.contentType || 'application/octet-stream',
      size: input.bytes.byteLength,
      contentHash,
      contentHashBasis: 'SERVER_VERIFIED_SHA256',
    },
    format,
    observations: { sheetCount: sheets.length, totalRows, totalAnalyzableRows, totalMalformedRows },
    sheets,
    epistemicPartition: {
      observed: ['storage object retrieved by authorized dataset-profile worker', 'raw byte length observed'],
      extracted: ['worksheet/schema structure', 'cell values required for deterministic aggregation', 'formula presence without execution'],
      derived: ['row/record counts', 'missingness', 'type distributions', 'bounded cardinality/repeatability measures', 'temporal consistency checks', 'duration distributions', 'monthly creation counts'],
    },
    security: {
      formulasEvaluated: false,
      macrosExecuted: false,
      externalLinksFollowed: false,
      arbitraryCellTextTreatedAsInstructions: false,
      rawRowsReturned: false,
      piiDistributionSuppression: true,
    },
    warnings: [...new Set(warnings)],
  };
}
