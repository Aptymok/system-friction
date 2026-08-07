import 'server-only';

import { readObservedSfiCognitiveRuntime } from '@/lib/sfi/cognitive-runtime/observedRuntime';
import { source } from './readerSupport';

export async function readRootCognitiveRuntime() {
  const runtime = await readObservedSfiCognitiveRuntime();

  const errors = [
    ...runtime.eventGraph.warnings,
    ...runtime.layers.flatMap((layer) => layer.warnings),
  ];

  return source(
    runtime,
    'cognitive agent registry + epistemic_events + probed persistence surfaces',
    errors.length ? [errors.slice(0, 12).join(' | ')] : [],
    runtime.generatedAt,
    runtime.status === 'missing',
  );
}
