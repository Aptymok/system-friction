/**
 * Capa de Identidad Fenomenológica — tipos y utilidades compartidas.
 *
 * Esta capa NO reemplaza a `src/lib/ppoi/phenomenonResolver.ts`, que sigue
 * siendo la autoridad para decidir si ROOT abre un caso PPOI existente o
 * crea uno nuevo (MATCH / AMBIGUOUS / NEW). Esta capa agrega, alrededor de
 * esa decisión, visibilidad cross-dominio: qué otras entidades con nombre
 * parecido existen en Studio, Field o en el registro global (sfi_phenomena),
 * para que el operador vea de dónde vienen y decida — nunca para fusionar
 * automáticamente dominios ni para promover nada por su cuenta.
 */

export type PhenomenonOriginModule =
  | 'ppoi'
  | 'studio'
  | 'field'
  | 'registry';

export type IdentityCandidate = {
  id: string;
  label: string;
  originModule: PhenomenonOriginModule;
  similarity: number;
  livesAt: string;
  meta?: Record<string, unknown>;
};

export function normalizeIdentityQuery(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

export function identitySimilarity(a: string, b: string) {
  const x = normalizeIdentityQuery(a);
  const y = normalizeIdentityQuery(b);

  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.85;

  let matches = 0;
  const length = Math.min(x.length, y.length);
  for (let i = 0; i < length; i++) {
    if (x[i] === y[i]) matches++;
  }
  return matches / Math.max(x.length, y.length);
}

export const IDENTITY_SIMILARITY_FLOOR = 0.45;

export function rowLabel(row: Record<string, unknown>, keys: string[], fallback = 'sin nombre') {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return fallback;
}
