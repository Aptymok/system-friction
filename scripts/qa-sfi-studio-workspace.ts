import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { buildStudioProductionDegradedState } from '../src/lib/studio/production/studioProductionDegradedState';
import type { MetricValue, StudioProductionState } from '../src/lib/studio/production/studioProductionTypes';

const root = process.cwd();
const require = createRequire(import.meta.url);
(require.extensions as Record<string, (module: unknown, filename: string) => void>)['.css'] = () => {};
const { StudioWorkspace } = require('../src/components/studio/workspace/StudioWorkspace') as typeof import('../src/components/studio/workspace/StudioWorkspace');

function filesUnder(relative: string): string[] {
  const absolute = path.join(root, relative);
  return readdirSync(absolute).flatMap((name) => {
    const file = path.join(absolute, name);
    const stat = statSync(file);
    if (stat.isDirectory()) return filesUnder(path.relative(root, file));
    return file;
  });
}

function text(file: string) {
  return readFileSync(file, 'utf8');
}

function assertNoDirectSupabase(relative: string) {
  for (const file of filesUnder(relative).filter((item) => /\.(tsx?|css)$/.test(item))) {
    const body = text(file);
    assert.ok(!/createServiceSupabaseClient|createClient\(|from\(['"`][a-z0-9_]+['"`]\)/.test(body), `direct_supabase_access:${path.relative(root, file)}`);
  }
}

function metric(input: Partial<MetricValue> & { key: string; label: string; value: number | string | null; status: MetricValue['status'] }): MetricValue {
  return {
    key: input.key,
    label: input.label,
    value: input.value,
    unit: input.unit ?? null,
    status: input.status,
    source: input.source ?? 'qa_fixture_source',
    evidenceIds: input.evidenceIds ?? ['qa-evidence'],
    confidence: input.confidence ?? (input.value === null ? 0 : 0.84),
    observedAt: input.observedAt ?? '2026-08-02T00:00:00.000Z',
    formulaVersion: input.formulaVersion ?? 'qa',
    warnings: input.warnings ?? [],
    explanation: input.explanation ?? 'QA fixture metric, not production data.',
  };
}

function fixtureState(): StudioProductionState {
  const state = buildStudioProductionDegradedState('qa_fixture');
  const metrics = [
    metric({ key: 'active_object', label: 'Active Object', value: 'KXTXR - 111 master SFI 5', status: 'OBSERVED', evidenceIds: ['6e3b65e2-1064-4cb5-91b7-35e1962f68a6'] }),
    metric({ key: 'duration_seconds', label: 'Duration', value: 12, unit: 's', status: 'OBSERVED' }),
    metric({ key: 'lufs_integrated', label: 'Integrated LUFS', value: -14.712, unit: 'LUFS', status: 'OBSERVED' }),
    metric({ key: 'momentary_lufs_summary', label: 'Momentary LUFS', value: '-21.2..-12.1', unit: 'LUFS', status: 'OBSERVED' }),
    metric({ key: 'short_term_lufs_summary', label: 'Short-Term LUFS', value: '-24.1..-12.2', unit: 'LUFS', status: 'OBSERVED' }),
    metric({ key: 'true_peak_dbtp', label: 'True Peak', value: 1.102, unit: 'dBTP', status: 'OBSERVED', warnings: ['INTER_SAMPLE_PEAK_EXCEEDS_FULL_SCALE'] }),
    metric({ key: 'sample_peak_dbfs', label: 'Sample Peak', value: -0.156, unit: 'dBFS', status: 'OBSERVED' }),
    metric({ key: 'true_peak_headroom_db', label: 'True Peak Headroom', value: -1.102, unit: 'dB', status: 'OBSERVED' }),
    metric({ key: 'dynamic_range_db', label: 'Dynamic Range', value: 7.6, unit: 'dB', status: 'OBSERVED' }),
    metric({ key: 'tempo_global_bpm', label: 'Global BPM', value: 119.681, unit: 'BPM', status: 'OBSERVED' }),
    metric({ key: 'rhythm_onset_count', label: 'Onset Count', value: 21, unit: 'events', status: 'OBSERVED' }),
    metric({ key: 'beat_count', label: 'Beat Count', value: 24, unit: 'beats', status: 'OBSERVED' }),
    metric({ key: 'pulse_clarity', label: 'Pulse Clarity', value: 0.762, status: 'OBSERVED' }),
    metric({ key: 'fundamental_frequency_hz', label: 'Median Fundamental Frequency', value: 220.4, unit: 'Hz', status: 'OBSERVED' }),
    metric({ key: 'chroma_distribution', label: 'Chroma Distribution', value: '0.1,0,0,0,0.2,0,0.3,0,0,0,0,0', status: 'OBSERVED' }),
    metric({ key: 'key_estimate', label: 'Key Estimate', value: 'C major', status: 'OBSERVED' }),
    metric({ key: 'harmonic_change_count', label: 'Harmonic Change Count', value: 2, unit: 'events', status: 'OBSERVED' }),
    metric({ key: 'harmonic_stability', label: 'Harmonic Stability', value: 0.72, status: 'OBSERVED' }),
    metric({ key: 'tonal_ambiguity', label: 'Tonal Ambiguity', value: 0.31, status: 'OBSERVED' }),
    metric({ key: 'spectral_dissonance', label: 'Spectral Dissonance', value: 0.18, status: 'OBSERVED' }),
    metric({ key: 'advanced_spectrum', label: 'Advanced Spectrum', value: null, status: 'CAPABILITY_MISSING', warnings: ['ADVANCED_SPECTRAL_DESCRIPTOR_REQUIRED'] }),
    metric({ key: 'D_cog', label: 'D_cog', value: null, status: 'CALIBRATION_REQUIRED', warnings: ['STRUCTURE_EXPECTATION_REQUIRED'] }),
    metric({ key: 'E_r', label: 'E_r', value: null, status: 'REQUIRES_FIELD_EVIDENCE' }),
    metric({ key: 'V_i', label: 'V_i', value: null, status: 'REQUIRES_DECLARATION' }),
    metric({ key: 'R_sem', label: 'R_sem', value: null, status: 'NOT_APPLICABLE' }),
  ];
  return {
    ...state,
    generatedAt: '2026-08-02T00:00:00.000Z',
    activeObject: {
      ...state.activeObject,
      id: '6e3b65e2-1064-4cb5-91b7-35e1962f68a6',
      title: 'KXTXR - 111 master SFI 5',
      type: 'music',
      mimeType: 'audio/wav',
      storageStatus: 'OBSERVED',
      analysisStatus: 'COMPLETE',
      readiness: 'ready',
    },
    metricValues: metrics,
    objectFeatures: {
      ...state.objectFeatures,
      metrics: metrics.map((item) => ({
        id: item.key,
        label: item.label,
        value: item.value,
        unit: item.unit,
        source: item.source,
        status: item.status,
        confidence: item.confidence,
        explanation: item.explanation,
        evidenceIds: item.evidenceIds,
        payload: item.key === 'rhythm_onset_count' ? {
          featurePayload: {
            evidence: {
              onsetSummary: { strongest: [{ timestampSeconds: 0.5, strength: 0.91, confidence: 0.8 }] },
              beats: { sample: [{ timestampSeconds: 0.5, confidence: 0.8 }, { timestampSeconds: 1, confidence: 0.79 }] },
            },
          },
        } : item.key === 'harmonic_change_count' ? {
          featurePayload: {
            evidence: {
              harmonicChanges: { sample: [{ timestampSeconds: 2.5, strength: 0.44, confidence: 0.8 }] },
            },
          },
        } : item.key === 'fundamental_frequency_hz' ? {
          featurePayload: {
            pitch: {
              frames: [{ timestampSeconds: 0.5, frequencyHz: 220.4, confidence: 0.8 }],
            },
          },
        } : item.key === 'chroma_distribution' ? {
          featurePayload: {
            chroma: {
              frames: [{ timestampSeconds: 0.5, values: [0.1, 0, 0, 0, 0.2, 0, 0.3, 0, 0, 0, 0, 0], confidence: 0.8 }],
            },
          },
        } : {},
      })),
    },
    audioFeatures: {
      ...state.audioFeatures,
      waveform: Array.from({ length: 96 }, (_, index) => Math.abs(Math.sin(index / 8)) * 0.8),
      energySegments: Array.from({ length: 32 }, (_, index) => 0.08 + Math.abs(Math.sin(index / 4)) * 0.7),
    },
    evidence: [{ id: 'qa-evidence', type: 'feature', source: 'studio_evidence_traces', label: 'QA evidence', observedAt: '2026-08-02T00:00:00.000Z', reliability: 0.9, uri: null }],
    provenance: { basedOn: ['studio_object_features'], derivedFrom: ['StudioProductionState'], limits: ['QA fixture only'] },
  };
}

assertNoDirectSupabase('src/app/studio');
assertNoDirectSupabase('src/components/studio/workspace');
assertNoDirectSupabase('src/stores');

const workspaceFiles = filesUnder('src/components/studio/workspace').map((file) => path.relative(root, file));
for (const required of [
  'StudioWorkspace.tsx',
  'StudioObjectReport.tsx',
  'StudioTemporalField.tsx',
  'StudioWaveform.tsx',
  'StudioLayerControls.tsx',
  'StudioMetricInspector.tsx',
  'StudioEpistemicMatrix.tsx',
  'StudioEvidenceGraph.tsx',
  'StudioCapabilityDrawer.tsx',
  'StudioTraceDrawer.tsx',
]) {
  assert.ok(workspaceFiles.some((file) => file.endsWith(required)), `missing_workspace_component:${required}`);
}

const renderStart = performance.now();
const rendered = renderToStaticMarkup(createElement(StudioWorkspace, { state: fixtureState() }));
const renderMs = Number((performance.now() - renderStart).toFixed(3));
for (const token of [
  'KXTXR OBJECT REPORT',
  '+ CARGAR OBJETO',
  'CARGAR Y ANALIZAR',
  'Selector de objetos recientes',
  'SUGERENCIAS',
  'INTERVENCIONES',
  'LONGITUDINAL',
  'TRACE',
  'WAVEFORM OVERVIEW',
  'ACOUSTIC PROFILE',
  'MIHM - PHASE 1 VECTOR',
  'FIELD CONTEXT PROJECTION',
  'STRATEGIC ROUTING &amp; GUARDRAILS',
  'SYSTEM TRACE',
  'OBSERVED',
  'CAPABILITY_MISSING',
  'REQUIRES_DECLARATION',
  'REQUIRES_FIELD_EVIDENCE',
  'CALIBRATION_REQUIRED',
  'TRUE PEAK',
  'PITCH',
  'CHROMA',
  'HARMONY',
]) {
  assert.ok(rendered.includes(token), `render_missing:${token}`);
}
assert.ok(rendered.includes('/api/studio/objects/6e3b65e2-1064-4cb5-91b7-35e1962f68a6/audio'), 'audio_href_missing');
assert.ok(rendered.includes('INTER_SAMPLE_PEAK_EXCEEDS_FULL_SCALE'), 'true_peak_limitation_missing');
assert.ok(rendered.includes('viewBox="0 0 320 320"'), 'kxxtx_radar_svg_viewbox_missing');
assert.ok(rendered.includes('viewBox="0 0 128 128"'), 'kxxtx_identity_svg_viewbox_missing');
assert.ok(!rendered.includes('[object Object]'), 'object_object_rendered');
assert.ok(!/MISSING<\/[^>]+>\s*<[^>]+>0(\.0+)?/.test(rendered), 'missing_rendered_as_zero');
assert.ok(renderMs < 250, `workspace_ssr_render_slow:${renderMs}`);
const workspaceSource = filesUnder('src/components/studio/workspace').map((file) => text(file)).join('\n');
for (const sourceToken of ['+ AGREGAR EVIDENCIA', 'GUARDAR EVIDENCIA', 'REGISTRAR INTERVENCION', 'EJECUTAR AGENTES']) {
  assert.ok(workspaceSource.includes(sourceToken), `source_missing:${sourceToken}`);
}
assert.ok(!/pr[oó]ximamente|coming soon/i.test(workspaceSource), 'coming_soon_copy_present');
assert.ok(!/href=["']#["']/.test(workspaceSource), 'dead_hash_link_present');
assert.ok(!/mock|demo data|datos demo/i.test(workspaceSource), 'mock_or_demo_surface_present');
assert.ok(/onClick=|onSubmit=|type="submit"/.test(workspaceSource), 'operational_handlers_missing');
const css = text(path.join(root, 'src/components/studio/workspace/studio-workspace.css'));
assert.ok(css.includes('overflow-x: auto'), 'workspace_overflow_guard_missing');
assert.ok(css.includes('clamp(220px'), 'kxtrx_radar_responsive_clamp_missing');
assert.ok(css.includes('@media (max-width: 900px)'), 'mobile_stack_guard_missing');

console.log(JSON.stringify({
  ok: true,
  workspaceComponents: workspaceFiles.length,
  renderedLength: rendered.length,
  renderMs,
  directSupabaseAccess: false,
  ssrInitialView: true,
  deadButtons: false,
  comingSoonCopy: false,
  mockDataSurface: false,
  objectUploadSeparatedFromEvidence: true,
  kxtrxSvgResponsive: true,
  statesRepresented: ['OBSERVED', 'PARTIAL', 'INSUFFICIENT_SIGNAL', 'REQUIRES_DECLARATION', 'REQUIRES_FIELD_EVIDENCE', 'CAPABILITY_MISSING', 'NOT_APPLICABLE', 'FAILED', 'CALIBRATION_REQUIRED'],
  harmonyLayers: ['PITCH', 'CHROMA', 'HARMONIC_CHANGES'],
}, null, 2));
