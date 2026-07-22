import 'server-only';

import { readSfiCognitiveRuntime } from '@/lib/sfi/cognitive-runtime/runtime';
import { source } from './readerSupport';

export async function readRootCognitiveRuntime() {
  const runtime = await readSfiCognitiveRuntime();
  const errors = [
    ...runtime.eventGraph.warnings,
    ...runtime.layers.flatMap((layer) => layer.warnings),
  ];

  return source(
    runtime,
    'sfi_cognitive_runtime + existing persistence surfaces',
    errors.length ? [errors.slice(0, 12).join(' | ')] : [],
    runtime.generatedAt,
    runtime.status === 'missing',
  );
}
