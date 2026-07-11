from pathlib import Path


def replace_once(path: str, old: str, new: str) -> bool:
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    if new in text:
        return False
    if old not in text:
        raise RuntimeError(f'Expected source not found in {path}: {old[:120]!r}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')
    return True


def write_if_changed(path: str, content: str) -> bool:
    file = Path(path)
    normalized = content.strip() + '\n'
    current = file.read_text(encoding='utf-8') if file.exists() else ''
    if current == normalized:
        return False
    file.write_text(normalized, encoding='utf-8')
    return True


changed = []

if replace_once(
    'src/lib/studio/production/studioProductionTypes.ts',
    '  value: number | null;\n',
    '  value: number | string | null;\n',
):
    changed.append('studioProductionTypes')

adapter = 'src/lib/studio/production/studioProductionAdapter.ts'
if replace_once(
    adapter,
    'async function queryLatestSessionAndObject(): Promise<StudioStoredState> {',
    'async function queryLatestSessionAndObject(ownerId?: string | null, includeLegacy = false): Promise<StudioStoredState> {',
):
    changed.append('owner-aware query signature')

if replace_once(
    adapter,
    """    const { data: session, error: sessionError } = await supabase
      .from('studio_sessions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();""",
    """    let sessionQuery = supabase
      .from('studio_sessions')
      .select('*');

    if (ownerId) {
      sessionQuery = includeLegacy
        ? sessionQuery.or(`owner_id.eq.${ownerId},owner_id.is.null`)
        : sessionQuery.eq('owner_id', ownerId);
    }

    const { data: session, error: sessionError } = await sessionQuery
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();""",
):
    changed.append('owner-aware session query')

if replace_once(
    adapter,
    '    const numeric = asNumber(row.numeric_value);\n    const payload = asRecord(row.payload);',
    "    const numeric = asNumber(row.numeric_value);\n    const text = asString(row.text_value) || null;\n    const value = numeric ?? text;\n    const payload = asRecord(row.payload);",
):
    changed.append('text metric read')

for old, new, label in [
    ('      value: numeric,', '      value,', 'metric value'),
    ("      status: (asString(payload.status) as MetricStatus) || (numeric === null ? 'MISSING' as const : 'OBSERVED' as const),", "      status: (asString(payload.status) as MetricStatus) || (value === null ? 'MISSING' as const : 'OBSERVED' as const),", 'metric status'),
    ('      confidence: clampConfidence(row.confidence ?? (numeric === null ? 0 : 1)),', '      confidence: clampConfidence(row.confidence ?? (value === null ? 0 : 1)),', 'metric confidence'),
    ("    return metrics.find((item) => item.id === key)?.value ?? null;", "    const value = metrics.find((item) => item.id === key)?.value ?? null;\n    return typeof value === 'number' ? value : null;", 'numeric metric selector'),
    ("explanation: 'Count of persisted feature rows with numeric values over total persisted feature rows.',", "explanation: 'Count of persisted feature rows with numeric or textual values over total persisted feature rows.',", 'coverage explanation'),
    ('export async function readStudioProductionState(): Promise<StudioProductionState> {', 'export async function readStudioProductionState(options: { ownerId?: string | null; includeLegacy?: boolean } = {}): Promise<StudioProductionState> {', 'state signature'),
    ('      queryLatestSessionAndObject(),', '      queryLatestSessionAndObject(options.ownerId, options.includeLegacy ?? false),', 'state query call'),
    ('      weight: metric.value,', "      weight: typeof metric.value === 'number' ? metric.value : null,", 'numeric layer weight'),
    ("...metrics.filter((metric) => metric.value !== null).map((metric) => ({ id: metric.id, label: metric.label, layer: 'feature', value: metric.value })),", "...metrics.filter((metric) => typeof metric.value === 'number').map((metric) => ({ id: metric.id, label: metric.label, layer: 'feature', value: metric.value as number })),", 'numeric graph nodes'),
]:
    if replace_once(adapter, old, new):
        changed.append(label)

if write_if_changed(
    'src/app/studio/page.tsx',
    """
import { StudioProductionConsole } from '@/components/studio/production/StudioProductionConsole';
import { readStudioProductionState } from '@/lib/studio/production/studioProductionAdapter';
import { requireAuthenticatedUser, requireFounder } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';

export default async function StudioPage() {
  const { user } = await requireAuthenticatedUser();
  let includeLegacy = false;
  try {
    await requireFounder();
    includeLegacy = true;
  } catch {
    includeLegacy = false;
  }
  const state = await readStudioProductionState({ ownerId: user.id, includeLegacy });
  return <StudioProductionConsole state={state} />;
}
""",
):
    changed.append('owned Studio page')

shell = 'src/components/studio/production/StudioProductionShell.tsx'
for old, new, label in [
    ('<dd>{Number(metric.confidence.toFixed(3))}</dd>', "<dd>{metric.status === 'MISSING' || metric.source === null ? 'UNKNOWN' : Number(metric.confidence.toFixed(3))}</dd>", 'metric confidence display'),
    ('<dt>Confidence</dt><dd>{Number(selected.confidence.toFixed(3))}</dd>', "<dt>Confidence</dt><dd>{selected.status === 'MISSING' || selected.source === null ? 'UNKNOWN' : Number(selected.confidence.toFixed(3))}</dd>", 'node confidence display'),
    ("""      </dl>
    </Panel>
  );
}

function ExecutiveReading""", """      </dl>
      {state.activeObject.id ? (
        <a href={`/api/studio/objects/${encodeURIComponent(state.activeObject.id)}/content`} target="_blank" rel="noreferrer">
          OPEN PRIVATE OBJECT
        </a>
      ) : null}
    </Panel>
  );
}

function ExecutiveReading""", 'private content link'),
]:
    if replace_once(shell, old, new):
        changed.append(label)

evaluation = 'src/components/studio/production/StudioEvaluationStrip.tsx'
if replace_once(
    evaluation,
    "<em>{item ? `${item.status} / ${item.source ?? 'NO_SOURCE'} / ${Number(item.confidence.toFixed(2))}` : 'MISSING'}</em>",
    "<em>{item ? `${item.status} / ${item.source ?? 'NO_SOURCE'} / ${item.status === 'MISSING' || item.source === null ? 'UNKNOWN' : Number(item.confidence.toFixed(2))}` : 'MISSING'}</em>",
):
    changed.append('evaluation confidence display')

for path, old, new, label in [
    ('src/lib/studio/multimodal/textAnalyzer.ts', '      themes,\n      motifs,', "      themes: themes.map((item) => `${item.term}:${item.count}`),\n      motifs: motifs.map((item) => `${item.phrase}:${item.count}`),", 'text arrays'),
    ('src/lib/studio/multimodal/structuredAnalyzer.ts', '        topic_clusters: clusters,', "        topic_clusters: clusters.map((item) => `${item.term}:${item.count}`),", 'community topic arrays'),
    ('src/lib/studio/multimodal/structuredAnalyzer.ts', '      semantic_anchors: anchors,', "      semantic_anchors: anchors.map((item) => `${item.term}:${item.count}`),", 'coordinate anchor arrays'),
    ('src/lib/studio/multimodal/imageAnalyzer.ts', '        dominant_colors: measured.dominantColors,', "        dominant_colors: measured.dominantColors.map((item) => `${item.hex}:${item.share}`),", 'image color arrays'),
    ('src/lib/studio/audio/audioTypes.ts', "export const STUDIO_AUDIO_ENGINE_NAME = 'studio_audio_node_wav_engine';\nexport const STUDIO_AUDIO_ENGINE_VERSION = '2026-07-11.1';", "export const STUDIO_AUDIO_ENGINE_NAME = 'studio_audio_ffmpeg_pcm_feature_engine';\nexport const STUDIO_AUDIO_ENGINE_VERSION = '2026-07-11.2';", 'audio engine identity'),
    ('src/lib/studio/audio/audioStorage.ts', 'const DEFAULT_MAX_FILE_BYTES = 75 * 1024 * 1024;', 'const DEFAULT_MAX_FILE_BYTES = 150 * 1024 * 1024;', 'audio byte limit'),
]:
    if replace_once(path, old, new):
        changed.append(label)

print('Applied:', ', '.join(changed) if changed else 'no changes')
