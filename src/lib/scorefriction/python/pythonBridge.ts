import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

const PYTHON_TIMEOUT_MS = 60_000;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac']);
const TEXT_EXTENSIONS = new Set(['.txt', '.md']);
const SCRIPT_NAMES = {
  audioFeatures: 'audio_features.py',
  lyricsExtractor: 'lyrics_extractor.py',
  mihmFull: 'mihm_extract_full.py',
  monteCarlo: 'montecarlo.py',
  worldCli: 'world_cli.py',
} as const;

export type PythonBridgeFile = {
  name: string;
  type?: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export type PythonBridgeResult<T = unknown> = {
  ok: true;
  data: T;
  stderr?: string;
} | {
  ok: false;
  error: string;
  stderr?: string;
  technical?: string;
};

export type PythonScoreFrictionAnalysisInput = {
  audioFile?: PythonBridgeFile | null;
  textFile?: PythonBridgeFile | null;
  text?: string | null;
  metadata?: Record<string, unknown> | null;
  nti?: number | null;
  caseId?: string | null;
  evidenceType?: string | null;
};

type TempFile = {
  path: string;
  cleanup(): Promise<void>;
};

function pythonBin() {
  return process.env.SCOREFRICTION_PYTHON_BIN || process.env.PYTHON_BIN || process.env.PYTHON || 'python';
}

function pythonRoot() {
  return path.join(/*turbopackIgnore: true*/ process.cwd(), 'python', 'scorefriction');
}

function scriptPath(script: keyof typeof SCRIPT_NAMES) {
  return path.join(pythonRoot(), SCRIPT_NAMES[script]);
}

function sanitizeStderr(stderr: string) {
  return stderr
    .split(/\r?\n/)
    .filter((line) => !line.includes('Traceback') && !line.trim().startsWith('File "'))
    .join('\n')
    .trim()
    .slice(0, 2000);
}

function errorCode(value: unknown) {
  const raw = typeof value === 'string' && value.trim() ? value : 'python_scorefriction_failed';
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 96) || 'python_scorefriction_failed';
}

function safeJsonParse(stdout: string) {
  const trimmed = stdout.trim();
  if (!trimmed) throw new Error('python_stdout_empty');
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) return JSON.parse(trimmed.slice(first, last + 1));
  return JSON.parse(trimmed);
}

function assertKnownScript(script: keyof typeof SCRIPT_NAMES) {
  const fullPath = scriptPath(script);
  if (!fullPath.startsWith(pythonRoot())) throw new Error('python_script_path_invalid');
  return fullPath;
}

async function createTempFile(file: PythonBridgeFile, allowed: Set<string>, prefix: string): Promise<TempFile> {
  if (file.size > MAX_FILE_SIZE_BYTES) throw new Error('scorefriction_python_file_too_large');
  const ext = path.extname(file.name).toLowerCase();
  if (!allowed.has(ext)) throw new Error(`scorefriction_python_extension_not_allowed_${ext.replace('.', '') || 'none'}`);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'scorefriction-python-'));
  const target = `${dir}${path.sep}${prefix}-${randomUUID()}${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(target, bytes);
  return {
    path: target,
    cleanup: async () => {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
    },
  };
}

async function writeTempText(text: string): Promise<TempFile> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'scorefriction-python-'));
  const target = path.join(dir, `lyrics-${randomUUID()}.txt`);
  await fs.writeFile(target, text, 'utf8');
  return {
    path: target,
    cleanup: async () => {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
    },
  };
}

async function runPythonJson<T>(script: keyof typeof SCRIPT_NAMES, args: string[], timeoutMs = PYTHON_TIMEOUT_MS): Promise<PythonBridgeResult<T>> {
  const fullScriptPath = assertKnownScript(script);
  void fullScriptPath;
  void args;
  void timeoutMs;

  return {
    ok: false,
    error: 'python_bridge_disabled_in_next_bundle',
    technical: 'Python execution is disabled inside Next route bundles to avoid broad Turbopack tracing. Use an external worker or explicit service boundary.',
  };
}

async function runPythonText(script: keyof typeof SCRIPT_NAMES, args: string[], timeoutMs = PYTHON_TIMEOUT_MS): Promise<PythonBridgeResult<string>> {
  const fullScriptPath = assertKnownScript(script);
  void fullScriptPath;
  void args;
  void timeoutMs;

  return {
    ok: false,
    error: 'python_bridge_disabled_in_next_bundle',
    technical: 'Python execution is disabled inside Next route bundles to avoid broad Turbopack tracing. Use an external worker or explicit service boundary.',
  };
}

export async function runMihmFullExtractor(audioPath: string, options: { text?: string | null; nti?: number | null; noText?: boolean } = {}) {
  const args = [audioPath, '--nti', String(Number.isFinite(options.nti) ? options.nti : 0.5)];
  if (options.text && options.text.trim()) {
    args.push('--text', options.text.trim());
  } else if (options.noText) {
    args.push('--no-text');
  }
  return runPythonJson<Record<string, unknown>>('mihmFull', args);
}

export async function runLyricsExtractor(input: { text?: string | null; textFilePath?: string | null; audioPath?: string | null; language?: string | null }) {
  const args: string[] = [];
  if (input.textFilePath) args.push('--file', input.textFilePath);
  else if (input.text && input.text.trim()) args.push('--text', input.text.trim());
  else if (input.audioPath) args.push('--audio', input.audioPath);
  else return { ok: false as const, error: 'scorefriction_text_required' };
  if (input.language) args.push('--language', input.language);
  return runPythonJson<Record<string, unknown>>('lyricsExtractor', args);
}

function parseMonteCarlo(stdout: string) {
  const lines = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const best = lines
    .filter((line) => /^Hora \d{2}:00\s+media=/.test(line))
    .slice(0, 5)
    .map((line) => {
      const match = line.match(/^Hora (\d{2}):00\s+media=([0-9.]+)(?:\s+\[10-90%:\s+([0-9.]+)-([0-9.]+)\])?/);
      return match ? { hour: Number(match[1]), mean: Number(match[2]), p10: Number(match[3] ?? NaN), p90: Number(match[4] ?? NaN), raw: line } : { raw: line };
    });
  const worstStart = lines.findIndex((line) => line.includes('Peores ventanas'));
  const interpretationStart = lines.findIndex((line) => line.includes('Interpretaci'));
  const worst = worstStart >= 0
    ? lines.slice(worstStart + 1, interpretationStart > worstStart ? interpretationStart : worstStart + 4)
      .filter((line) => /^Hora \d{2}:00/.test(line))
      .map((line) => {
        const match = line.match(/^Hora (\d{2}):00\s+media=([0-9.]+)/);
        return match ? { hour: Number(match[1]), mean: Number(match[2]), raw: line } : { raw: line };
      })
    : [];
  const interpretation = interpretationStart >= 0 ? lines.slice(interpretationStart + 1).filter((line) => !line.includes('Gr')).join(' ') : '';
  return { best, worst, interpretation, raw: stdout };
}

export async function runMonteCarlo(_input: Record<string, unknown> = {}) {
  const result = await runPythonText('monteCarlo', []);
  if (!result.ok) return result;
  return { ok: true as const, data: parseMonteCarlo(result.data), stderr: result.stderr };
}

export async function runWorldSpectrum() {
  return runPythonJson<Record<string, unknown>>('worldCli', []);
}

export async function runPythonScoreFrictionAnalysis(input: PythonScoreFrictionAnalysisInput): Promise<PythonBridgeResult<Record<string, unknown>>> {
  const tempFiles: TempFile[] = [];
  try {
    const cleanText = input.text?.trim() || null;
    const audioTemp = input.audioFile ? await createTempFile(input.audioFile, AUDIO_EXTENSIONS, 'audio') : null;
    if (audioTemp) tempFiles.push(audioTemp);
    const textTemp = input.textFile ? await createTempFile(input.textFile, TEXT_EXTENSIONS, 'text') : null;
    if (textTemp) tempFiles.push(textTemp);
    const fileText = textTemp ? await fs.readFile(textTemp.path, 'utf8') : null;
    const text = cleanText ?? fileText;

    if (audioTemp) {
      const result = await runMihmFullExtractor(audioTemp.path, { text, nti: input.nti, noText: !text });
      if (!result.ok) return result;
      const data = result.data;
      return {
        ok: true,
        data: {
          analyzer: 'python_mihm',
          mode: 'local_python',
          case_id: input.caseId ?? null,
          evidence_type: input.evidenceType ?? 'audio_file_analysis',
          metadata: input.metadata ?? {},
          ...data,
        },
        stderr: result.stderr,
      };
    }

    if (text) {
      const result = await runLyricsExtractor({ text });
      if (!result.ok) return result;
      return {
        ok: true,
        data: {
          analyzer: 'python_lyrics',
          mode: 'local_python',
          case_id: input.caseId ?? null,
          evidence_type: input.evidenceType ?? 'lyrics',
          metadata: input.metadata ?? {},
          ...result.data,
        },
        stderr: result.stderr,
      };
    }

    return { ok: false, error: 'scorefriction_python_input_required' };
  } catch (error) {
    return { ok: false, error: errorCode(error instanceof Error ? error.message : 'scorefriction_python_failed') };
  } finally {
    await Promise.all(tempFiles.map((file) => file.cleanup()));
  }
}

export const scoreFrictionPythonBridgeConfig = {
  pythonRoot,
  timeoutMs: PYTHON_TIMEOUT_MS,
  maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
  audioExtensions: [...AUDIO_EXTENSIONS],
  textExtensions: [...TEXT_EXTENSIONS],
};
