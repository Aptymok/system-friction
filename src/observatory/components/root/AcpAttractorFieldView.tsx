'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type RuntimeNode = {
  nodeKey?: string;
  id?: string;
  label?: string;
  nodeType?: string;
  runtimeState?: string;
  pressure?: number;
  variables?: unknown[];
  patterns?: unknown[];
  linkedDocuments?: unknown[];
  updated_at?: string;
  updatedAt?: string;
  created_at?: string;
  createdAt?: string;
};

type RuntimeDocument = {
  id?: string;
  documentId?: string;
  title?: string;
  source?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  linkedNodes?: unknown[];
  evidenceWeight?: number;
  confidence?: number;
};

type RuntimeProposal = {
  id?: string;
  executionId?: string;
  title?: string;
  status?: string;
  riskLevel?: string;
  risk_level?: string;
  created_at?: string;
  updated_at?: string;
  expectedFieldDelta?: unknown;
  expected_field_delta?: unknown;
};

type TwinState = {
  data?: {
    proposals?: unknown[];
    seed?: {
      nodeCatalog?: unknown[];
      documentCatalog?: unknown[];
      executionCatalog?: unknown[];
      recentEvents?: unknown[];
      mihmRuntimeMatrix?: {
        ihg?: number | null;
        nti?: number | null;
        ldi?: number | null;
        phi?: number | null;
        regime?: string;
        sourceState?: string;
      };
    };
  };
};

type EvidenceNode = {
  id: string;
  label: string;
  angle: number;
  radius: number;
  baseRadius: number;
  speed: number;
  size: number;
  shape: 'circle' | 'square' | 'triangle' | 'hexagon';
  pulseOffset: number;
  ihg: number;
  nti: number;
  ldi: number;
  timestamp: string;
  hash: string;
  lifetime: number;
  decayRate: number;
  sourceType: 'document' | 'proposal';
  status: string;
};

type InternalNode = {
  id: string;
  label: string;
  angle: number;
  baseRadius: number;
  radius: number;
  speed: number;
  size: number;
  brightness: number;
  degradation: number;
  alignment: number;
  x: number;
  y: number;
  isMetric: boolean;
  noiseSeed: number;
};

type SpaceGlitter = {
  angle: number;
  radius: number;
  speed: number;
  noiseFreq: number;
  noiseAmp: number;
  seed: number;
  size: number;
};

type PreparedField = {
  internalNodes: InternalNode[];
  evidenceNodes: EvidenceNode[];
  spaceGlitters: SpaceGlitter[];
  metrics: { ihg: number; nti: number; ldi: number; phi: number; coherence: number; fs: number };
};

type HudMetrics = {
  igh: number;
  nti: number;
  ldi: number;
  fs: string;
  coherence: string;
  evCount: number;
};

export type AcpAttractorFieldViewProps = {
  twin: TwinState | null;
  onBackToCognitive: () => void;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asNode(value: unknown): RuntimeNode | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RuntimeNode : null;
}

function asDocument(value: unknown): RuntimeDocument | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RuntimeDocument : null;
}

function asProposal(value: unknown): RuntimeProposal | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RuntimeProposal : null;
}

function arr(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function hash(input: string) {
  let value = 2166136261;
  for (let i = 0; i < input.length; i += 1) value = Math.imul(value ^ input.charCodeAt(i), 16777619);
  return Math.abs(value >>> 0);
}

function ratio(seed: number, salt: number) {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function iso(value?: string) {
  if (!value) return new Date().toISOString();
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString();
}

function age01(value?: string) {
  const parsed = Date.parse(value ?? '');
  if (!Number.isFinite(parsed)) return 0.28;
  return clamp01((Date.now() - parsed) / (1000 * 60 * 60 * 24 * 60));
}

function nodePressure(node: RuntimeNode) {
  if (typeof node.pressure === 'number') return clamp01(node.pressure);
  return clamp01(0.12 + arr(node.patterns).length * 0.08 + arr(node.variables).length * 0.04);
}

function nodeDegradation(node: RuntimeNode) {
  const pressure = nodePressure(node);
  const runtime = String(node.runtimeState ?? '').toLowerCase();
  const evidenceGap = arr(node.linkedDocuments).length === 0 ? 0.24 : 0.06;
  const runtimePenalty = runtime === 'degraded' || runtime === 'missing' ? 0.28 : runtime === 'static' ? 0.08 : 0;
  return clamp01(pressure * 0.36 + evidenceGap + runtimePenalty + age01(node.updated_at ?? node.updatedAt ?? node.created_at ?? node.createdAt) * 0.12);
}

function proposalStatusPenalty(status?: string) {
  const normalized = String(status ?? '').toLowerCase();
  if (normalized === 'closed' || normalized === 'rejected') return 0.04;
  if (normalized === 'queued' || normalized === 'pending') return 0.24;
  if (normalized === 'proposed' || normalized === 'draft') return 0.18;
  return 0.1;
}

function prepareField(twin: TwinState | null): PreparedField {
  const seed = twin?.data?.seed;
  const nodes = (seed?.nodeCatalog ?? []).map(asNode).filter(Boolean) as RuntimeNode[];
  const documents = (seed?.documentCatalog ?? []).map(asDocument).filter(Boolean) as RuntimeDocument[];
  const executionCatalog = (seed?.executionCatalog ?? []).map(asProposal).filter(Boolean) as RuntimeProposal[];
  const proposals = [...executionCatalog, ...((twin?.data?.proposals ?? []).map(asProposal).filter(Boolean) as RuntimeProposal[])];
  const matrix = seed?.mihmRuntimeMatrix;
  const ihg = Math.round(Number(matrix?.ihg ?? 0.5) * 4500);
  const nti = Math.round(Number(matrix?.nti ?? 0.5) * 100);
  const ldi = Math.round(Number(matrix?.ldi ?? 0.5) * 750);
  const phi = Number(matrix?.phi ?? (Number(matrix?.ihg ?? 0.5) * Number(matrix?.nti ?? 0.5)) / (1 + Number(matrix?.ldi ?? 0.5)));
  const evidenceMass = documents.length + proposals.length;
  const coherence = clamp01((Number(matrix?.ihg ?? 0.5) * 0.4) + (Number(matrix?.nti ?? 0.5) * 0.3) + ((1 - clamp01(Number(matrix?.ldi ?? 0.5))) * 0.2) + clamp01(evidenceMass / 20) * 0.1);
  const maxCircleRadius = 300;

  const internalNodes = nodes.slice(0, 650).map((node, index): InternalNode => {
    const id = node.nodeKey ?? node.id ?? `node-${index}`;
    const seedHash = hash(`${id}:${node.label ?? ''}`);
    const degradation = nodeDegradation(node);
    const alignment = clamp01(1 - degradation + arr(node.linkedDocuments).length * 0.05);
    const angle = ratio(seedHash, 1) * Math.PI * 2;
    const baseRadius = 24 + Math.pow(1 - alignment + ratio(seedHash, 2) * 0.55, 1.45) * (maxCircleRadius - 30);
    return {
      id,
      label: node.label ?? id,
      angle,
      baseRadius,
      radius: baseRadius,
      speed: (0.00008 + ratio(seedHash, 3) * 0.00015) * (120 / Math.max(20, baseRadius)),
      size: ratio(seedHash, 4) > 0.95 ? ratio(seedHash, 5) * 1.8 + 1.2 : ratio(seedHash, 5) * 0.7 + 0.3,
      brightness: clamp01(alignment * 0.55 + ratio(seedHash, 6) * 0.45),
      degradation,
      alignment,
      x: 0,
      y: 0,
      isMetric: String(node.nodeType ?? '').toLowerCase().includes('metric') || id.toLowerCase().includes('mihm'),
      noiseSeed: ratio(seedHash, 7) * 100,
    };
  });

  const evidenceDocs = documents.map((doc, index): EvidenceNode => {
    const id = doc.documentId ?? doc.id ?? `doc-${index}`;
    const seedHash = hash(`${id}:${doc.title ?? ''}`);
    const confidence = clamp01(Number(doc.confidence ?? doc.evidenceWeight ?? 0.5));
    return {
      id,
      label: doc.title ?? id,
      angle: (index * (Math.PI * 2 / Math.max(1, documents.length + proposals.length))) + ratio(seedHash, 1) * 0.4,
      radius: maxCircleRadius + 70 + ratio(seedHash, 2) * 110,
      baseRadius: maxCircleRadius + 70 + ratio(seedHash, 2) * 110,
      speed: 0.00045 + ratio(seedHash, 3) * 0.00075,
      size: 6.5 + confidence * 3,
      shape: 'triangle',
      pulseOffset: ratio(seedHash, 4) * 100,
      ihg,
      nti,
      ldi,
      timestamp: iso(doc.updated_at ?? doc.created_at),
      hash: `0x${hash(id).toString(16).toUpperCase().padStart(8, '0')}${hash(doc.title ?? id).toString(16).toUpperCase().padStart(8, '0')}`,
      lifetime: clamp01(1 - age01(doc.updated_at ?? doc.created_at) * 0.65) * 100,
      decayRate: 0.006 + age01(doc.updated_at ?? doc.created_at) * 0.025,
      sourceType: 'document',
      status: doc.status ?? 'document',
    };
  });

  const proposalNodes = proposals.slice(0, 24).map((proposal, index): EvidenceNode => {
    const id = proposal.executionId ?? proposal.id ?? `proposal-${index}`;
    const seedHash = hash(`${id}:${proposal.title ?? ''}`);
    const penalty = proposalStatusPenalty(proposal.status);
    return {
      id,
      label: proposal.title ?? id,
      angle: ((documents.length + index) * (Math.PI * 2 / Math.max(1, documents.length + proposals.length))) + ratio(seedHash, 1) * 0.35,
      radius: maxCircleRadius + 78 + penalty * 180 + ratio(seedHash, 2) * 80,
      baseRadius: maxCircleRadius + 78 + penalty * 180 + ratio(seedHash, 2) * 80,
      speed: 0.00055 + ratio(seedHash, 3) * 0.0009,
      size: 7 + penalty * 8,
      shape: 'square',
      pulseOffset: ratio(seedHash, 4) * 100,
      ihg,
      nti,
      ldi,
      timestamp: iso(proposal.updated_at ?? proposal.created_at),
      hash: `0x${hash(id).toString(16).toUpperCase().padStart(8, '0')}${hash(proposal.status ?? id).toString(16).toUpperCase().padStart(8, '0')}`,
      lifetime: clamp01(1 - penalty - age01(proposal.updated_at ?? proposal.created_at) * 0.35) * 100,
      decayRate: 0.01 + penalty * 0.04,
      sourceType: 'proposal',
      status: proposal.status ?? proposal.riskLevel ?? proposal.risk_level ?? 'proposal',
    };
  });

  const rawEvents = Array.isArray(seed?.recentEvents) ? seed.recentEvents : [];
  const glitterBase = rawEvents.length ? rawEvents : [...documents, ...proposals, ...nodes.slice(0, 80)];
  const spaceGlitters = glitterBase.slice(0, 550).map((item, index): SpaceGlitter => {
    const record = asRecord(item);
    const id = String(record.id ?? record.event_id ?? record.nodeKey ?? record.documentId ?? `signal-${index}`);
    const seedHash = hash(id);
    return {
      angle: ratio(seedHash, 1) * Math.PI * 2,
      radius: maxCircleRadius + 20 + ratio(seedHash, 2) * 520,
      speed: 0.45 + ratio(seedHash, 3) * 1.05,
      noiseFreq: 0.04 + ratio(seedHash, 4) * 0.05,
      noiseAmp: 2.5 + ratio(seedHash, 5) * 4,
      seed: ratio(seedHash, 6) * 10000,
      size: ratio(seedHash, 7) * 0.8 + 0.3,
    };
  });

  return {
    internalNodes,
    evidenceNodes: [...evidenceDocs, ...proposalNodes],
    spaceGlitters,
    metrics: { ihg, nti, ldi, phi, coherence, fs: 1.25 + phi * 0.012 },
  };
}

function drawShape(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, shape: EvidenceNode['shape']) {
  ctx.beginPath();
  if (shape === 'circle') ctx.arc(x, y, size, 0, Math.PI * 2);
  else if (shape === 'square') ctx.rect(x - size, y - size, size * 2, size * 2);
  else if (shape === 'triangle') {
    ctx.moveTo(x, y - size * 1.2);
    ctx.lineTo(x + size * 1.1, y + size * 0.8);
    ctx.lineTo(x - size * 1.1, y + size * 0.8);
    ctx.closePath();
  } else {
    for (let side = 0; side < 6; side += 1) {
      const angle = (side * Math.PI) / 3;
      const px = x + Math.cos(angle) * size * 1.1;
      const py = y + Math.sin(angle) * size * 1.1;
      if (side === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
}

export const AcpAttractorFieldView: React.FC<AcpAttractorFieldViewProps> = ({ twin, onBackToCognitive }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedNodeRef = useRef<EvidenceNode | null>(null);
  const selectedAtractorRef = useRef(false);
  const prepared = useMemo(() => prepareField(twin), [twin]);
  const preparedRef = useRef(prepared);
  const [selectedNode, setSelectedNode] = useState<EvidenceNode | null>(null);
  const [selectedAtractor, setSelectedAtractor] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState<string | null>(null);
  const [hudMetrics, setHudMetrics] = useState<HudMetrics>({
    igh: 0,
    nti: 0,
    ldi: 0,
    fs: '1.250',
    coherence: '0.00%',
    evCount: 0,
  });

  useEffect(() => {
    preparedRef.current = prepared;
  }, [prepared]);

  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  useEffect(() => {
    selectedAtractorRef.current = selectedAtractor;
  }, [selectedAtractor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;
    let width = 0;
    let height = 0;
    let centerX = 0;
    let centerY = 0;
    let baseSize = 0;
    let maxCircleRadius = 0;
    let timeControl = 0;
    const colors = {
      bg: '#000000',
      core: 'rgba(255, 235, 190, 1)',
      linesRadial: 'rgba(140, 105, 65, 0.04)',
      linesInterNode: 'rgba(212, 175, 125, 0.06)',
      nodeBright: 'rgba(255, 225, 170, 0.9)',
      nodeDim: 'rgba(160, 125, 90, 0.3)',
      rings: 'rgba(212, 175, 125, 0.03)',
      gridColor: 'rgba(212, 175, 125, 0.065)',
    };

    const resizeCanvas = () => {
      const rect = root.getBoundingClientRect();
      width = Math.max(320, Math.floor(rect.width));
      height = Math.max(420, Math.floor(rect.height));
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
      centerX = width / 2;
      centerY = height / 2;
      baseSize = Math.min(width, height) * 0.88;
      maxCircleRadius = baseSize * 0.43;
    };

    const handleCanvasClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;
      const distFromCenter = Math.hypot(clickX - centerX, clickY - centerY);
      const current = preparedRef.current;
      if (distFromCenter > maxCircleRadius + 220) {
        onBackToCognitive();
        return;
      }
      if (distFromCenter < 35) {
        setSelectedAtractor(true);
        setSelectedNode(null);
        return;
      }
      const found = current.evidenceNodes.find((evidence) => {
        const ex = centerX + Math.cos(evidence.angle) * evidence.radius;
        const ey = centerY + Math.sin(evidence.angle) * evidence.radius;
        return Math.hypot(clickX - ex, clickY - ey) < evidence.size + 18;
      });
      setSelectedNode(found ?? null);
      setSelectedAtractor(false);
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(root);
    canvas.addEventListener('click', handleCanvasClick);

    const render = () => {
      const current = preparedRef.current;
      timeControl += 0.03;
      current.evidenceNodes.forEach((evidence) => {
        evidence.angle += evidence.speed;
        evidence.radius = evidence.baseRadius + Math.sin(timeControl * 0.8 + evidence.pulseOffset) * 6;
        evidence.lifetime = Math.max(0, evidence.lifetime - evidence.decayRate * 0.02);
      });
      current.spaceGlitters.forEach((glitter) => {
        glitter.radius -= glitter.speed;
        glitter.angle += Math.sin(timeControl * glitter.noiseFreq + glitter.seed) * (glitter.noiseAmp / Math.max(24, glitter.radius * 0.08));
        if (glitter.radius <= maxCircleRadius) glitter.radius = Math.hypot(width, height) / 2 + hash(`${glitter.seed}`) % 90;
      });
      current.internalNodes.forEach((node) => {
        node.angle += node.speed;
        const chaosWave = Math.sin(timeControl * 2.5 + node.noiseSeed) * Math.cos(timeControl * 0.7 + node.noiseSeed * 0.5);
        node.radius = node.baseRadius + chaosWave * (6 + node.degradation * 18);
        node.x = centerX + Math.cos(node.angle) * node.radius;
        node.y = centerY + Math.sin(node.angle) * node.radius;
      });

      const evCount = current.evidenceNodes.length;
      const evMass = Math.max(1, evCount);
      const avgLife = current.evidenceNodes.reduce((sum, evidence) => sum + evidence.lifetime, 0) / evMass;
      const coherence = clamp01(current.metrics.coherence * 0.82 + (avgLife / 100) * 0.18);
      setHudMetrics({
        igh: current.metrics.ihg,
        nti: current.metrics.nti,
        ldi: current.metrics.ldi,
        fs: current.metrics.fs.toFixed(3),
        coherence: `${(coherence * 100).toFixed(2)}%`,
        evCount,
      });

      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = colors.gridColor;
      ctx.lineWidth = 0.35;
      const gridSpacing = 42;
      for (let x = 0; x < width; x += gridSpacing) {
        ctx.beginPath();
        for (let y = 0; y < height; y += 15) {
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.max(1, Math.hypot(dx, dy));
          const active = dist > maxCircleRadius;
          const noiseWave = active ? Math.sin(dist * 0.02 - timeControl * 1.5) * Math.cos(x * 0.005 + timeControl) * (12 + current.metrics.ldi / 80) : 0;
          const suction = active ? (maxCircleRadius / dist) * (8 + current.metrics.ihg / 600) : 0;
          const offsetX = active ? (dx / dist) * (noiseWave - suction) : 0;
          const offsetY = active ? (dy / dist) * (noiseWave - suction) : 0;
          if (y === 0) ctx.moveTo(x + offsetX, y + offsetY);
          else ctx.lineTo(x + offsetX, y + offsetY);
        }
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSpacing) {
        ctx.beginPath();
        for (let x = 0; x < width; x += 15) {
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.max(1, Math.hypot(dx, dy));
          const active = dist > maxCircleRadius;
          const noiseWave = active ? Math.sin(dist * 0.02 - timeControl * 1.5) * Math.cos(y * 0.005 + timeControl) * (12 + current.metrics.ldi / 80) : 0;
          const suction = active ? (maxCircleRadius / dist) * (8 + current.metrics.ihg / 600) : 0;
          const offsetX = active ? (dx / dist) * (noiseWave - suction) : 0;
          const offsetY = active ? (dy / dist) * (noiseWave - suction) : 0;
          if (x === 0) ctx.moveTo(x + offsetX, y + offsetY);
          else ctx.lineTo(x + offsetX, y + offsetY);
        }
        ctx.stroke();
      }

      const cuencaGlow = ctx.createRadialGradient(centerX, centerY, maxCircleRadius * 0.1, centerX, centerY, maxCircleRadius);
      cuencaGlow.addColorStop(0, 'rgba(0, 0, 0, 1)');
      cuencaGlow.addColorStop(0.6, 'rgba(0, 0, 0, 0.4)');
      cuencaGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = cuencaGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxCircleRadius, 0, Math.PI * 2);
      ctx.fill();

      [baseSize * 0.1, baseSize * 0.2, baseSize * 0.3, baseSize * 0.4, maxCircleRadius].forEach((radius) => {
        ctx.strokeStyle = radius === maxCircleRadius ? `rgba(212, 175, 125, ${0.03 + Math.sin(timeControl * 2) * 0.01})` : colors.rings;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        if (radius === maxCircleRadius) {
          for (let angle = 0; angle <= Math.PI * 2; angle += 0.03) {
            const noise = Math.sin(angle * 6 + timeControl * 2.2) * Math.cos(angle * 3 - timeControl) * (3 + current.metrics.ldi / 500);
            const rx = centerX + Math.cos(angle) * (maxCircleRadius + noise);
            const ry = centerY + Math.sin(angle) * (maxCircleRadius + noise);
            if (angle === 0) ctx.moveTo(rx, ry);
            else ctx.lineTo(rx, ry);
          }
          ctx.closePath();
        } else {
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        }
        ctx.stroke();
      });

      ctx.strokeStyle = 'rgba(212, 175, 125, 0.03)';
      ctx.beginPath();
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      current.internalNodes.forEach((node, index) => {
        let connectionsCount = 0;
        for (let j = index + 1; j < current.internalNodes.length && connectionsCount <= 2; j += 1) {
          const other = current.internalNodes[j];
          const distance = Math.hypot(node.x - other.x, node.y - other.y);
          if (distance < baseSize * 0.045) {
            ctx.strokeStyle = node.degradation > 0.58 || other.degradation > 0.58 ? 'rgba(200, 112, 96, 0.11)' : colors.linesInterNode;
            ctx.lineWidth = 0.25;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
            connectionsCount += 1;
          }
        }
        if (index % 7 === 0) {
          ctx.strokeStyle = colors.linesRadial;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(node.x, node.y);
          ctx.stroke();
        }
      });

      current.internalNodes.forEach((node) => {
        if (node.isMetric && node.size > 1.2) {
          ctx.strokeStyle = 'rgba(212, 175, 125, 0.4)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.size * 1.3, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = node.degradation > 0.62 ? 'rgba(200,112,96,0.42)' : node.brightness > 0.7 ? colors.nodeBright : colors.nodeDim;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      current.spaceGlitters.forEach((glitter) => {
        const gx = centerX + Math.cos(glitter.angle) * glitter.radius;
        const gy = centerY + Math.sin(glitter.angle) * glitter.radius;
        if (gx >= 0 && gx <= width && gy >= 0 && gy <= height) {
          const proximityAlpha = 0.18 + (1 - (glitter.radius - maxCircleRadius) / Math.max(1, width * 0.5)) * 0.22;
          ctx.fillStyle = `rgba(212, 175, 125, ${Math.max(0.15, proximityAlpha)})`;
          ctx.beginPath();
          ctx.arc(gx, gy, glitter.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      current.evidenceNodes.forEach((evidence) => {
        const ex = centerX + Math.cos(evidence.angle) * evidence.radius;
        const ey = centerY + Math.sin(evidence.angle) * evidence.radius;
        const pulse = 0.7 + Math.sin(timeControl * 3 + evidence.pulseOffset) * 0.3;
        const alpha = (evidence.lifetime / 100) * pulse;
        const selected = selectedNodeRef.current?.id === evidence.id;
        ctx.strokeStyle = selected ? `rgba(255, 235, 190, ${pulse})` : `rgba(212, 175, 125, ${alpha * 0.8})`;
        ctx.fillStyle = selected ? `rgba(255, 215, 140, ${0.4 + pulse * 0.3})` : `rgba(160, 125, 90, ${alpha * 0.25})`;
        ctx.lineWidth = selected ? 1.2 : 0.6;
        drawShape(ctx, ex, ey, evidence.size, evidence.shape);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = selected ? 'rgba(255,255,255,0.7)' : 'rgba(212, 175, 125, 0.35)';
        ctx.font = '7px Courier New';
        ctx.fillText(evidence.id.slice(0, 22), ex + evidence.size + 4, ey + 2);
      });

      const glowRadius = 34 + Math.sin(timeControl * 4) * 2;
      const gradient = ctx.createRadialGradient(centerX, centerY, 1, centerX, centerY, glowRadius);
      gradient.addColorStop(0, 'rgba(255, 245, 220, 1)');
      gradient.addColorStop(0.2, 'rgba(215, 160, 100, 0.4)');
      gradient.addColorStop(0.5, 'rgba(120, 80, 40, 0.12)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
      ctx.fill();
      if (selectedAtractorRef.current) {
        ctx.strokeStyle = `rgba(255, 235, 190, ${0.5 + Math.sin(timeControl * 5) * 0.2})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = colors.core;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('click', handleCanvasClick);
      resizeObserver.disconnect();
    };
  }, [onBackToCognitive]);

  return (
    <div ref={rootRef} className="relative h-full min-h-0 w-full overflow-hidden bg-black">
      <canvas ref={canvasRef} className="block cursor-crosshair" />
      <div className="pointer-events-none absolute left-1/2 top-[4%] -translate-x-1/2 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-[#d4af7d]/55">Observatorio<br />longitudinal<br />sistemico</div>
      <div className="pointer-events-none absolute bottom-[4%] left-1/2 -translate-x-1/2 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-[#d4af7d]/55">W Spect<br />//<br />espectro<br />de posibilidades</div>
      <div className="pointer-events-none absolute left-[4%] top-1/2 -translate-y-1/2 -rotate-90 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-[#d4af7d]/55">Atlas<br />//<br />cartografia del campo</div>
      <div className="pointer-events-none absolute right-[4%] top-1/2 -translate-y-1/2 rotate-90 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-[#d4af7d]/55">MIHM<br />//<br />memoria inmaterial</div>

      {selectedNode ? (
        <div className="absolute bottom-[6%] right-[4%] z-30 w-[340px] border border-[#d4af7d]/40 bg-black/95 p-4 font-mono text-[10px] text-[#d4af7d]">
          <div className="mb-2 border-b border-dashed border-[#d4af7d]/30 pb-2 font-bold text-white">{selectedNode.id}</div>
          <div>TIPO: <span className="text-[#ffe1aa]">{selectedNode.sourceType}</span></div>
          <div>ESTADO: <span className="text-[#ffe1aa]">{selectedNode.status}</span></div>
          <div>IHG: <span className="text-[#ffe1aa]">{selectedNode.ihg}</span></div>
          <div>NTI: <span className="text-[#ffe1aa]">{selectedNode.nti}</span></div>
          <div>LDI: <span className="text-[#ffe1aa]">{selectedNode.ldi}</span></div>
          <div>TIMESTAMP: <span className="text-[#ffe1aa]">{selectedNode.timestamp.replace('T', ' ').slice(0, 19)}</span></div>
          <div className="break-all text-[8px]">HASH: <span className="text-[#ffe1aa]">{selectedNode.hash}</span></div>
          <div className="mt-1 border-t border-[#d4af7d]/15 pt-1">DEGRADATION: <span className="font-bold text-[#ff9d5c]">{selectedNode.lifetime.toFixed(2)}%</span></div>
          <button type="button" className="mt-3 text-white underline" onClick={() => setIsModalOpen('evidence')}>Leer mas // Analisis documental</button>
        </div>
      ) : null}

      {selectedAtractor ? (
        <div className="absolute bottom-[6%] left-[4%] z-30 w-[340px] border border-[#ffebbe]/50 bg-black/95 p-4 font-mono text-[10px] text-[#d4af7d]">
          <div className="mb-2 border-b border-dashed border-[#d4af7d]/30 pb-2 font-bold text-white">NUCLEO ATRACTOR // CENTRAL</div>
          <div className="mb-2 text-white/60">Horizonte critico de convergencia sistemica y colapso de flujos entrantes.</div>
          <div>TIEMPO PREFIJADO AL ATRACTOR: <span className="text-[#ffe1aa]">144.00 Hz / Delta T</span></div>
          <div># DE EVIDENCIAS EN ORBITA: <span className="text-[#ffe1aa]">{hudMetrics.evCount}</span></div>
          <div>INDICE DE COHERENCIA GLOBAL: <span className="text-[#ffe1aa]">{hudMetrics.coherence}</span></div>
          <table className="mt-2 w-full border-t border-dashed border-[#d4af7d]/30 text-[9px]">
            <tbody>
              <tr><td>IHG</td><td>&gt; 4500</td><td className="text-[#ffe1aa]">{hudMetrics.igh}</td></tr>
              <tr><td>NTI</td><td>&gt; 50</td><td className="text-[#ffe1aa]">{hudMetrics.nti}</td></tr>
              <tr><td>LDI</td><td>&gt; 750</td><td className="text-[#ffe1aa]">{hudMetrics.ldi}</td></tr>
              <tr><td>F_S</td><td>1.250</td><td className="text-[#ffe1aa]">{hudMetrics.fs}</td></tr>
            </tbody>
          </table>
          <button type="button" className="mt-3 text-white underline" onClick={() => setIsModalOpen('atractor')}>Leer mas // Cartografia full</button>
        </div>
      ) : null}

      {isModalOpen ? (
        <div className="fixed inset-0 z-[1000] overflow-y-auto bg-black px-[10%] py-[6%] font-mono text-[#d4af7d]">
          <div className="mx-auto max-w-3xl leading-7">
            <h1 className="mb-8 border-b border-[#d4af7d]/30 pb-4 text-xl tracking-[0.18em] text-white">
              {isModalOpen === 'atractor' ? 'Cartografia critica del atractor central fijo' : `Analisis de nodo // ${selectedNode?.id}`}
            </h1>
            {isModalOpen === 'atractor' ? (
              <div className="text-sm">
                <p>El atractor central representa el punto de convergencia entre evidencia, MIHM, degradacion y decisiones ACP. Su lectura no declara certeza: indica que variables sostener, que cierre falta y que evidencia mantiene la direccion.</p>
                <table className="my-6 w-full border-collapse text-xs">
                  <tbody>
                    <tr><td className="border border-[#d4af7d]/20 p-2">IHG</td><td className="border border-[#d4af7d]/20 p-2">Estabilidad de conexiones finas.</td></tr>
                    <tr><td className="border border-[#d4af7d]/20 p-2">NTI</td><td className="border border-[#d4af7d]/20 p-2">Canales activos de transmision inmaterial.</td></tr>
                    <tr><td className="border border-[#d4af7d]/20 p-2">LDI</td><td className="border border-[#d4af7d]/20 p-2">Friccion acumulada y disipacion inversa.</td></tr>
                    <tr><td className="border border-[#d4af7d]/20 p-2">F_S</td><td className="border border-[#d4af7d]/20 p-2">Velocidad orbital corregida por evidencia.</td></tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm">Este nodo proviene de documento o propuesta real. Su orbita deriva de estado, fecha, evidencia, riesgo y alineacion con el campo. Si se degrada, debe cerrarse, probarse o devolverse a propuesta ACP.</p>
            )}
            <button type="button" className="mt-8 border border-[#d4af7d]/50 px-4 py-2 text-white" onClick={() => setIsModalOpen(null)}>Cerrar visualizacion</button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
