import { createHash } from 'node:crypto';

type PlainObject = Record<string, unknown>;

const ISO_TIMESTAMP_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function isPlainObject(value: object): value is PlainObject {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function jsonScalar(value: string | number): string {
  const encoded = JSON.stringify(value);
  if (encoded === undefined) {
    throw new Error('COGNITIVE_SPINE_JSON_SCALAR_ENCODING_FAILED');
  }
  return encoded;
}

function encode(value: unknown, path: string): string {
  if (value === null) return 'null';

  if (typeof value === 'string') return jsonScalar(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`COGNITIVE_SPINE_NON_FINITE_NUMBER:${path}`);
    }
    return jsonScalar(Object.is(value, -0) ? 0 : value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item, index) => encode(item, `${path}[${index}]`)).join(',')}]`;
  }

  if (typeof value === 'object') {
    if (!isPlainObject(value)) {
      throw new Error(`COGNITIVE_SPINE_NON_PLAIN_OBJECT:${path}`);
    }

    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => {
      const child = value[key];
      if (typeof child === 'undefined') {
        throw new Error(`COGNITIVE_SPINE_UNDEFINED_VALUE:${path}.${key}`);
      }
      return `${jsonScalar(key)}:${encode(child, `${path}.${key}`)}`;
    }).join(',')}}`;
  }

  throw new Error(`COGNITIVE_SPINE_UNSUPPORTED_VALUE:${path}:${typeof value}`);
}

/**
 * Canonical serializer for semantic hashing.
 *
 * Object keys are sorted. Array order is preserved because some arrays are
 * ordered semantic structures; set-like arrays must be normalized before they
 * reach this function. Undefined, non-finite numbers, functions, symbols,
 * bigint values and non-plain objects are rejected rather than silently
 * coerced.
 */
export function canonicalSerialize(value: unknown): string {
  return encode(value, '$');
}

export function canonicalSha256(value: unknown): string {
  return createHash('sha256').update(canonicalSerialize(value), 'utf8').digest('hex');
}

/**
 * Only offset-aware ISO timestamps are admissible. This prevents host timezone
 * or locale from changing the semantic cutoff during reconstruction.
 */
export function normalizeTimestamp(value: string): string {
  if (!ISO_TIMESTAMP_WITH_ZONE.test(value)) {
    throw new Error(`COGNITIVE_SPINE_TIMESTAMP_REQUIRES_EXPLICIT_ZONE:${value}`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`COGNITIVE_SPINE_INVALID_TIMESTAMP:${value}`);
  }
  return parsed.toISOString();
}

export function sortedUnique(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => {
    if (value.trim() !== value || value.length === 0) {
      throw new Error(`COGNITIVE_SPINE_INVALID_REF:${JSON.stringify(value)}`);
    }
    return value;
  }))).sort();
}
