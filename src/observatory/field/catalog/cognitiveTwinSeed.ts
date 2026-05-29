import { deriveAccessMode, type CognitiveTwinSeed, type FieldAccessMode, type FieldDocumentCatalogItem, type FieldNodeCatalogItem, type MihmRuntimeMatrix, type PatternCatalogItem, type ExecutionCatalogItem } from './fieldMatrixBuilder';

export function buildCognitiveTwinSeed(input: {
  user?: unknown;
  profile?: Record<string, unknown> | null;
  node?: Record<string, unknown> | null;
  entitlements?: Record<string, unknown> | null;
  nodeCatalog: FieldNodeCatalogItem[];
  documentCatalog: FieldDocumentCatalogItem[];
  patternCatalog: PatternCatalogItem[];
  executionCatalog: ExecutionCatalogItem[];
  mihmRuntimeMatrix: MihmRuntimeMatrix;
  recentEvents?: unknown[];
  recentKernelCycles?: unknown[];
  latestWorldSpect?: unknown | null;
  accessMode?: FieldAccessMode;
}): CognitiveTwinSeed {
  const accessMode = input.accessMode ?? deriveAccessMode({
    user: input.user,
    profile: input.profile,
    entitlements: input.entitlements,
  });

  return {
    accessMode,
    profile: input.profile ?? null,
    node: input.node ?? null,
    nodeCatalog: input.nodeCatalog,
    documentCatalog: input.documentCatalog,
    patternCatalog: input.patternCatalog,
    executionCatalog: input.executionCatalog,
    mihmRuntimeMatrix: input.mihmRuntimeMatrix,
    recentEvents: input.recentEvents ?? [],
    recentKernelCycles: input.recentKernelCycles ?? [],
    latestWorldSpect: input.latestWorldSpect ?? null,
  };
}
