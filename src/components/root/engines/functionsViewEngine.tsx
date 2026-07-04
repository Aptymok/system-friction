import { RootSceneViewport } from '../scene/RootSceneViewport';
import type { RootSceneModel } from '../scene/rootSceneTypes';
import { ROOT_FUNCTIONS_CATALOG, getFunctionAvailability, type RootFunctionItem, type RootFunctionStatus } from '../rootFunctionsCatalog';

const FAMILIES: RootFunctionItem['family'][] = ['evaluate', 'calculate', 'model', 'scorefriction', 'moph', 'vectors', 'evidence', 'laboratory', 'publication', 'attractors'];

function pct(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function familyStatus(items: RootFunctionItem[]): RootFunctionStatus {
  if (items.some((item) => item.status === 'available')) return 'available';
  if (items.some((item) => item.status === 'partial')) return 'partial';
  return 'gated';
}

export default function FunctionsViewEngine() {
  const availability = getFunctionAvailability();
  const nodes = FAMILIES.map((family, index) => {
    const items = ROOT_FUNCTIONS_CATALOG.filter((item) => item.family === family);
    const angle = (index / FAMILIES.length) * Math.PI * 2 - Math.PI / 2;
    const radius = index % 2 ? 38 : 29;
    const available = items.filter((item) => item.status === 'available').length;
    const partial = items.filter((item) => item.status === 'partial').length;
    const gated = items.filter((item) => item.status === 'gated').length;
    const status = familyStatus(items);
    return {
      id: `function-${family}`,
      label: family.toUpperCase(),
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
      value: `${available}/${partial}/${gated}`,
      status,
      kind: 'function-family',
      source: 'rootFunctionsCatalog',
      meaning: `${family} family. Available ${available}, partial ${partial}, gated ${gated}.`,
      dataClass: 'derived' as const,
    };
  });

  const scene: RootSceneModel = {
    title: 'Institute Functions',
    subtitle: 'Functional matrix',
    nodes: [
      {
        id: 'root-tools-core',
        label: 'TOOLS',
        x: 50,
        y: 50,
        value: pct(availability.score),
        status: 'partial',
        kind: 'core',
        source: 'getFunctionAvailability()',
        meaning: 'ROOT CORE/TOOLS center. Capacity is derived from available and partial catalog items.',
        dataClass: 'derived',
      },
      ...nodes,
    ],
    edges: nodes.map((node) => ({
      id: `tools-${node.id}`,
      from: 'root-tools-core',
      to: node.id,
      weight: node.status === 'available' ? 0.9 : node.status === 'partial' ? 0.55 : 0.25,
      kind: node.status,
      source: 'rootFunctionsCatalog.status',
      meaning: `${node.label} family availability vector.`,
    })),
    rings: [
      { id: 'available-ring', radius: 18, weight: availability.available / Math.max(1, availability.total), label: 'AVL', source: 'ROOT_FUNCTIONS_CATALOG available count', meaning: 'Available function orbit.' },
      { id: 'partial-ring', radius: 30, weight: availability.partial / Math.max(1, availability.total), label: 'PRT', source: 'ROOT_FUNCTIONS_CATALOG partial count', meaning: 'Partial function orbit.' },
      { id: 'gated-ring', radius: 42, weight: 1 - availability.score, label: 'GTD', source: 'ROOT_FUNCTIONS_CATALOG gated count', meaning: 'Gated function orbit.' },
    ],
    annotations: [],
    readouts: [
      { id: 'total', label: 'total', value: availability.total, source: 'ROOT_FUNCTIONS_CATALOG.length', meaning: 'Declared ROOT function count.', dataClass: 'real' },
      { id: 'available', label: 'available', value: availability.available, source: 'ROOT_FUNCTIONS_CATALOG.status', meaning: 'Available functions.', dataClass: 'real' },
      { id: 'partial', label: 'partial', value: availability.partial, source: 'ROOT_FUNCTIONS_CATALOG.status', meaning: 'Partial functions.', dataClass: 'real' },
      { id: 'capacity', label: 'capacity', value: pct(availability.score), source: 'getFunctionAvailability()', meaning: 'Derived capacity score.', dataClass: 'derived' },
    ],
  };

  return <RootSceneViewport model={scene} />;
}
