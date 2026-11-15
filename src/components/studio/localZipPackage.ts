/** Minimal, standards-compliant ZIP STORE writer for browser-derived artifacts.
 * No dependency, compression of originals, network requests, or durable storage.
 * ZIP32 (single volume) only; rejects sizes outside the supported range.
 */
export type StudioLocalZipEntry = { name: string; data: Blob | string };
const encoder = new TextEncoder();
function put16(view: DataView, offset: number, value: number) { view.setUint16(offset, value, true); }
function put32(view: DataView, offset: number, value: number) { view.setUint32(offset, value, true); }
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index++) {
    crc ^= bytes[index];
    for (let bit = 0; bit < 8; bit++) crc = ((crc >>> 1) ^ (0xedb88320 & -(crc & 1))) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function entryName(raw: string) {
  const name = raw.replace(/\\/g, '/').trim();
  if (!name || name.startsWith('/') || name.includes('..') || name.includes('//') ||
    /[\u0000-\u001f]/.test(name) || name.split('/').some(s => !s)) {
    throw new Error('ZIP_UNSAFE_ENTRY_NAME');
  }
  return name;
}
export async function makeStudioLocalZip(entries: StudioLocalZipEntry[]): Promise<Blob> {
  if (!entries.length || entries.length > 64) throw new Error('ZIP_ENTRY_COUNT_UNSUPPORTED');
  const files: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const seen = new Set<string>();
  for (const entry of entries) {
    const name = entryName(entry.name);
    if (seen.has(name)) throw new Error('ZIP_DUPLICATE_ENTRY');
    seen.add(name);
    const nameBytes = encoder.encode(name);
    if (nameBytes.length > 65535) throw new Error('ZIP_ENTRY_NAME_TOO_LONG');
    const data = typeof entry.data === 'string'
      ? encoder.encode(entry.data)
      : new Uint8Array(await entry.data.arrayBuffer());
    if (data.byteLength > 128 * 1024 * 1024) throw new Error('ZIP_SINGLE_ARTIFACT_TOO_LARGE');
    const checksum = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length + data.byteLength);
    const lv = new DataView(local.buffer);
    put32(lv, 0, 0x04034b50);
    put16(lv, 4, 20); // version needed
    put16(lv, 6, 0x0800); // UTF-8
    put16(lv, 8, 0); // STORE
    put16(lv, 10, 0); put16(lv, 12, 0); // no fabricated source timestamps
    put32(lv, 14, checksum);
    put32(lv, 18, data.length); put32(lv, 22, data.length);
    put16(lv, 26, nameBytes.length); put16(lv, 28, 0);
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    const dir = new Uint8Array(46 + nameBytes.length);
    const dv = new DataView(dir.buffer);
    put32(dv, 0, 0x02014b50);
    put16(dv, 4, 20); put16(dv, 6, 20); put16(dv, 8, 0x0800);
    put16(dv, 10, 0); put16(dv, 12, 0); put16(dv, 14, 0);
    put32(dv, 16, checksum); put32(dv, 20, data.length); put32(dv, 24, data.length);
    put16(dv, 28, nameBytes.length); put16(dv, 30, 0); put16(dv, 32, 0);
    put16(dv, 34, 0); put16(dv, 36, 0);
    put32(dv, 38, 0); put32(dv, 42, offset);
    dir.set(nameBytes, 46);
    files.push(local); central.push(dir);
    offset += local.length;
    if (offset > 512 * 1024 * 1024) throw new Error('ZIP_TOTAL_SIZE_TOO_LARGE');
  }
  const centralSize = central.reduce((n, part) => n + part.length, 0);
  const final = new Uint8Array(22);
  const ev = new DataView(final.buffer);
  put32(ev, 0, 0x06054b50);
  put16(ev, 4, 0); put16(ev, 6, 0);
  put16(ev, 8, entries.length); put16(ev, 10, entries.length);
  put32(ev, 12, centralSize); put32(ev, 16, offset);
  put16(ev, 20, 0);
  // ZIP parts are allocated in owned ArrayBuffers, not SharedArrayBuffers.
  const parts: ArrayBuffer[] = [...files, ...central, final].map(part => part.buffer as ArrayBuffer);
  return new Blob(parts, { type: 'application/zip' });
}
export function downloadStudioLocalZip(blob: Blob, title: string) {
  const safe = title.normalize('NFKD').replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'studio-project';
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safe + '-release-package.zip';
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 3000);
}
