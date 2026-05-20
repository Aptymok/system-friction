'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { SfiAsset } from '@/lib/types';
import { compressVisibleText } from '@/observatory/communication/amvVisibleFormatter';
import type { GraphVectorState, FieldNodeVector } from '@/observatory/field/vectorTypes';
import { FieldCommandInput } from './FieldCommandInput';
import { FieldNodeInspector } from './FieldNodeInspector';
import {
  aptymokModuleNodes,
  baseTwinNodes,
  getDefaultFieldNodes,
  sfOntologyNodes,
  type FieldCommandMode,
  type FieldOntologyNode,
} from './fieldOntology';

type AmvState = {
  status: string;
  message?: string;
  reading?: Record<string, unknown> | null;
};

type SocialPulse = {
  active: boolean;
  score?: number;
  platform?: string;
};

export type SfiCognitiveFieldProps = {
  asset: SfiAsset;
  nodeId?: string | null;
  phase: number;
  fullScreen?: boolean;
  amvState?: AmvState;
  operationalReading?: any;
  recentEvents?: any[];
  mediaDrafts?: any[];
  socialPulse?: SocialPulse;
  activeCommandNode?: string | null;
  selectedNode?: string | null;
  fieldMode?: string;
  ghostEvents?: any[];
  patternRank?: {
    primaryPatternId?: string | null;
    secondaryPatternIds?: string[];
  };
  graphVectorState?: GraphVectorState;
  moduleNodes?: FieldOntologyNode[];
  twinNodes?: FieldOntologyNode[];
  sfNodes?: FieldOntologyNode[];
  onNodeTap?: (node: FieldOntologyNode) => void;
  onNodeSelect?: (node: FieldOntologyNode | null) => void;
  onFieldEcho?: (echo: string) => void;
  onModeSuggest?: (mode: FieldCommandMode) => void;
  onCommandExecute?: (input: { command: string; mode: FieldCommandMode; node: FieldOntologyNode | null; evidence?: File | null }) => Promise<boolean | void> | boolean | void;
};

type NodeKind = 'gold' | 'blue' | 'green' | 'red' | 'dim';

type FieldNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  radius: number;
  kind: NodeKind;
  weight: number;
  attention: number;
  ontology?: FieldOntologyNode;
};

type FieldEdge = {
  from: string;
  to: string;
  strength: number;
  kind: 'core' | 'latent' | 'resonance';
};

type Echo = {
  id: number;
  text: string;
  born: number;
  ttl: number;
  x: number;
  y: number;
  tone: NodeKind;
};

type RuntimeData = {
  ihg: number;
  nti: number;
  ldiHours: number;
  xi: number;
  phi: number;
  regime: string;
  phase: number;
  evalAssetActive: boolean;
  pendingDrafts: number;
  socialPulse: SocialPulse;
  amvMessage: string;
  writing: boolean;
  signalLength: number;
  nodeId?: string | null;
  primaryPatternId?: string | null;
  secondaryPatternIds: string[];
  graphVectorState?: GraphVectorState;
};

const nodeTemplate = [
  ['SFI_CORE', 0.5, 0.44, 'green', 1],
  ['IHG_BASAL', 0.38, 0.38, 'green', 0.9],
  ['GOBERNANZA', 0.29, 0.48, 'green', 0.74],
  ['COHERENCIA', 0.39, 0.67, 'green', 0.75],
  ['NTI_OBS', 0.62, 0.36, 'blue', 0.85],
  ['TRAZABILIDAD', 0.72, 0.48, 'blue', 0.72],
  ['MEM_ESTRUC', 0.64, 0.72, 'blue', 0.68],
  ['LDI_T', 0.5, 0.57, 'red', 0.82],
  ['MIHM', 0.57, 0.31, 'green', 0.78],
  ['DISIPACION', 0.24, 0.66, 'red', 0.64],
  ['CAMPO_LAT', 0.81, 0.61, 'red', 0.62],
  ['AMV_OBSERVATORIO', 0.49, 0.23, 'gold', 0.86],
  ['INTERVENCION', 0.3, 0.22, 'gold', 0.58],
  ['CALENDARIZACION', 0.72, 0.22, 'gold', 0.54],
  ['SFI_EVAL_ASSET', 0.5, 0.82, 'gold', 0.74],
  ['REDES', 0.82, 0.78, 'blue', 0.7],
  ['MEDIA_ROOM', 0.65, 0.88, 'blue', 0.62],
  ['SOCIAL_FIELD', 0.9, 0.48, 'blue', 0.62],
  ['RUIDO_XI', 0.12, 0.34, 'dim', 0.46],
  ['PATRON_RECUR', 0.14, 0.82, 'dim', 0.5],
  ['MUNDO', 0.9, 0.2, 'dim', 0.42],
] as const;

const edges: FieldEdge[] = [
  { from: 'SFI_CORE', to: 'IHG_BASAL', strength: 0.9, kind: 'core' },
  { from: 'SFI_CORE', to: 'NTI_OBS', strength: 0.9, kind: 'core' },
  { from: 'SFI_CORE', to: 'LDI_T', strength: 0.95, kind: 'core' },
  { from: 'SFI_CORE', to: 'MIHM', strength: 0.86, kind: 'core' },
  { from: 'SFI_CORE', to: 'AMV_OBSERVATORIO', strength: 0.75, kind: 'core' },
  { from: 'MIHM', to: 'nodo.aptymok.mihm', strength: 0.78, kind: 'core' },
  { from: 'MIHM', to: 'NTI_OBS', strength: 0.62, kind: 'resonance' },
  { from: 'MIHM', to: 'IHG_BASAL', strength: 0.62, kind: 'resonance' },
  { from: 'MIHM', to: 'LDI_T', strength: 0.62, kind: 'resonance' },
  { from: 'IHG_BASAL', to: 'GOBERNANZA', strength: 0.7, kind: 'core' },
  { from: 'IHG_BASAL', to: 'COHERENCIA', strength: 0.76, kind: 'resonance' },
  { from: 'NTI_OBS', to: 'TRAZABILIDAD', strength: 0.78, kind: 'core' },
  { from: 'NTI_OBS', to: 'MEM_ESTRUC', strength: 0.66, kind: 'resonance' },
  { from: 'LDI_T', to: 'DISIPACION', strength: 0.64, kind: 'latent' },
  { from: 'LDI_T', to: 'CAMPO_LAT', strength: 0.72, kind: 'latent' },
  { from: 'AMV_OBSERVATORIO', to: 'INTERVENCION', strength: 0.6, kind: 'resonance' },
  { from: 'AMV_OBSERVATORIO', to: 'CALENDARIZACION', strength: 0.5, kind: 'latent' },
  { from: 'SFI_EVAL_ASSET', to: 'REDES', strength: 0.78, kind: 'core' },
  { from: 'SFI_EVAL_ASSET', to: 'MEDIA_ROOM', strength: 0.72, kind: 'resonance' },
  { from: 'REDES', to: 'SOCIAL_FIELD', strength: 0.76, kind: 'resonance' },
  { from: 'SOCIAL_FIELD', to: 'MUNDO', strength: 0.46, kind: 'latent' },
  { from: 'RUIDO_XI', to: 'DISIPACION', strength: 0.42, kind: 'latent' },
  { from: 'PATRON_RECUR', to: 'COHERENCIA', strength: 0.42, kind: 'latent' },
  { from: 'AMV_OBSERVATORIO', to: 'nodo.aptymok.amv', strength: 0.72, kind: 'core' },
  { from: 'INTERVENCION', to: 'nodo.aptymok.intervencion', strength: 0.7, kind: 'core' },
  { from: 'CALENDARIZACION', to: 'nodo.aptymok.calendarizacion', strength: 0.64, kind: 'core' },
  { from: 'MEDIA_ROOM', to: 'nodo.aptymok.media', strength: 0.72, kind: 'core' },
  { from: 'SOCIAL_FIELD', to: 'nodo.aptymok.social_resonance', strength: 0.76, kind: 'core' },
  { from: 'SFI_EVAL_ASSET', to: 'nodo.aptymok.asset_eval', strength: 0.68, kind: 'resonance' },
  { from: 'PATRON_RECUR', to: 'nodo.usuario.friccion_recurrente', strength: 0.52, kind: 'latent' },
  { from: 'nodo.sfi.friccion_sistemica', to: 'nodo.aptymok.intervencion', strength: 0.48, kind: 'latent' },
  { from: 'nodo.sfi.resonancia_semantica', to: 'nodo.aptymok.social_resonance', strength: 0.52, kind: 'resonance' },
];

const colors: Record<NodeKind, [number, number, number]> = {
  gold: [200, 169, 81],
  blue: [74, 143, 168],
  green: [58, 138, 90],
  red: [184, 80, 80],
  dim: [92, 92, 82],
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function numberFrom(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function textFrom(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function rgba(kind: NodeKind, alpha: number) {
  const [r, g, b] = colors[kind];
  return `rgba(${r},${g},${b},${alpha})`;
}

function kindFromOntology(node: FieldOntologyNode): NodeKind {
  if (node.commandMode === 'mihm') return 'green';
  if (node.type === 'module') return node.commandMode === 'social' || node.commandMode === 'media' ? 'blue' : 'gold';
  if (node.type === 'twin') return 'dim';
  if (node.id.includes('latencia')) return 'red';
  if (node.id.includes('resonancia')) return 'blue';
  return 'green';
}

function modeLabel(mode: FieldCommandMode) {
  if (mode === 'project_manager') return 'organizar';
  if (mode === 'intervention') return 'intervenir';
  if (mode === 'media') return 'ajustar';
  if (mode === 'calendar') return 'observar';
  if (mode === 'social') return 'retorno';
  if (mode === 'logbook') return 'asentar';
  if (mode === 'mihm') return 'estabilidad';
  if (mode === 'amv') return 'leer';
  if (mode === 'evidence') return 'evidencia';
  if (mode === 'longitudinal') return 'seguimiento';
  if (mode === 'twin') return 'continuidad';
  return 'origen';
}

function patternActivatesNode(patternId: string | null | undefined, node: FieldNode) {
  if (!patternId) return false;
  const id = node.id.toLowerCase();
  if (patternId.includes('compliance') || patternId.includes('metrica') || patternId.includes('ficcion')) {
    return id.includes('mihm') || id.includes('trazabilidad') || id.includes('sfi_core');
  }
  if (patternId.includes('decision') || patternId.includes('incertidumbre') || patternId.includes('claridad')) {
    return id.includes('projectmanager') || id.includes('intencion') || id.includes('bitacora') || id === 'amv_observatorio';
  }
  if (patternId.includes('alerta') || patternId.includes('alarma')) {
    return id.includes('mihm') || id.includes('calendarizacion') || id.includes('bitacora');
  }
  if (patternId.includes('contexto') || patternId.includes('origen')) {
    return id.includes('trazabilidad') || id.includes('mem_estruc') || id.includes('evidencia');
  }
  if (patternId.includes('dependencia')) {
    return id.includes('sfi_core') || id.includes('gobernanza') || id.includes('coherencia');
  }
  return Boolean(node.ontology?.patterns?.some((pattern) => pattern === patternId) || node.ontology?.linkedSfNodes?.some((linked) => linked === patternId));
}

function createNodes(width: number, height: number, ontologyNodes: FieldOntologyNode[], includeOperationalNodes: boolean): FieldNode[] {
  const hiddenInLocal = new Set(['REDES', 'MEDIA_ROOM', 'SOCIAL_FIELD', 'SFI_EVAL_ASSET']);
  const baseNodes = nodeTemplate
    .filter(([id]) => includeOperationalNodes || !hiddenInLocal.has(id))
    .map(([id, rx, ry, kind, weight]) => ({
    id,
    label: id,
    x: rx * width,
    y: ry * height,
    baseX: rx * width,
    baseY: ry * height,
    vx: (Math.random() - 0.5) * 0.08,
    vy: (Math.random() - 0.5) * 0.08,
    radius: 4 + weight * 8,
    kind,
    weight,
    attention: 0,
    }));

  const derivedNodes = ontologyNodes.map((node) => {
    const kind = kindFromOntology(node);
    const weight = node.type === 'module' ? 0.82 : node.type === 'sf' ? 0.7 : 0.52;
    return {
      id: node.id,
      label: node.labelVisible || node.label,
      x: node.position.x * width,
      y: node.position.y * height,
      baseX: node.position.x * width,
      baseY: node.position.y * height,
      vx: (Math.random() - 0.5) * 0.08,
      vy: (Math.random() - 0.5) * 0.08,
      radius: 4 + weight * 7,
      kind,
      weight,
      attention: 0,
      ontology: node,
    } satisfies FieldNode;
  });

  return [...baseNodes, ...derivedNodes];
}

function metricFromAsset(asset: SfiAsset, key: string, fallback: number) {
  const state = asset.state_vector || {};
  return numberFrom(state[key], numberFrom(state[key.toLowerCase()], fallback));
}

function deriveData(props: SfiCognitiveFieldProps): RuntimeData {
  const metadata = props.asset.metadata || {};
  const operational = (props.operationalReading || metadata.operational_reading || {}) as Record<string, unknown>;
  const technical = (operational.technical || {}) as Record<string, unknown>;
  const objective = props.asset.objective || {};
  const ihg = numberFrom(technical.IHG, metricFromAsset(props.asset, 'IHG', 0.48));
  const nti = numberFrom(technical.NTI_obs, metricFromAsset(props.asset, 'NTI_obs', 0.42));
  const ldiHours = numberFrom(technical.LDI_hours, metricFromAsset(props.asset, 'LDI_hours', 54));
  const xi = numberFrom(technical.xi_noise, metricFromAsset(props.asset, 'xi_noise', 0.06));
  const phi = numberFrom(technical.PHI_SF, metricFromAsset(props.asset, 'PHI_SF', 0.32));
  const pendingDrafts = (props.mediaDrafts || []).filter((draft) => draft.status === 'pending_human_validation').length;
  const signalLength = textFrom(objective.observed_signal).length + numberFrom(metadata.draft_signal_length, 0);

  return {
    ihg: clamp(ihg, 0, 1),
    nti: clamp(nti, 0, 1),
    ldiHours: clamp(ldiHours, 0, 220),
    xi: clamp(xi, 0, 0.3),
    phi: clamp(phi, -1, 1),
    regime: textFrom(technical.regime, textFrom(props.asset.state_vector?.regime, 'TRANSITION')),
    phase: props.phase,
    evalAssetActive: Boolean(metadata.eval_asset_active),
    pendingDrafts,
    socialPulse: props.socialPulse || { active: false },
    amvMessage: props.amvState?.message || '',
    writing: Boolean(metadata.is_writing || props.amvState?.status === 'listening'),
    signalLength,
    nodeId: props.nodeId,
    primaryPatternId: props.patternRank?.primaryPatternId || null,
    secondaryPatternIds: props.patternRank?.secondaryPatternIds || [],
    graphVectorState: props.graphVectorState,
  };
}

function vectorAliasForNode(node: FieldNode) {
  const id = node.id.toLowerCase();
  if (node.ontology?.id) return [node.ontology.id];
  if (id === 'sfi_core' || id === 'gobernanza' || id === 'coherencia') return ['nodo.sfi.friccion_sistemica'];
  if (id === 'mihm') return ['nodo.aptymok.mihm'];
  if (id === 'amv_observatorio') return ['nodo.aptymok.amv'];
  if (id === 'intervencion') return ['nodo.aptymok.intervencion'];
  if (id === 'calendarizacion') return ['nodo.aptymok.calendarizacion'];
  if (id === 'sfi_eval_asset') return ['nodo.aptymok.asset_eval', 'nodo.usuario.asset_actual'];
  if (id === 'redes' || id === 'social_field' || id === 'mundo') return ['nodo.aptymok.social_resonance', 'nodo.sfi.resonancia_semantica'];
  if (id === 'media_room') return ['nodo.aptymok.media'];
  if (id === 'trazabilidad' || id === 'nti_obs' || id === 'mem_estruc') return ['nodo.aptymok.evidencia', 'nodo.usuario.evidencia'];
  if (id === 'ldi_t' || id === 'disipacion' || id === 'campo_lat') return ['nodo.sfi.latencia'];
  if (id === 'patron_recur') return ['nodo.usuario.friccion_recurrente'];
  if (id === 'ruido_xi') return ['nodo.sfi.campo_cognitivo'];
  return [node.id];
}

function vectorForFieldNode(graph: GraphVectorState | undefined, node: FieldNode): FieldNodeVector | null {
  if (!graph) return null;
  const aliases = vectorAliasForNode(node);
  return graph.nodeVectors.find((vector) => aliases.includes(vector.nodeId)) || null;
}

function edgeWeightFromGraph(graph: GraphVectorState | undefined, edge: FieldEdge) {
  if (!graph) return null;
  const fromAliases = vectorAliasForNode({ id: edge.from } as FieldNode);
  const toAliases = vectorAliasForNode({ id: edge.to } as FieldNode);
  return graph.edgeVectors.find((vector) =>
    fromAliases.includes(vector.fromNodeId) && toAliases.includes(vector.toNodeId)
  )?.finalWeight || null;
}

export function SfiCognitiveField(props: SfiCognitiveFieldProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const nodesRef = useRef<FieldNode[]>([]);
  const echoesRef = useRef<Echo[]>([]);
  const dataRef = useRef<RuntimeData>(deriveData(props));
  const mouseRef = useRef({ x: 0, y: 0, active: false, lastMove: 0 });
  const visibleRef = useRef(true);
  const reducedMotionRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const echoIdRef = useRef(0);
  const lastEchoRef = useRef('');
  const propsRef = useRef(props);
  const fieldNodesRef = useRef<FieldOntologyNode[]>([]);
  const activeNodeRef = useRef('nodo.usuario.intencion');
  const selectedNodeRef = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);
  const fieldNodes = useMemo(
    () => [
      ...(props.sfNodes || sfOntologyNodes),
      ...(props.moduleNodes || aptymokModuleNodes),
      ...(props.twinNodes || baseTwinNodes),
    ],
    [props.sfNodes, props.moduleNodes, props.twinNodes],
  );
  const ontologyById = useMemo(() => new Map(fieldNodes.map((node) => [node.id, node])), [fieldNodes]);
  const [internalActiveNode, setInternalActiveNode] = useState(props.activeCommandNode || 'nodo.usuario.intencion');
  const [internalSelectedNode, setInternalSelectedNode] = useState<string | null>(props.selectedNode || null);
  const [commandBusy, setCommandBusy] = useState(false);
  const activeNode = ontologyById.get(props.activeCommandNode || internalActiveNode) || null;
  const selectedNode = ontologyById.get(props.selectedNode || internalSelectedNode || '') || null;

  const label = useMemo(() => {
    if (props.mediaDrafts?.some((draft) => draft.status === 'pending_human_validation')) return 'AMV // validacion humana pendiente';
    if (props.socialPulse?.active) return 'AMV // campo social actualizado';
    if (props.amvState?.message) return `AMV // ${compressVisibleText(props.amvState.message)}`;
    return dataRef.current.writing ? 'AMV // escuchando senal' : 'AMV // campo cognitivo activo';
  }, [props.amvState?.message, props.mediaDrafts, props.socialPulse?.active]);

  useEffect(() => {
    propsRef.current = props;
    dataRef.current = deriveData(props);
  }, [props]);

  useEffect(() => {
    fieldNodesRef.current = fieldNodes;
  }, [fieldNodes]);

  useEffect(() => {
    if (props.activeCommandNode) setInternalActiveNode(props.activeCommandNode);
  }, [props.activeCommandNode]);

  useEffect(() => {
    if (props.selectedNode !== undefined) setInternalSelectedNode(props.selectedNode);
  }, [props.selectedNode]);

  useEffect(() => {
    activeNodeRef.current = internalActiveNode;
  }, [internalActiveNode]);

  useEffect(() => {
    selectedNodeRef.current = internalSelectedNode;
  }, [internalSelectedNode]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!root || !canvas || !ctx) {
      setFailed(true);
      return;
    }

    const reducedQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = Boolean(reducedQuery?.matches);
    const onReduced = () => {
      reducedMotionRef.current = Boolean(reducedQuery?.matches);
    };
    reducedQuery?.addEventListener?.('change', onReduced);

    let width = 0;
    let height = 0;
    let particles: Array<{ x: number; y: number; vx: number; vy: number; r: number; op: number; ph: number }> = [];

    const resize = () => {
      width = root.clientWidth || 680;
      height = propsRef.current.fullScreen
        ? root.clientHeight || window.innerHeight
        : Math.min(Math.max(width * 0.58, 360), 560);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.height = `${height}px`;
      root.style.minHeight = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodesRef.current = createNodes(
        width,
        height,
        fieldNodesRef.current.length ? fieldNodesRef.current : getDefaultFieldNodes(),
        Boolean(propsRef.current.nodeId),
      );
      particles = Array.from({ length: reducedMotionRef.current ? 20 : 70 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        r: Math.random() * 1.2 + 0.25,
        op: Math.random() * 0.035 + 0.004,
        ph: Math.random() * Math.PI * 2,
      }));
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);
    resize();

    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry?.isIntersecting ?? true;
    }, { threshold: 0.05 });
    observer.observe(root);

    const onMove = (event: MouseEvent) => {
      const rect = root.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      mouseRef.current = { x, y, active: true, lastMove: performance.now() };
      if (dotRef.current && ringRef.current) {
        dotRef.current.style.opacity = '0.74';
        ringRef.current.style.opacity = '1';
        dotRef.current.style.transform = `translate(${x - 3}px, ${y - 3}px)`;
        ringRef.current.style.transform = `translate(${x - 13}px, ${y - 13}px)`;
      }
    };

    const onLeave = () => {
      mouseRef.current.active = false;
      if (dotRef.current && ringRef.current) {
        dotRef.current.style.opacity = '0';
        ringRef.current.style.opacity = '0';
      }
    };

    const onClick = (event: MouseEvent) => {
      const rect = root.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const nearest = nodesRef.current
        .map((node) => ({ node, distance: Math.hypot(node.x - x, node.y - y) }))
        .filter((item) => item.distance <= Math.max(28, item.node.radius * 2.4))
        .sort((a, b) => a.distance - b.distance)[0]?.node;
      if (!nearest?.ontology) return;
      setInternalSelectedNode(nearest.ontology.id);
      propsRef.current.onNodeSelect?.(nearest.ontology);
      propsRef.current.onNodeTap?.(nearest.ontology);
      if (nearest.ontology.type === 'module') {
        setInternalActiveNode(nearest.ontology.id);
        propsRef.current.onModeSuggest?.(nearest.ontology.commandMode);
        pushEcho(`AMV // ${modeLabel(nearest.ontology.commandMode)} activo`, nearest.kind);
      } else {
        pushEcho(`AMV // nodo ${nearest.ontology.labelVisible || nearest.ontology.label} inspeccionado`, nearest.kind);
      }
    };

    root.addEventListener('mousemove', onMove);
    root.addEventListener('mouseleave', onLeave);
    root.addEventListener('click', onClick);

    const drawBackground = (time: number, pressure: number) => {
      ctx.fillStyle = '#060605';
      ctx.fillRect(0, 0, width, height);

      const breath = reducedMotionRef.current ? 0.35 : Math.sin(time / 4200) * 0.5 + 0.5;
      const center = ctx.createRadialGradient(width * 0.52, height * 0.48, 0, width * 0.52, height * 0.48, width * 0.55);
      center.addColorStop(0, `rgba(14,24,28,${0.2 + pressure * 0.16 + breath * 0.05})`);
      center.addColorStop(0.5, `rgba(12,16,13,${0.13 + pressure * 0.08})`);
      center.addColorStop(1, 'rgba(6,6,5,0)');
      ctx.fillStyle = center;
      ctx.fillRect(0, 0, width, height);

      ctx.lineWidth = 0.45;
      ctx.strokeStyle = `rgba(200,169,81,${0.018 + pressure * 0.018})`;
      const grid = 72;
      for (let x = 0; x <= width; x += grid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += grid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const clusters = [
        { x: 0.5, y: 0.44, r: 0.24, kind: 'green' as NodeKind, op: 0.022 },
        { x: 0.76, y: 0.56, r: 0.2, kind: 'blue' as NodeKind, op: 0.02 },
        { x: 0.26, y: 0.62, r: 0.18, kind: 'red' as NodeKind, op: 0.018 + pressure * 0.02 },
        { x: 0.5, y: 0.2, r: 0.16, kind: 'gold' as NodeKind, op: 0.018 },
      ];

      clusters.forEach((cluster) => {
        const [r, g, b] = colors[cluster.kind];
        const radius = Math.min(width, height) * cluster.r;
        const glow = ctx.createRadialGradient(cluster.x * width, cluster.y * height, 0, cluster.x * width, cluster.y * height, radius);
        glow.addColorStop(0, `rgba(${r},${g},${b},${cluster.op * (1 + breath * 0.4)})`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cluster.x * width, cluster.y * height, radius, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const applyAttention = (time: number) => {
      const data = dataRef.current;
      const nodes = nodesRef.current;
      const ldiPressure = clamp(data.ldiHours / 96, 0, 1.8);
      const lowPhiPressure = clamp(0.6 - data.phi, 0, 1);
      const writingBoost = data.writing ? clamp(data.signalLength / 1800, 0.16, 0.75) : 0;
      const socialBoost = data.socialPulse.active ? 1 : 0;
      const draftBoost = data.pendingDrafts > 0 ? 0.8 : 0;

      nodes.forEach((node) => {
        let target = 0.08 + lowPhiPressure * 0.14;
        if (['IHG_BASAL', 'GOBERNANZA', 'COHERENCIA', 'SFI_CORE'].includes(node.id)) target += (1 - data.ihg) * 0.45;
        if (['NTI_OBS', 'TRAZABILIDAD', 'MEM_ESTRUC'].includes(node.id)) target += (1 - data.nti) * 0.42;
        if (['LDI_T', 'DISIPACION', 'CAMPO_LAT'].includes(node.id)) target += ldiPressure * 0.42;
        if (['MIHM', 'nodo.aptymok.mihm'].includes(node.id)) target += lowPhiPressure * 0.38 + ldiPressure * 0.16 + (data.phase >= 1 ? 0.26 : 0);
        if (node.id === 'AMV_OBSERVATORIO') target += writingBoost + (data.amvMessage ? 0.38 : 0);
        if (node.id === 'CALENDARIZACION' && data.phase >= 3) target += 0.42;
        if (['SFI_EVAL_ASSET', 'REDES', 'MEDIA_ROOM'].includes(node.id) && data.evalAssetActive) target += 0.48;
        if (node.id === 'MEDIA_ROOM') target += draftBoost;
        if (['SOCIAL_FIELD', 'REDES', 'MUNDO'].includes(node.id)) target += socialBoost * 0.65;
        if (node.id === 'RUIDO_XI') target += data.xi * 1.7;
        if (node.ontology?.type === 'module') target += 0.1;
        if (node.id === activeNodeRef.current) target += 0.65;
        if (node.id === selectedNodeRef.current) target += 0.95;
        if (node.id === 'nodo.aptymok.intervencion' && data.amvMessage) target += 0.5;
        if (node.id === 'nodo.aptymok.media') target += draftBoost;
        if (node.id === 'nodo.aptymok.social_resonance') target += socialBoost * 0.85;
        if (node.id === 'nodo.aptymok.calendarizacion' && data.phase >= 3) target += 0.45;
        if (node.id === 'nodo.aptymok.asset_eval' && data.evalAssetActive) target += 0.6;
        if (node.id === 'nodo.usuario.intencion' && data.writing) target += 0.6;
        const nodeVector = vectorForFieldNode(data.graphVectorState, node);
        if (nodeVector) {
          target += nodeVector.activation * 0.9;
          target += nodeVector.traceScore * 0.08;
          target += nodeVector.stabilityScore * 0.1;
          target += nodeVector.activityScore * 0.18;
        } else {
          if (patternActivatesNode(data.primaryPatternId, node)) target += 0.45;
          if (data.secondaryPatternIds.some((patternId) => patternActivatesNode(patternId, node))) target += 0.14;
        }

        const dist = mouseRef.current.active ? Math.hypot(node.x - mouseRef.current.x, node.y - mouseRef.current.y) : 999;
        if (dist < 90) target += (90 - dist) / 90;

        node.attention += (clamp(target, 0, 1.7) - node.attention) * 0.055;

        if (!reducedMotionRef.current) {
          const nodeVector = vectorForFieldNode(data.graphVectorState, node);
          const primaryMotion = nodeVector && data.graphVectorState?.topActivatedNodeIds.slice(0, 2).includes(nodeVector.nodeId) ? 0.22 : 0;
          const jitter = 0.18 + lowPhiPressure * 0.16 + ldiPressure * 0.06 + primaryMotion;
          node.vx += Math.sin(time / 1600 + node.baseY * 0.01) * 0.003 * jitter;
          node.vy += Math.cos(time / 1700 + node.baseX * 0.01) * 0.003 * jitter;
          node.x += node.vx;
          node.y += node.vy;
          node.vx += (node.baseX - node.x) * 0.002;
          node.vy += (node.baseY - node.y) * 0.002;
          node.vx *= 0.92;
          node.vy *= 0.92;
        }
      });
    };

    const drawParticles = (time: number, pressure: number) => {
      particles.forEach((particle) => {
        if (!reducedMotionRef.current) {
          particle.x += particle.vx * (1 + pressure);
          particle.y += particle.vy * (1 + pressure);
          if (particle.x < 0) particle.x = width;
          if (particle.x > width) particle.x = 0;
          if (particle.y < 0) particle.y = height;
          if (particle.y > height) particle.y = 0;
        }
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,169,81,${Math.max(0, particle.op + Math.sin(time / 2100 + particle.ph) * 0.01)})`;
        ctx.fill();
      });
    };

    const drawEdges = (time: number) => {
      const nodes = new Map(nodesRef.current.map((node) => [node.id, node]));
      const data = dataRef.current;
      edges.forEach((edge) => {
        const from = nodes.get(edge.from);
        const to = nodes.get(edge.to);
        if (!from || !to) return;
        const attention = (from.attention + to.attention) / 2;
        const social = data.socialPulse.active && ['REDES', 'SOCIAL_FIELD', 'MUNDO'].includes(edge.to) ? 0.36 : 0;
        const vectorWeight = edgeWeightFromGraph(data.graphVectorState, edge);
        const alpha = clamp(0.045 + (vectorWeight ?? edge.strength) * 0.08 + attention * 0.16 + social, 0.02, 0.58);
        ctx.save();
        if (edge.kind === 'latent') ctx.setLineDash([4, 9]);
        if (edge.kind === 'resonance') ctx.lineWidth = 0.8 + attention * 0.8 + (vectorWeight || 0) * 0.25;
        else ctx.lineWidth = 0.55 + attention * 0.7 + (vectorWeight || 0) * 0.18;
        ctx.strokeStyle = edge.kind === 'latent' ? `rgba(74,143,168,${alpha})` : `rgba(200,169,81,${alpha})`;
        const wave = reducedMotionRef.current ? 0 : Math.sin(time / 800 + from.x * 0.01) * (1 + attention * 5);
        const mx = (from.x + to.x) / 2 + wave;
        const my = (from.y + to.y) / 2 - wave;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(mx, my, to.x, to.y);
        ctx.stroke();
        ctx.restore();
      });
    };

    const drawNodes = (time: number) => {
      const data = dataRef.current;
      nodesRef.current.forEach((node) => {
        const pulse = reducedMotionRef.current ? 0.4 : Math.sin(time / 1300 + node.baseX * 0.01) * 0.5 + 0.5;
        const radius = node.radius + node.attention * 4 + pulse * node.weight * 1.5;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * 2.6, 0, Math.PI * 2);
        ctx.fillStyle = rgba(node.kind, 0.015 + node.attention * 0.035);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = rgba(node.kind, 0.14 + node.attention * 0.2);
        ctx.fill();
        ctx.strokeStyle = rgba(node.kind, 0.22 + node.attention * 0.42);
        ctx.lineWidth = 0.7;
        ctx.stroke();

        const shouldLabel = node.attention > 0.25 || ['SFI_CORE', 'AMV_OBSERVATORIO', 'LDI_T', 'SFI_EVAL_ASSET'].includes(node.id);
        if (shouldLabel) {
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillStyle = `rgba(200,196,184,${clamp(0.16 + node.attention * 0.55, 0.16, 0.78)})`;
          ctx.fillText(node.label, node.x + radius + 6, node.y - radius * 0.2);
        }
      });

      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(200,169,81,0.38)';
      ctx.fillText(`CAMPO ${data.regime || 'TRANSITION'} // ${data.nodeId ? 'NODO ACTIVO' : 'SIN NODO'}`, 18, height - 22);
      ctx.fillStyle = data.evalAssetActive ? 'rgba(74,143,168,0.5)' : 'rgba(92,92,82,0.26)';
      ctx.fillText(data.evalAssetActive ? 'EVALUACION ACTIVA // REDES EN OBSERVACION' : 'CAMPO BASAL // SIN ACTIVACION SOCIAL', 18, height - 42);
    };

    const drawEchoes = (time: number) => {
      echoesRef.current = echoesRef.current.filter((echo) => time - echo.born < echo.ttl);
      echoesRef.current.forEach((echo) => {
        const age = time - echo.born;
        const fadeIn = clamp(age / 700, 0, 1);
        const fadeOut = clamp((echo.ttl - age) / 1200, 0, 1);
        const alpha = fadeIn * fadeOut;
        const y = echo.y - age * 0.008;
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = rgba(echo.tone, 0.16 * alpha);
        ctx.fillRect(echo.x - 10, y - 18, Math.min(width - echo.x - 20, echo.text.length * 6.3 + 22), 28);
        ctx.fillStyle = rgba(echo.tone, 0.72 * alpha);
        ctx.fillText(echo.text.slice(0, 118), echo.x, y);
      });
    };

    const drawAmv = (time: number) => {
      const data = dataRef.current;
      const message = data.pendingDrafts > 0
        ? 'AMV // VALIDACION HUMANA PENDIENTE'
        : data.socialPulse.active
          ? 'AMV // CAMPO SOCIAL ACTUALIZADO'
          : data.writing
            ? 'AMV // escuchando senal'
            : data.amvMessage
              ? `AMV // ${data.amvMessage.slice(0, 90)}`
              : 'AMV // observatorio activo';
      const alpha = 0.35 + Math.sin(time / 1800) * 0.08 + (data.writing ? 0.18 : 0);
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = `rgba(200,169,81,${clamp(alpha, 0.2, 0.72)})`;
      ctx.fillText(message, width * 0.08, 28);
    };

    const render = (time: number) => {
      frameRef.current = window.requestAnimationFrame(render);
      if (!visibleRef.current && !dataRef.current.socialPulse.active) return;
      const data = dataRef.current;
      const pressure = clamp((0.62 - data.phi) * 0.9 + data.ldiHours / 220 + (data.socialPulse.active ? 0.28 : 0), 0.08, 1.4);
      drawBackground(time, pressure);
      applyAttention(time);
      drawParticles(time, pressure);
      drawEdges(time);
      drawNodes(time);
      drawEchoes(time);
      drawAmv(time);
    };

    frameRef.current = window.requestAnimationFrame(render);

    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      root.removeEventListener('mousemove', onMove);
      root.removeEventListener('mouseleave', onLeave);
      root.removeEventListener('click', onClick);
      resizeObserver.disconnect();
      observer.disconnect();
      reducedQuery?.removeEventListener?.('change', onReduced);
    };
  }, []);

  const pushEcho = (text: string, tone: NodeKind = 'gold') => {
    const clean = text.trim();
    if (!clean || clean === lastEchoRef.current) return;
    lastEchoRef.current = clean;
    const now = performance.now();
    echoIdRef.current += 1;
    echoesRef.current.push({
      id: echoIdRef.current,
      text: clean,
      born: now,
      ttl: 4200 + Math.random() * 2600,
      x: 26 + Math.random() * 90,
      y: 78 + Math.random() * 120,
      tone,
    });
    props.onFieldEcho?.(clean);
  };

  useEffect(() => {
    if (props.amvState?.message) pushEcho(`AMV // ${compressVisibleText(props.amvState.message)}`, 'gold');
  }, [props.amvState?.message]);

  useEffect(() => {
    const pending = (props.mediaDrafts || []).filter((draft) => draft.status === 'pending_human_validation').length;
    if (pending > 0) pushEcho('AMV // validacion humana pendiente', 'blue');
  }, [props.mediaDrafts]);

  useEffect(() => {
    if (props.socialPulse?.active) pushEcho('CAMPO SOCIAL // resonancia registrada', 'blue');
  }, [props.socialPulse?.active, props.socialPulse?.score, props.socialPulse?.platform]);

  useEffect(() => {
    const latest = props.recentEvents?.[0];
    const eventName = textFrom(latest?.event_name || latest?.event_type);
    const fragment = textFrom((latest?.payload as Record<string, unknown> | undefined)?.fragment);
    if (eventName.includes('bitacora') && fragment) pushEcho(`AMV // ${fragment}`, 'gold');
    if (eventName.includes('social_resonance')) pushEcho('CAMPO SOCIAL // retorno integrado', 'blue');
  }, [props.recentEvents]);

  useEffect(() => {
    if (dataRef.current.writing) pushEcho('AMV // escuchando senal', 'gold');
  }, [props.asset.metadata?.draft_signal_length, props.amvState?.status]);

  const executeCommand = async (command: string, evidence?: File | null) => {
      const node = activeNode || ontologyById.get('nodo.usuario.intencion');
      const mode = node?.commandMode || 'amv';
      const data = dataRef.current;
      setCommandBusy(true);
      try {
      const handled = await props.onCommandExecute?.({ command, mode, node: node || null, evidence });
      if (handled) return;
      pushEcho(`CAMPO // ${modeLabel(mode)} recibe instruccion`, 'gold');

      if (evidence) {
        pushEcho(`EVIDENCIA // ${evidence.name}`, 'blue');
      }

      if (!props.nodeId && ['intervention', 'media', 'calendar', 'social', 'logbook', 'amv', 'mihm'].includes(mode)) {
        pushEcho('AMV // sin nodo activo; instruccion retenida en campo', 'red');
        return;
      }

      if (mode === 'mihm') {
        const trace = data.nti < 0.3 ? 'No hay referencia suficiente. Se necesita validar el estado.' : 'La estabilidad depende de evidencia y ejecucion.';
        pushEcho(`AMV // ${trace}`, data.nti < 0.3 ? 'red' : 'green');
        return;
      }

      if (mode === 'intervention' || mode === 'amv') {
        const res = await fetch('/api/liturgia/amv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            node_id: props.nodeId,
            session_id: props.asset.asset_id,
            message: command,
            context: {
              entity: textFrom(props.asset.target_system?.name, props.asset.asset_id),
              phenomenon: textFrom(props.operationalReading?.phenomenon, command),
              anomalies: [textFrom(props.operationalReading?.risk?.label, 'campo_activo')],
              ihg: data.ihg,
              nti: data.nti,
              ldi: data.ldiHours / 72,
              xi: data.xi,
              phi: data.phi,
              regime: data.regime,
            },
          }),
        });
        const result = await res.json().catch(() => null);
        if (!res.ok) throw new Error(result?.error || 'amv_command_failed');
        pushEcho(`AMV // ${result?.message || 'ajuste recibido'}`, 'gold');
        return;
      }

      if (mode === 'media') {
        const res = await fetch('/api/media/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            node_id: props.nodeId,
            source_type: 'field_command',
            source_id: null,
            platform_target: 'field',
            content: command,
            metadata: { asset_id: props.asset.asset_id, command_mode: mode },
          }),
        });
        const result = await res.json().catch(() => null);
        if (!res.ok) throw new Error(result?.error || 'media_command_failed');
        pushEcho('AMV // public_fragment enviado a validacion humana', 'blue');
        return;
      }

      if (mode === 'calendar') {
        const res = await fetch('/api/calendar/phenomenological', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ node_id: props.nodeId, horizon_days: 7, asset_id: props.asset.asset_id }),
        });
        const result = await res.json().catch(() => null);
        if (!res.ok) throw new Error(result?.error || 'calendar_command_failed');
        pushEcho(`AMV // ${result?.windows?.[0]?.label || 'ventana de baja friccion detectada'}`, 'gold');
        return;
      }

      if (mode === 'social') {
        const res = await fetch('/api/social/resonance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            node_id: props.nodeId,
            platform: 'field_command',
            resonance_score: data.socialPulse.score ?? 0.5,
            comments_summary: command,
            raw_payload: { asset_id: props.asset.asset_id, command_mode: mode },
          }),
        });
        const result = await res.json().catch(() => null);
        if (!res.ok) throw new Error(result?.error || 'social_command_failed');
        pushEcho('CAMPO SOCIAL // retorno integrado', 'blue');
        return;
      }

      if (mode === 'logbook') {
        const res = await fetch('/api/bitacora/regenerate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ node_id: props.nodeId, mode: command.toLowerCase().includes('public') ? 'public_fragment' : 'operational', asset_id: props.asset.asset_id }),
        });
        const result = await res.json().catch(() => null);
        if (!res.ok) throw new Error(result?.error || 'logbook_command_failed');
        pushEcho(`AMV // ${result?.fragment || 'bitacora regenerada'}`, 'gold');
        return;
      }

      pushEcho(`AMV // ${node?.labelVisible || node?.label || 'campo'} traduce instruccion a seguimiento`, 'green');
    } catch (error) {
      pushEcho(`AMV // ${error instanceof Error ? error.message : 'command_failed'}`, 'red');
    } finally {
      setCommandBusy(false);
    }
  };

  if (failed) {
    return (
      <div className="field-fallback" role="img" aria-label="Campo cognitivo activo con visualizacion reducida">
        Campo cognitivo activo // visualizacion reducida
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`sfi-field ${props.fullScreen ? 'fullscreen' : ''}`} aria-label="Campo cognitivo vivo SFI">
      <canvas ref={canvasRef} />
      <div ref={dotRef} className="cursor-dot" />
      <div ref={ringRef} className="cursor-ring" />
      <div className="field-legend">
        {(props.nodeId ? ['MUNDO', 'RETORNO', 'PROYECTO', 'USUARIO'] : ['ESTADO', 'HECHO', 'RUTA', 'ACCION']).map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <div className="field-status">{label}</div>
      <FieldNodeInspector
        node={selectedNode}
        activationReason={selectedNode?.activationConditions[0]}
        proposal={
          selectedNode?.id === 'nodo.aptymok.intervencion'
            ? textFrom(props.amvState?.reading?.proposed_action, textFrom(props.operationalReading?.intervention))
            : selectedNode?.id === 'nodo.aptymok.media' && dataRef.current.pendingDrafts > 0
              ? 'Draft pendiente de validacion humana.'
              : selectedNode?.id === 'nodo.aptymok.calendarizacion'
                ? 'Fijar proxima observacion o revisar ventana sugerida.'
                : undefined
        }
        lastEvent={textFrom(props.recentEvents?.[0]?.event_name || props.recentEvents?.[0]?.event_type)}
        tracePayload={(props.recentEvents?.find((event) => event?.payload?.trace_payload)?.payload?.trace_payload as Record<string, unknown> | undefined)}
        onClose={() => {
          setInternalSelectedNode(null);
          props.onNodeSelect?.(null);
        }}
      />
      <FieldCommandInput activeNode={activeNode} disabled={commandBusy} onExecute={executeCommand} />
      <style jsx>{`
        .sfi-field {
          position: relative;
          width: min(84vw, 860px);
          overflow: hidden;
          border: 1px solid rgba(200,169,81,0.08);
          background:
            linear-gradient(135deg, rgba(8,18,20,0.34), rgba(6,6,5,0.98)),
            #060605;
          cursor: none;
          isolation: isolate;
          padding-bottom: 4.6rem;
        }
        .sfi-field.fullscreen {
          width: 100%;
          height: 100%;
          min-height: 100%;
          border: 0;
          padding-bottom: 0;
        }
        canvas {
          display: block;
          width: 100%;
        }
        .cursor-dot,
        .cursor-ring {
          position: absolute;
          left: 0;
          top: 0;
          pointer-events: none;
          opacity: 0;
          z-index: 3;
        }
        .cursor-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: #C8A951;
        }
        .cursor-ring {
          width: 26px;
          height: 26px;
          border-radius: 999px;
          border: 1px solid rgba(200,169,81,0.28);
        }
        .field-legend {
          position: absolute;
          right: 1rem;
          bottom: 1rem;
          display: flex;
          gap: 0.55rem;
          color: rgba(200,196,184,0.3);
          font-family: var(--font-mono), "JetBrains Mono", monospace;
          font-size: 0.48rem;
          letter-spacing: 0.18em;
        }
        .field-status {
          position: absolute;
          left: 1rem;
          top: 0.9rem;
          max-width: min(72%, 48rem);
          color: rgba(200,169,81,0.62);
          font-family: var(--font-mono), "JetBrains Mono", monospace;
          font-size: 0.54rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          pointer-events: none;
        }
        .field-fallback {
          width: min(84vw, 860px);
          border: 1px solid rgba(200,169,81,0.08);
          background: #060605;
          padding: 2rem;
          color: #5c5c52;
          font-family: var(--font-mono), "JetBrains Mono", monospace;
          font-size: 0.68rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        @media (prefers-reduced-motion: reduce) {
          .cursor-ring,
          .cursor-dot {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
