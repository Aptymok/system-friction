'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type JsonRecord = Record<string, unknown>;

type HorizonRegion = {
  id: string;
  label: string;
  route: string;
  desc: string;
  x: number;
  z: number;
  evidence: number | null;
  events: number | null;
  weight: number;
  sourceState: string;
  source: string;
};

type HorizonNode = HorizonRegion & {
  major: boolean;
  parent?: string;
  phase: number;
  size: number;
};

type LandingModel = {
  loadedAt: string | null;
  sourceState: string;
  warnings: string[];
  totals: {
    nodes: number | null;
    evidence: number | null;
    patterns: number | null;
    proposals: number | null;
    friction: number | null;
    coherence: number | null;
  };
  regions: HorizonRegion[];
  nodes: HorizonNode[];
  links: Array<[number, number, number]>;
};

const EMPTY_MODEL: LandingModel = {
  loadedAt: null,
  sourceState: 'cargando',
  warnings: [],
  totals: { nodes: null, evidence: null, patterns: null, proposals: null, friction: null, coherence: null },
  regions: [],
  nodes: [],
  links: [],
};

const REGION_LAYOUT: Record<string, Pick<HorizonRegion, 'id' | 'label' | 'route' | 'desc' | 'x' | 'z'>> = {
  worldspect: {
    id: 'worldspect',
    label: 'WORLDSPECT',
    route: '/worldspect',
    desc: 'Observatorio de degradacion sistemica, tension externa y lectura de campo global.',
    x: -0.62,
    z: 0.18,
  },
  scorefriction: {
    id: 'scorefriction',
    label: 'SCOREFRICTION',
    route: '/scorefriction',
    desc: 'Observatorio de emergencia cultural, evidencia musical y protoatractores creativos.',
    x: 0.44,
    z: 0.34,
  },
  atlas: {
    id: 'atlas',
    label: 'ATLAS',
    route: '/campo?read=1',
    desc: 'Repositorio longitudinal de documentos, evidencias, patrones y memoria de campo.',
    x: -0.2,
    z: -0.35,
  },
  moph: {
    id: 'moph',
    label: 'MOP-H',
    route: '/moph',
    desc: 'Instrumento de observacion humana no clinica y perturbacion minima.',
    x: 0.12,
    z: 0.04,
  },
  root: {
    id: 'root',
    label: 'ROOT',
    route: '/root',
    desc: 'Interprete interno del Instituto: ACP, propuestas, ledger y lectura constitucional.',
    x: 0.58,
    z: -0.28,
  },
  constitution: {
    id: 'constitution',
    label: 'REPOSITORIO',
    route: '/repository',
    desc: 'Campo fundacional navegable: carta, modelos, observatorios y conexiones del ecosistema SFI.',
    x: 0,
    z: -0.62,
  },
};

const ROUTE_STEPS = [
  'Entrada: reconocer que existe un campo.',
  'Comprension: que es SFI.',
  'Observacion: leer nodos y tensiones.',
  'Evidencia: abrir regiones operativas.',
  'Umbral: decidir si observar, participar o construir.',
];

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function stableUnit(value: string) {
  return (stableHash(value) % 10000) / 10000;
}

function shortId(value: string | null) {
  if (!value) return 'NodoID_SFI';
  return `NodoID_${stableHash(value).toString().slice(0, 7).padStart(7, '0')}`;
}

function sourceStateFrom(count: number | null, warning: boolean) {
  if (warning) return 'degradado';
  if (count === null) return 'sin datos';
  if (count > 0) return 'observado';
  return 'latente';
}

function pickScoreNumber(score: JsonRecord | null, path: string[]) {
  let current: unknown = score;
  for (const key of path) current = isRecord(current) ? current[key] : undefined;
  return numberValue(current);
}

function deriveLandingModel(field: JsonRecord | null, score: JsonRecord | null): LandingModel {
  const graph = isRecord(field?.graph) ? field.graph : {};
  const worldspect = isRecord(field?.worldspect) ? field.worldspect : {};
  const kernel = isRecord(field?.kernel) ? field.kernel : {};
  const mihmRuntimeMatrix = isRecord(field?.mihmRuntimeMatrix) ? field.mihmRuntimeMatrix : {};
  const warnings = records(field?.warnings).length > 0
    ? records(field?.warnings).map((item) => JSON.stringify(item))
    : (Array.isArray(field?.warnings) ? field.warnings.filter((item): item is string => typeof item === 'string') : []);

  const nodeCatalog = records(field?.nodeCatalog);
  const documentCatalog = records(field?.documentCatalog);
  const patternCatalog = records(field?.patternCatalog);
  const proposals = records(field?.latestProposals);
  const graphNodes = records(graph.nodes);
  const graphEdges = records(graph.edges);
  const scoreVector = isRecord(score?.cultural_vector) ? score.cultural_vector : {};
  const scoreEvidence = isRecord(score?.evidence) ? score.evidence : {};
  const scoreWarnings = Array.isArray(score?.warnings) ? score.warnings.filter((item): item is string => typeof item === 'string') : [];

  const realNodeCount = graphNodes.length || nodeCatalog.length || null;
  const realEvidenceCount = documentCatalog.length || numberValue(scoreEvidence.observation_count);
  const realPatternCount = patternCatalog.length || null;
  const realProposalCount = proposals.length || null;
  const friction = numberValue(mihmRuntimeMatrix.nti)
    ?? numberValue(worldspect.nti)
    ?? pickScoreNumber(score, ['cultural_vector', 'FS_C']);
  const coherence = numberValue(kernel.confidence)
    ?? numberValue(worldspect.confidence)
    ?? numberValue(mihmRuntimeMatrix.ihg)
    ?? pickScoreNumber(score, ['cultural_vector', 'ICE_C']);

  const scoreCv = numberValue(scoreVector.cvphi);
  const sourceState = stringValue(worldspect.sourceState ?? graph.sourceState, field ? 'observado' : 'cargando');

  const regions: HorizonRegion[] = [
    {
      ...REGION_LAYOUT.worldspect,
      evidence: (numberValue(worldspect.evidenceCount) ?? records(worldspect.evidence).length) || null,
      events: numberValue(worldspect.eventCount) ?? numberValue(worldspect.totalEvents),
      weight: clamp01((numberValue(worldspect.wsi) ?? numberValue(worldspect.confidence) ?? 0.5)),
      sourceState: sourceStateFrom(numberValue(worldspect.wsi) ?? numberValue(worldspect.confidence), warnings.includes('worldspect_snapshot_missing')),
      source: 'api/observatory/state.worldspect',
    },
    {
      ...REGION_LAYOUT.scorefriction,
      evidence: numberValue(scoreEvidence.observation_count),
      events: scoreCv === null ? null : Math.round(scoreCv * 100),
      weight: clamp01(scoreCv ?? 0.36),
      sourceState: sourceStateFrom(scoreCv, scoreWarnings.length > 0),
      source: 'api/scorefriction/evaluate',
    },
    {
      ...REGION_LAYOUT.atlas,
      evidence: documentCatalog.length || null,
      events: records(field?.logbookKnowledge).length || documentCatalog.length || null,
      weight: clamp01((documentCatalog.length || 0) / Math.max(1, (nodeCatalog.length || 80) * 0.8)),
      sourceState: sourceStateFrom(documentCatalog.length || null, warnings.includes('logbook_knowledge_missing')),
      source: 'api/observatory/state.documentCatalog',
    },
    {
      ...REGION_LAYOUT.moph,
      evidence: records(field?.cognitiveRuntime).length || null,
      events: (records(isRecord(field?.cognitiveRuntime) ? field.cognitiveRuntime.recentThoughtClosures : null).length
        + records(isRecord(field?.cognitiveRuntime) ? field.cognitiveRuntime.recentThoughtInhibitions : null).length) || null,
      weight: clamp01((numberValue(mihmRuntimeMatrix.phi) ?? 0.42)),
      sourceState: sourceStateFrom(numberValue(mihmRuntimeMatrix.phi), warnings.includes('mihm_runtime_fallback_missing_field_sources')),
      source: 'api/observatory/state.mihmRuntimeMatrix',
    },
    {
      ...REGION_LAYOUT.root,
      evidence: realProposalCount,
      events: realProposalCount,
      weight: clamp01((realProposalCount ?? 0) / 20 + 0.25),
      sourceState: sourceStateFrom(realProposalCount, warnings.includes('action_proposals_missing')),
      source: 'api/observatory/state.latestProposals',
    },
    {
      ...REGION_LAYOUT.constitution,
      evidence: 1,
      events: 1,
      weight: 0.78,
      sourceState: 'canon',
      source: 'sfi-core-v2',
    },
  ];

  const majorNodes = regions.map((region): HorizonNode => ({
    ...region,
    major: true,
    phase: stableUnit(region.id) * Math.PI * 2,
    size: 12 + region.weight * 18,
  }));

  const subnodes = nodeCatalog.slice(0, 96).map((node, index): HorizonNode => {
    const label = stringValue(node.label, stringValue(node.nodeKey, `Nodo ${index + 1}`));
    const nodeKey = stringValue(node.nodeKey, label);
    const text = `${label} ${stringValue(node.nodeType)} ${JSON.stringify(node.patterns ?? '')}`.toLowerCase();
    const parent = text.includes('world') || text.includes('wsi') ? 'worldspect'
      : text.includes('score') || text.includes('cultural') ? 'scorefriction'
        : text.includes('document') || text.includes('evid') || text.includes('atlas') ? 'atlas'
          : text.includes('root') || text.includes('acp') || text.includes('twin') ? 'root'
            : text.includes('mihm') || text.includes('mop') ? 'moph'
              : regions[index % regions.length].id;
    const base = REGION_LAYOUT[parent] ?? REGION_LAYOUT.atlas;
    const dx = (stableUnit(`${nodeKey}:x`) - 0.5) * 0.42;
    const dz = (stableUnit(`${nodeKey}:z`) - 0.5) * 0.34;
    const runtimeState = stringValue(node.runtimeState, 'desconocido');
    const variables = Array.isArray(node.variables) ? node.variables.length : 0;
    const patterns = Array.isArray(node.patterns) ? node.patterns.length : 0;
    const linkedDocuments = Array.isArray(node.linkedDocuments) ? node.linkedDocuments.length : 0;
    return {
      id: nodeKey,
      label,
      route: (REGION_LAYOUT[parent] ?? REGION_LAYOUT.atlas).route,
      desc: `Nodo de catalogo ${runtimeState}. Variables: ${variables}. Patrones: ${patterns}. Documentos: ${linkedDocuments}.`,
      x: base.x + dx,
      z: base.z + dz,
      evidence: linkedDocuments || null,
      events: patterns || variables || null,
      weight: clamp01(0.18 + variables * 0.05 + patterns * 0.04 + linkedDocuments * 0.05),
      sourceState: runtimeState,
      source: 'api/observatory/state.nodeCatalog',
      major: false,
      parent,
      phase: stableUnit(nodeKey) * Math.PI * 2,
      size: 2.4 + stableUnit(`${nodeKey}:size`) * 3,
    };
  });

  const nodes = [...majorNodes, ...subnodes];
  const links: Array<[number, number, number]> = [];
  nodes.forEach((node, index) => {
    if (!node.parent) return;
    const parentIndex = nodes.findIndex((candidate) => candidate.id === node.parent);
    if (parentIndex >= 0) links.push([parentIndex, index, 0.08]);
  });
  for (let index = 0; index < nodes.length; index += 1) {
    for (let peer = index + 1; peer < Math.min(nodes.length, index + 18); peer += 1) {
      const distance = Math.hypot(nodes[index].x - nodes[peer].x, nodes[index].z - nodes[peer].z);
      if (distance < 0.13) links.push([index, peer, distance]);
    }
  }

  return {
    loadedAt: stringValue(field?.loadedAt, null as unknown as string) || null,
    sourceState,
    warnings: [...warnings, ...scoreWarnings],
    totals: {
      nodes: realNodeCount,
      evidence: realEvidenceCount,
      patterns: realPatternCount,
      proposals: realProposalCount,
      friction,
      coherence,
    },
    regions,
    nodes,
    links,
  };
}

export function SfiFinalPublicSurface() {
  const [field, setField] = useState<JsonRecord | null>(null);
  const [score, setScore] = useState<JsonRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [focus, setFocus] = useState('field');
  const [selected, setSelected] = useState<HorizonNode | null>(null);
  const [routeDepth, setRouteDepth] = useState(0);
  const [perturbation, setPerturbation] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/observatory/state', { cache: 'no-store' }).then((res) => res.json()).catch(() => null),
      fetch('/api/scorefriction/evaluate?case_id=CW-001', { cache: 'no-store' }).then((res) => res.json()).catch(() => null),
    ]).then(([observatory, scoreResult]) => {
      if (!active) return;
      if (isRecord(observatory) && isRecord(observatory.data)) setField(observatory.data);
      if (isRecord(scoreResult)) setScore(scoreResult);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const model = useMemo(() => deriveLandingModel(field, score), [field, score]);
  const activeRegion = model.regions.find((region) => region.id === focus) ?? null;
  const nodeLabel = shortId(model.loadedAt ?? model.sourceState);

  function focusRegion(id: string) {
    setFocus(id);
    setRouteDepth((current) => Math.max(current, id === 'field' ? 2 : id === 'constitution' ? 4 : 3));
    if (id === 'constitution') {
      setSelected({
        ...REGION_LAYOUT.constitution,
        evidence: 1,
        events: 1,
        weight: 0.78,
        sourceState: 'canon',
        source: 'sfi-core-v2',
        major: true,
        phase: 0,
        size: 26,
      });
    }
  }

  const openNode = useCallback((node: HorizonNode) => {
    setSelected(node);
    setFocus(node.parent ?? node.id);
    setRouteDepth((current) => Math.max(current, node.major ? 4 : 3));
    if (!perturbation && node.sourceState === 'sin datos') {
      setPerturbation('OBSERVACION\n\nEste lente existe en el Instituto, pero no tiene datos conectados en esta lectura publica.\n\nNo se completa con simulacion.\nSe marca como limite observable.');
    }
  }, [perturbation]);

  return (
    <main className="relative h-screen overflow-hidden bg-black font-mono text-[#c8a951]">
      <HorizonCanvas model={model.nodes.length ? model : EMPTY_MODEL} focus={focus} onNodeOpen={openNode} onRouteDepth={setRouteDepth} />
      <div
        className="pointer-events-none fixed inset-0 z-[4] opacity-[0.14] mix-blend-screen"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 180 180\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'180\' height=\'180\' filter=\'url(%23n)\' opacity=\'.45\'/%3E%3C/svg%3E")',
        }}
      />

      <header className="fixed left-0 right-0 top-0 z-20 flex h-[66px] items-center justify-between border-b border-[#c8a95138] bg-gradient-to-b from-black/90 to-black/20 px-7 backdrop-blur-xl">
        <Link href="/" className="text-[12px] uppercase tracking-[0.28em] text-[#ffd866]">SYSTEM FRICTION INSTITUTE</Link>
        <nav className="hidden gap-7 md:flex">
          {[
            ['field', 'Campo'],
            ['worldspect', 'WorldSpect'],
            ['scorefriction', 'ScoreFriction'],
            ['atlas', 'Atlas'],
            ['moph', 'MOP-H'],
            ['root', 'ROOT'],
          ].map(([id, label]) => (
            <button key={id} className={`text-[10px] uppercase tracking-[0.2em] ${focus === id ? 'text-[#ffd866]' : 'text-[#7f7354] hover:text-[#ffd866]'}`} onClick={() => focusRegion(id)} type="button">
              {label}
            </button>
          ))}
        </nav>
        <div className="text-[10px] uppercase tracking-[0.18em] text-[#b5aa89]">{nodeLabel} · {loading ? 'cargando' : 'observando'}</div>
      </header>

      <section className="fixed left-[30px] top-[94px] z-10 w-[340px] border border-[#c8a95138] bg-black/75 p-5 shadow-2xl backdrop-blur-xl max-md:left-4 max-md:right-4 max-md:w-auto">
        <h3 className="mb-3 text-[11px] uppercase tracking-[0.24em] text-[#ffd866]">Que es SFI?</h3>
        <p className="text-[12px] leading-7 text-[#a89d80]">Observamos como los sistemas complejos acumulan friccion, consolidan trayectorias y cambian antes de que sus consecuencias sean evidentes.</p>
        <button className="mt-4 border border-[#c8a95138] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#ffd866] hover:bg-[#c8a95112]" onClick={() => focusRegion('constitution')} type="button">Leer base</button>
      </section>

      <section className="fixed right-[30px] top-[94px] z-10 w-[360px] border border-[#c8a95138] bg-black/75 p-5 shadow-2xl backdrop-blur-xl max-lg:hidden">
        <h3 className="mb-3 text-[11px] uppercase tracking-[0.24em] text-[#ffd866]">Que estoy viendo?</h3>
        <p className="text-[12px] leading-7 text-[#a89d80]">Una representacion operacional del Instituto. Los nodos y metricas salen del estado disponible; las fuentes ausentes se muestran como limite, no como verdad.</p>
        <button className="mt-4 border border-[#c8a95138] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#ffd866] hover:bg-[#c8a95112]" onClick={() => focusRegion('field')} type="button">Observar campo</button>
      </section>

      <aside className="fixed left-[30px] top-1/2 z-10 w-[270px] -translate-y-1/2 border border-[#c8a95138] bg-black/55 p-5 backdrop-blur-xl max-xl:hidden">
        <h3 className="mb-4 text-[11px] uppercase tracking-[0.24em] text-[#e7ddbf]">Constitucion</h3>
        <ul className="ml-4 space-y-2 text-[12px] leading-6 text-[#a89d80]">
          <li>Observable</li>
          <li>Falseable</li>
          <li>Trazable</li>
          <li>Longitudinal</li>
          <li>Reorganizacion con friccion minima</li>
        </ul>
        <button className="mt-4 border border-[#c8a95138] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#ffd866] hover:bg-[#c8a95112]" onClick={() => focusRegion('constitution')} type="button">Expandir</button>
      </aside>

      <aside className="fixed right-[30px] top-1/2 z-10 w-[300px] -translate-y-1/2 border border-[#c8a95129] bg-black/60 p-5 backdrop-blur-xl max-lg:hidden">
        <h3 className="mb-4 text-[10px] uppercase tracking-[0.22em] text-[#ffd866]">Ruta cognitiva</h3>
        {ROUTE_STEPS.map((step, index) => (
          <div key={step} className={`my-3 flex gap-3 text-[11px] leading-5 ${index <= routeDepth ? 'text-[#e7ddbf]' : 'text-[#8d8060]'}`}>
            <span className={`mt-1 h-[9px] w-[9px] flex-none rounded-full border border-[#c8a95138] ${index <= routeDepth ? 'bg-[#ffd866] shadow-[0_0_15px_#ffd866]' : ''}`} />
            {step}
          </div>
        ))}
      </aside>

      <section className="fixed bottom-[34px] left-[30px] z-10 w-[340px] border border-[#c8a95138] bg-black/75 p-5 shadow-2xl backdrop-blur-xl max-md:left-4 max-md:right-4 max-md:bottom-4 max-md:w-auto">
        <h3 className="mb-3 text-[11px] uppercase tracking-[0.24em] text-[#ffd866]">Que puedo hacer?</h3>
        <p className="text-[12px] leading-7 text-[#a89d80]">Observar el sistema, participar en un instrumento o construir dentro del campo restringido.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="border border-[#c8a95138] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#ffd866] hover:bg-[#c8a95112]" onClick={() => focusRegion('worldspect')} type="button">Observar</button>
          <Link className="border border-[#c8a95138] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#ffd866] hover:bg-[#c8a95112]" href="/terminal">Participar</Link>
          <Link className="border border-[#c8a95138] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#ffd866] hover:bg-[#c8a95112]" href="/root">Construir</Link>
        </div>
      </section>

      <section className="fixed bottom-[34px] right-[30px] z-10 grid w-[360px] grid-cols-3 border border-[#c8a95129] bg-black/55 backdrop-blur-lg max-lg:hidden">
        <Metric label="NODOS" value={model.totals.nodes} />
        <Metric label="EVIDENCIA" value={model.totals.evidence} />
        <Metric label="PATRONES" value={model.totals.patterns} />
        <Metric label="PROPUESTAS" value={model.totals.proposals} />
        <Metric label="FRICCION" value={model.totals.friction} decimals={3} />
        <Metric label="COHERENCIA" value={model.totals.coherence} decimals={3} />
      </section>

      {activeRegion && (
        <div className="fixed left-1/2 top-[82px] z-10 max-w-[520px] -translate-x-1/2 border border-[#c8a95129] bg-black/60 px-4 py-3 text-center backdrop-blur-md max-md:hidden">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#ffd866]">{activeRegion.label}</p>
          <p className="mt-2 text-[11px] leading-5 text-[#a89d80]">{activeRegion.desc}</p>
        </div>
      )}

      {selected && (
        <NodeModal node={selected} onClose={() => setSelected(null)} />
      )}

      {perturbation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95" onClick={() => setPerturbation(null)}>
          <pre className="w-[min(700px,90vw)] whitespace-pre-wrap border border-[#e6ff005c] bg-[#e6ff0009] p-8 text-[12px] leading-7 text-[#e6ff00]">{perturbation}</pre>
        </div>
      )}

      <footer className="fixed bottom-3 left-1/2 z-10 -translate-x-1/2 text-center text-[10px] uppercase tracking-[0.18em] text-[#6f664d] max-md:hidden">
        Arrastra para rotar · scroll para acercar · click en nodo para abrir · datos operativos SFI
      </footer>
    </main>
  );
}

function HorizonCanvas({ model, focus, onNodeOpen, onRouteDepth }: {
  model: LandingModel;
  focus: string;
  onNodeOpen: (node: HorizonNode) => void;
  onRouteDepth: (update: (current: number) => number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modelRef = useRef(model);
  const focusRef = useRef(focus);
  const hoverRef = useRef<{ node: HorizonNode; x: number; y: number } | null>(null);
  const [hover, setHover] = useState<{ node: HorizonNode; x: number; y: number } | null>(null);

  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  useEffect(() => {
    focusRef.current = focus;
  }, [focus]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let centerX = 0;
    let centerY = 0;
    let frame = 0;
    let animationFrame = 0;
    let drag = false;
    let lastX = 0;
    let lastY = 0;
    let rotX = -0.46;
    let rotY = 0.08;
    let zoom = 1.02;
    const mouse = { x: -1000, y: -1000 };

    const targetForFocus = () => {
      const focused = modelRef.current.regions.find((region) => region.id === focusRef.current);
      if (!focused || focusRef.current === 'field') return { rotX: -0.46, rotY: 0.08, zoom: 1.02 };
      return { rotX: -0.44, rotY: -focused.x * 0.55, zoom: 1.36 };
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      centerX = width / 2;
      centerY = height * 0.58;
    };

    const project = (node: Pick<HorizonNode, 'x' | 'z' | 'phase' | 'weight'>) => {
      const wave = Math.sin(node.x * 8 + node.z * 4 + frame * 0.012 + node.phase) * 0.032 * node.weight
        + Math.sin(node.x * 14 - node.z * 11 + frame * 0.007) * 0.012;
      const cy = Math.cos(rotY);
      const sy = Math.sin(rotY);
      const x1 = node.x * cy - node.z * sy;
      const z1 = node.x * sy + node.z * cy;
      const cx = Math.cos(rotX);
      const sx = Math.sin(rotX);
      const y1 = wave * cx - z1 * sx;
      const z2 = wave * sx + z1 * cx;
      const perspective = 1.65 / (1.65 + z2);
      return { x: centerX + x1 * width * 0.52 * perspective * zoom, y: centerY + y1 * height * 0.75 * perspective * zoom, s: perspective };
    };

    const gridLine = (a: { x: number; z: number }, b: { x: number; z: number }) => {
      ctx.beginPath();
      for (let index = 0; index <= 34; index += 1) {
        const k = index / 34;
        const point = project({ x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, phase: 0, weight: 0.7 });
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      }
      ctx.strokeStyle = 'rgba(200,169,81,.105)';
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const draw = () => {
      frame += 1;
      const target = targetForFocus();
      rotX += (target.rotX - rotX) * 0.015;
      rotY += (target.rotY - rotY) * 0.015;
      zoom += (target.zoom - zoom) * 0.012;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#030303';
      ctx.fillRect(0, 0, width, height);
      const gradient = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, width * 0.75);
      gradient.addColorStop(0, 'rgba(200,169,81,.12)');
      gradient.addColorStop(0.45, 'rgba(200,169,81,.032)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      for (let index = -32; index <= 32; index += 1) {
        gridLine({ x: -1.55, z: index / 19 }, { x: 1.55, z: index / 19 });
        gridLine({ x: index / 19, z: -1.55 }, { x: index / 19, z: 1.55 });
      }

      const current = modelRef.current;
      const projected = current.nodes.map(project);
      for (const [a, b, distance] of current.links) {
        const pa = projected[a];
        const pb = projected[b];
        const major = current.nodes[a]?.major || current.nodes[b]?.major;
        const alpha = Math.max(0.025, (0.24 - distance) * 0.9);
        ctx.strokeStyle = `rgba(255,216,102,${alpha})`;
        ctx.lineWidth = major ? 1.1 : 0.55;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }

      let nextHover: { node: HorizonNode; x: number; y: number } | null = null;
      current.nodes.forEach((node, index) => {
        const point = projected[index];
        const pulse = (Math.sin(frame * 0.02 + node.phase) + 1) / 2;
        const radius = (node.size + pulse * (node.major ? 5 : 2)) * point.s;
        const isHover = Math.hypot(mouse.x - point.x, mouse.y - point.y) < radius + 8;
        if (isHover) nextHover = { node, x: point.x, y: point.y };
        const isFocused = focusRef.current === node.id || focusRef.current === node.parent;
        ctx.beginPath();
        ctx.shadowColor = node.sourceState === 'sin datos' ? '#777' : '#ffd866';
        ctx.shadowBlur = node.major ? 22 : 8;
        ctx.fillStyle = node.sourceState === 'sin datos'
          ? `rgba(140,140,140,${node.major ? 0.65 : 0.3})`
          : `rgba(255,216,102,${node.major ? 0.9 : 0.34 + node.weight * 0.28})`;
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        if (node.major || isFocused) {
          ctx.font = '11px IBM Plex Mono, Courier New, monospace';
          ctx.fillStyle = '#e7ddbf';
          ctx.fillText(node.label, point.x + 14, point.y - 10);
          ctx.strokeStyle = 'rgba(200,169,81,.34)';
          ctx.beginPath();
          ctx.moveTo(point.x, point.y);
          ctx.lineTo(point.x, point.y - 44);
          ctx.stroke();
        }
      });

      const hovered = nextHover as { node: HorizonNode; x: number; y: number } | null;
      const currentHoverId = hoverRef.current ? hoverRef.current.node.id : null;
      const nextHoverId = hovered ? hovered.node.id : null;
      if (currentHoverId !== nextHoverId) {
        hoverRef.current = hovered;
        setHover(hovered);
        if (hovered) onRouteDepth((currentDepth) => Math.max(currentDepth, 2));
      } else if (hovered && hoverRef.current) {
        hoverRef.current = hovered;
      }

      animationFrame = requestAnimationFrame(draw);
    };

    resize();
    draw();

    const onMouseDown = (event: MouseEvent) => {
      drag = true;
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const onMouseUp = () => {
      drag = false;
    };
    const onMouseMove = (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      if (!drag) return;
      rotY += (event.clientX - lastX) * 0.004;
      rotX += (event.clientY - lastY) * 0.002;
      rotX = Math.max(-0.78, Math.min(-0.22, rotX));
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const onWheel = (event: WheelEvent) => {
      zoom += event.deltaY * -0.0008;
      zoom = Math.max(0.72, Math.min(1.8, zoom));
      if (zoom > 1.35) onRouteDepth((currentDepth) => Math.max(currentDepth, 4));
    };
    const onClick = () => {
      const hovered = hoverRef.current;
      if (hovered) onNodeOpen(hovered.node);
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('wheel', onWheel, { passive: true });
    canvas.addEventListener('click', onClick);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationFrame);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('click', onClick);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', resize);
    };
  }, [onNodeOpen, onRouteDepth]);

  return (
    <>
      <canvas ref={canvasRef} className="fixed inset-0 z-0 h-full w-full cursor-crosshair" />
      {hover && (
        <div className="pointer-events-none fixed z-30 w-[280px] border border-[#ffd86647] bg-black/90 p-4 backdrop-blur-lg" style={{ left: hover.x + 20, top: Math.max(76, hover.y - 20) }}>
          <h4 className="mb-3 text-[11px] uppercase tracking-[0.22em] text-[#ffd866]">{hover.node.label}</h4>
          <p className="text-[11px] leading-5 text-[#b8ad8e]">{hover.node.desc}</p>
          <p className="mt-3 text-[11px] text-[#ffd866]">Evidencia: {formatMetric(hover.node.evidence)} · Eventos: {formatMetric(hover.node.events)}</p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-[#6f664d]">{hover.node.sourceState}</p>
        </div>
      )}
    </>
  );
}

function NodeModal({ node, onClose }: { node: HorizonNode; onClose: () => void }) {
  return (
    <div className="fixed left-1/2 top-1/2 z-40 w-[min(680px,90vw)] -translate-x-1/2 -translate-y-1/2 border border-[#ffd8665c] bg-black/95 p-7 shadow-[0_0_80px_rgba(255,216,102,.12)]">
      <h2 className="mb-4 text-[17px] font-light uppercase tracking-[0.28em] text-[#ffd866]">{node.label}</h2>
      <pre className="whitespace-pre-wrap text-[12px] leading-7 text-[#d8cba6]">{`Nodo operativo: ${node.id}

${node.desc}

Fuente: ${node.source}
Estado de fuente: ${node.sourceState}
Evidencia asociada: ${formatMetric(node.evidence)}
Eventos registrados: ${formatMetric(node.events)}
Peso relativo: ${node.weight.toFixed(3)}

Lectura:
Este nodo no entrega informacion aislada. Su significado emerge por relacion, trayectoria y recurrencia.

Accion posible:
Observar region, cruzar umbral o volver al campo.`}</pre>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link className="border border-[#c8a95138] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#ffd866] hover:bg-[#c8a95112]" href={node.route}>Abrir lente</Link>
        <button className="border border-[#c8a95138] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#ffd866] hover:bg-[#c8a95112]" onClick={onClose} type="button">Cerrar</button>
      </div>
    </div>
  );
}

function Metric({ label, value, decimals = 0 }: { label: string; value: number | null; decimals?: number }) {
  return (
    <div className="border-b border-r border-[#c8a95121] p-3 last:border-r-0">
      <small className="block text-[9px] uppercase tracking-[0.16em] text-[#6e633f]">{label}</small>
      <b className="mt-1 block text-[18px] font-light text-[#ffd866]">{formatMetric(value, decimals)}</b>
    </div>
  );
}

function formatMetric(value: number | null, decimals = 0) {
  if (value === null || !Number.isFinite(value)) return 'sin datos';
  return decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
}
