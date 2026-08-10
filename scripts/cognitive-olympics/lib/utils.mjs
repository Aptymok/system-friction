import { createHash, randomUUID } from 'node:crypto';
import { mkdir, appendFile, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

export const clamp01 = (n) => Math.max(0, Math.min(1, Number(n) || 0));
export const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
export const sha256 = (value) => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
export const runId = () => `cl-${Date.now()}-${randomUUID().slice(0, 8)}`;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function seededRandom(seed) {
  let h = 2166136261 >>> 0;
  for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => {
    h += 0x6D2B79F5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sampleDeterministic(items, n, seed) {
  if (items.length <= n) return [...items];
  const rnd = seededRandom(seed);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export async function ensureDir(dir) { await mkdir(dir, { recursive: true }); return dir; }
export async function writeJson(file, value) { await ensureDir(path.dirname(file)); await writeFile(file, `${JSON.stringify(value, null, 2)}\n`); }
export async function readJson(file) { return JSON.parse(await readFile(file, 'utf8')); }
export async function appendJsonl(file, value) { await ensureDir(path.dirname(file)); await appendFile(file, `${JSON.stringify(value)}\n`); }

export function parseJsonLoose(text) {
  if (typeof text !== 'string') return text;
  try { return JSON.parse(text); } catch {}
  const start = text.indexOf('{'); const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
  throw new Error('Model did not return valid JSON');
}
