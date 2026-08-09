import 'server-only';

import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { StudioMultimodalError } from './types';

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const MAX_TAIL_BYTES = 131_072;
const MAX_CENTRAL_BYTES = 8 * 1024 * 1024;
const MAX_METADATA_ENTRY_BYTES = 8 * 1024 * 1024;
const MAX_STRING_CANDIDATES = 600;

export type StudioZipEntry = {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  compressionMethod: number;
  crc32: number;
  flags: number;
  localHeaderOffset: number;
  modifiedAt: string | null;
};

export type StudioSessionPackageManifest = {
  format: 'zip';
  daw: 'Logic Pro' | 'unknown';
  packageRoot: string | null;
  archiveBytes: number;
  archiveEntryCount: number;
  totalUncompressedBytes: number;
  audioEntryCount: number;
  activeAudioEntryCount: number;
  unusedAudioEntryCount: number;
  projectDataEntryCount: number;
  logicVersionCandidates: string[];
  sampleRateCandidates: number[];
  audioAssetNames: string[];
  activeAudioAssetNames: string[];
  unusedAudioAssetNames: string[];
  projectDataStringCandidates: string[];
  entryTimestamps: string[];
  archiveManifestSha256: string;
  sourceFileSha256: null;
  warnings: string[];
};

function u16(buffer: Buffer, offset: number) {
  return buffer.readUInt16LE(offset);
}

function u32(buffer: Buffer, offset: number) {
  return buffer.readUInt32LE(offset);
}

async function fetchRange(url: string, start: number, end: number) {
  const response = await fetch(url, {
    headers: { Range: `bytes=${start}-${end}`, 'Cache-Control': 'no-store' },
    cache: 'no-store',
  });
  if (response.status !== 206) {
    throw new StudioMultimodalError(
      'PACKAGE_PARSE_FAILED',
      'Session package storage does not support bounded HTTP range reads; refusing to load the full archive into memory.',
      502,
      { status: response.status, start, end },
    );
  }
  return Buffer.from(await response.arrayBuffer());
}

function findEocd(buffer: Buffer) {
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === EOCD_SIGNATURE) return offset;
  }
  return -1;
}

function decodeName(buffer: Buffer) {
  return buffer.toString('utf8').replace(/\\/g, '/');
}

function dosDateTime(date: number, time: number): string | null {
  if (!date) return null;
  const day = date & 0x1f;
  const month = (date >> 5) & 0x0f;
  const year = ((date >> 9) & 0x7f) + 1980;
  const second = (time & 0x1f) * 2;
  const minute = (time >> 5) & 0x3f;
  const hour = (time >> 11) & 0x1f;
  const value = new Date(Date.UTC(year, Math.max(0, month - 1), day || 1, hour, minute, second));
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

function parseCentralDirectory(buffer: Buffer): StudioZipEntry[] {
  const entries: StudioZipEntry[] = [];
  let offset = 0;
  while (offset + 46 <= buffer.length) {
    if (u32(buffer, offset) !== CENTRAL_SIGNATURE) break;
    const flags = u16(buffer, offset + 8);
    const compressionMethod = u16(buffer, offset + 10);
    const modifiedTime = u16(buffer, offset + 12);
    const modifiedDate = u16(buffer, offset + 14);
    const crc32 = u32(buffer, offset + 16);
    const compressedSize = u32(buffer, offset + 20);
    const uncompressedSize = u32(buffer, offset + 24);
    const fileNameLength = u16(buffer, offset + 28);
    const extraLength = u16(buffer, offset + 30);
    const commentLength = u16(buffer, offset + 32);
    const localHeaderOffset = u32(buffer, offset + 42);
    const nameStart = offset + 46;
    const nameEnd = nameStart + fileNameLength;
    if (nameEnd > buffer.length) break;
    entries.push({
      name: decodeName(buffer.subarray(nameStart, nameEnd)),
      compressedSize,
      uncompressedSize,
      compressionMethod,
      crc32,
      flags,
      localHeaderOffset,
      modifiedAt: dosDateTime(modifiedDate, modifiedTime),
    });
    offset = nameEnd + extraLength + commentLength;
  }
  return entries;
}

async function readEntry(url: string, entry: StudioZipEntry): Promise<Buffer | null> {
  if (entry.uncompressedSize > MAX_METADATA_ENTRY_BYTES || entry.compressedSize > MAX_METADATA_ENTRY_BYTES) return null;
  if ((entry.flags & 0x1) === 0x1) return null;

  const header = await fetchRange(url, entry.localHeaderOffset, entry.localHeaderOffset + 29);
  if (header.length < 30 || u32(header, 0) !== LOCAL_SIGNATURE) return null;
  const fileNameLength = u16(header, 26);
  const extraLength = u16(header, 28);
  const dataStart = entry.localHeaderOffset + 30 + fileNameLength + extraLength;
  const dataEnd = dataStart + entry.compressedSize - 1;
  if (entry.compressedSize === 0) return Buffer.alloc(0);
  const compressed = await fetchRange(url, dataStart, dataEnd);
  if (entry.compressionMethod === 0) return compressed;
  if (entry.compressionMethod === 8) {
    try {
      return inflateRawSync(compressed, { maxOutputLength: MAX_METADATA_ENTRY_BYTES });
    } catch {
      return null;
    }
  }
  return null;
}

function printableAscii(buffer: Buffer) {
  const values: string[] = [];
  let current = '';
  for (const byte of buffer) {
    if (byte >= 0x20 && byte <= 0x7e) {
      current += String.fromCharCode(byte);
      if (current.length > 160) {
        values.push(current);
        current = '';
      }
    } else {
      if (current.length >= 3) values.push(current);
      current = '';
    }
  }
  if (current.length >= 3) values.push(current);
  return values;
}

function printableUtf16Le(buffer: Buffer) {
  const values: string[] = [];
  let current = '';
  for (let offset = 0; offset + 1 < buffer.length; offset += 2) {
    const code = buffer.readUInt16LE(offset);
    if (code >= 0x20 && code <= 0x7e) {
      current += String.fromCharCode(code);
      if (current.length > 160) {
        values.push(current);
        current = '';
      }
    } else {
      if (current.length >= 3) values.push(current);
      current = '';
    }
  }
  if (current.length >= 3) values.push(current);
  return values;
}

function compactStringCandidates(values: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const raw of values) {
    const value = raw.replace(/\s+/g, ' ').trim();
    if (value.length < 3 || value.length > 120) continue;
    if (!/[A-Za-z]{2}/.test(value)) continue;
    if (/^[A-Fa-f0-9-]{20,}$/.test(value)) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    output.push(value);
    if (output.length >= MAX_STRING_CANDIDATES) break;
  }
  return output;
}

function logicVersionCandidates(strings: string[]) {
  const output = new Set<string>();
  for (let index = 0; index < strings.length; index += 1) {
    const value = strings[index];
    if (!/logic/i.test(value)) continue;
    const joined = [strings[index - 1], value, strings[index + 1]].filter(Boolean).join(' ');
    const versions = joined.match(/\b\d{1,3}\.\d{1,3}(?:\.\d{1,3})?(?:\s*\(\d+\))?\b/g) ?? [];
    for (const version of versions) output.add(version);
  }
  return [...output].slice(0, 12);
}

function sampleRateCandidates(strings: string[]) {
  const rates = new Set<number>();
  const joined = strings.join(' ');
  for (const match of joined.matchAll(/\b(44100|48000|88200|96000|176400|192000)\b/g)) rates.add(Number(match[1]));
  return [...rates].sort((a, b) => a - b);
}

function isAudioEntry(name: string) {
  return /\.(wav|wave|aif|aiff|caf|mp3|m4a|flac|ogg|opus)$/i.test(name);
}

function isUnusedEntry(name: string) {
  return /(^|\/)unused(\/|$)/i.test(name) || /audio files\/unused/i.test(name);
}

function packageRoot(entries: StudioZipEntry[]) {
  for (const entry of entries) {
    const parts = entry.name.split('/').filter(Boolean);
    const index = parts.findIndex((part) => part.toLowerCase().endsWith('.logicx'));
    if (index >= 0) return parts.slice(0, index + 1).join('/');
  }
  return null;
}

function manifestHash(entries: StudioZipEntry[]) {
  const canonical = entries
    .map((entry) => [entry.name, entry.compressedSize, entry.uncompressedSize, entry.crc32, entry.compressionMethod, entry.localHeaderOffset].join('|'))
    .sort()
    .join('\n');
  return createHash('sha256').update(canonical).digest('hex');
}

export async function analyzeStudioSessionPackage(input: {
  signedUrl: string;
  archiveBytes: number;
}): Promise<StudioSessionPackageManifest> {
  const warnings: string[] = ['FULL_ARCHIVE_HASH_NOT_COMPUTED_RANGE_ANALYSIS'];
  if (!Number.isFinite(input.archiveBytes) || input.archiveBytes < 22) {
    throw new StudioMultimodalError('PACKAGE_PARSE_FAILED', 'ZIP archive size is invalid.', 422, { archiveBytes: input.archiveBytes });
  }

  const tailBytes = Math.min(input.archiveBytes, MAX_TAIL_BYTES);
  const tailStart = input.archiveBytes - tailBytes;
  const tail = await fetchRange(input.signedUrl, tailStart, input.archiveBytes - 1);
  const eocdOffset = findEocd(tail);
  if (eocdOffset < 0) throw new StudioMultimodalError('PACKAGE_PARSE_FAILED', 'ZIP end-of-central-directory record was not found.', 422);

  const entryCount = u16(tail, eocdOffset + 10);
  const centralSize = u32(tail, eocdOffset + 12);
  const centralOffset = u32(tail, eocdOffset + 16);
  if (centralSize === 0xffffffff || centralOffset === 0xffffffff || entryCount === 0xffff) {
    throw new StudioMultimodalError('PACKAGE_PARSE_FAILED', 'ZIP64 session packages are not yet supported by the bounded range parser.', 422);
  }
  if (centralSize <= 0 || centralSize > MAX_CENTRAL_BYTES) {
    throw new StudioMultimodalError('PACKAGE_PARSE_FAILED', 'ZIP central directory exceeds the bounded parser limit.', 422, { centralSize, limit: MAX_CENTRAL_BYTES });
  }

  const central = await fetchRange(input.signedUrl, centralOffset, centralOffset + centralSize - 1);
  const entries = parseCentralDirectory(central);
  if (!entries.length) throw new StudioMultimodalError('PACKAGE_PARSE_FAILED', 'No ZIP entries could be parsed from the central directory.', 422);
  if (entries.length !== entryCount) warnings.push(`CENTRAL_DIRECTORY_ENTRY_COUNT_MISMATCH:${entryCount}:${entries.length}`);

  const root = packageRoot(entries);
  const projectDataEntries = entries.filter((entry) => /(^|\/)ProjectData$/i.test(entry.name)).slice(0, 6);
  const candidateStrings: string[] = [];
  for (const entry of projectDataEntries) {
    const bytes = await readEntry(input.signedUrl, entry);
    if (!bytes) {
      warnings.push(`PROJECTDATA_NOT_DECODED:${entry.name}`);
      continue;
    }
    candidateStrings.push(...printableAscii(bytes), ...printableUtf16Le(bytes));
  }
  const strings = compactStringCandidates(candidateStrings);
  const audioEntries = entries.filter((entry) => isAudioEntry(entry.name));
  const unusedAudio = audioEntries.filter((entry) => isUnusedEntry(entry.name));
  const activeAudio = audioEntries.filter((entry) => !isUnusedEntry(entry.name));
  const timestamps = [...new Set(entries.map((entry) => entry.modifiedAt).filter((value): value is string => Boolean(value)))].sort();
  const logicRoot = Boolean(root) || projectDataEntries.some((entry) => entry.name.toLowerCase().includes('.logicx/'));

  if (!projectDataEntries.length) warnings.push('LOGIC_PROJECTDATA_NOT_FOUND');
  if (!logicRoot) warnings.push('LOGIC_PACKAGE_ROOT_NOT_CONFIRMED');

  return {
    format: 'zip',
    daw: logicRoot ? 'Logic Pro' : 'unknown',
    packageRoot: root,
    archiveBytes: input.archiveBytes,
    archiveEntryCount: entries.length,
    totalUncompressedBytes: entries.reduce((sum, entry) => sum + entry.uncompressedSize, 0),
    audioEntryCount: audioEntries.length,
    activeAudioEntryCount: activeAudio.length,
    unusedAudioEntryCount: unusedAudio.length,
    projectDataEntryCount: projectDataEntries.length,
    logicVersionCandidates: logicVersionCandidates(strings),
    sampleRateCandidates: sampleRateCandidates(strings),
    audioAssetNames: audioEntries.map((entry) => entry.name).slice(0, 300),
    activeAudioAssetNames: activeAudio.map((entry) => entry.name).slice(0, 300),
    unusedAudioAssetNames: unusedAudio.map((entry) => entry.name).slice(0, 300),
    projectDataStringCandidates: strings,
    entryTimestamps: timestamps.slice(0, 200),
    archiveManifestSha256: manifestHash(entries),
    sourceFileSha256: null,
    warnings,
  };
}
