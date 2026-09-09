import { gunzipSync } from 'node:zlib';

export const SFI_UNIFONT_VERSION = '16.0.04' as const;
export const SFI_UNIFONT_SOURCE = `https://unifoundry.com/pub/unifont/unifont-${SFI_UNIFONT_VERSION}/font-builds/unifont-${SFI_UNIFONT_VERSION}.hex.gz` as const;

export type SfiUnifontGlyph = {
  codePoint: number;
  width: 8 | 16;
  rows: number[];
};

let sourcePromise: Promise<string> | null = null;

function parseGlyph(codePoint: number, bitmapHex: string): SfiUnifontGlyph | null {
  const bitmap = bitmapHex.trim();
  if (!/^[0-9A-Fa-f]+$/.test(bitmap)) return null;
  if (bitmap.length !== 32 && bitmap.length !== 64) return null;
  const width = bitmap.length === 32 ? 8 : 16;
  const rowDigits = width / 4;
  const rows: number[] = [];
  for (let offset = 0; offset < bitmap.length; offset += rowDigits) {
    rows.push(Number.parseInt(bitmap.slice(offset, offset + rowDigits), 16));
  }
  if (rows.length !== 16) return null;
  return { codePoint, width, rows };
}

export function parseUnifontHex(source: string, requested: ReadonlySet<number>) {
  const glyphs = new Map<number, SfiUnifontGlyph>();
  for (const line of source.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf(':');
    if (separator <= 0) continue;
    const codePoint = Number.parseInt(line.slice(0, separator), 16);
    if (!Number.isFinite(codePoint) || !requested.has(codePoint)) continue;
    const glyph = parseGlyph(codePoint, line.slice(separator + 1));
    if (glyph) glyphs.set(codePoint, glyph);
    if (glyphs.size === requested.size) break;
  }
  if (requested.has(0x20) && !glyphs.has(0x20)) {
    glyphs.set(0x20, { codePoint: 0x20, width: 8, rows: Array.from({ length: 16 }, () => 0) });
  }
  return glyphs;
}

async function loadPinnedSource() {
  if (!sourcePromise) {
    sourcePromise = (async () => {
      const response = await fetch(SFI_UNIFONT_SOURCE, {
        headers: { accept: 'application/gzip' },
        cache: 'force-cache',
      });
      if (!response.ok) throw new Error(`SFI_PRIVATE_CASE_BRIEF_UNICODE_FONT_FETCH_FAILED:${response.status}`);
      const compressed = Buffer.from(await response.arrayBuffer());
      if (!compressed.length || compressed.length > 2_000_000) throw new Error('SFI_PRIVATE_CASE_BRIEF_UNICODE_FONT_SOURCE_SIZE_INVALID');
      try {
        return gunzipSync(compressed).toString('utf8');
      } catch {
        throw new Error('SFI_PRIVATE_CASE_BRIEF_UNICODE_FONT_SOURCE_INVALID');
      }
    })().catch((error) => {
      sourcePromise = null;
      throw error;
    });
  }
  return sourcePromise;
}

export async function loadUnifontGlyphs(codePoints: Iterable<number>) {
  const requested = new Set<number>();
  for (const codePoint of codePoints) {
    if (!Number.isInteger(codePoint) || codePoint < 0x20 || codePoint > 0xffff) {
      if (codePoint > 0xffff) throw new Error(`SFI_PRIVATE_CASE_BRIEF_UNICODE_NON_BMP_UNSUPPORTED:U+${codePoint.toString(16).toUpperCase()}`);
      continue;
    }
    requested.add(codePoint);
  }
  if (!requested.size) return new Map<number, SfiUnifontGlyph>();
  const source = await loadPinnedSource();
  const glyphs = parseUnifontHex(source, requested);
  const missing = [...requested].filter((codePoint) => !glyphs.has(codePoint));
  if (missing.length) {
    throw new Error(`SFI_PRIVATE_CASE_BRIEF_UNICODE_GLYPH_UNAVAILABLE:${missing.map((codePoint) => `U+${codePoint.toString(16).toUpperCase()}`).join(',')}`);
  }
  return glyphs;
}
