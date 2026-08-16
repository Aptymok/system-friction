import 'server-only';

import type { SfiCaseCinematicModel } from '@/components/cases/SfiCaseCinematicWorkspace';
import { getSfiServiceProfile } from '@/core/case-platform';
import { readOperationalCase } from './repository';
import { listCaseActionProposals } from './actionRepository';
import { listOperationalEnterpriseRelations } from './enterpriseRepository';
import { buildSystemAiObservatoryReadModel } from './systemAiReadModel';

const SYSTEM_AI_PROFILES = new Set([
  'SYSTEM_OBSERVATORY',
  'AI_IMPLEMENTATION_DIAGNOSTIC',
  'AI_ADOPTION_INTEGRATION',
  'AI_GOVERNANCE_ASSURANCE',
]);
const ENTERPRISE_PROFILES = new Set([
  'SERVICE_OBSERVABILITY',
  'CONTRACT_WARRANTY_ASSURANCE',
  'TENDER_ASSURANCE',
  'ENTERPRISE_MEMORY',
]);

type Tone = 'OBSERVED' | 'DERIVED' | 'INFERRED' | 'PROJECTED' | 'SIMULATED' | 'MISSING' | 'CONTRADICTED' | 'GOVERNED';
type Json = Record<string, unknown>;

function object(value: unknown): Json {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Json : {};
}
function text(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function number(value: unknown) { const parsed = typeof value === 'number' ? value : Number(value); return Number.isFinite(parsed) ? parsed : null; }
function toneFromEpistemic(value: unknown): Tone {
  const normalized = String(value ?? '').toUpperCase();
  if (normalized === 'SOURCE' || normalized === 'RECORD' || normalized === 'OBSERVED' || normalized === 'EVIDENCE') return 'OBSERVED';
  if (normalized === 'DERIVED') return 'DERIVED';
  if (normalized === 'INFERRED' || normalized === 'INFERENCE' || normalized === 'HYPOTHESIS') return 'INFERRED';
  if (normalized === 'PROJECTED' || normalized === 'RECOMMENDATION') return 'PROJECTED';
  if (normalized === 'SIMULATED') return 'SIMULATED';
  if (normalized.includes('CONTRAD')) return 'CONTRADICTED';
  if (normalized.includes('MISS') || normalized.includes('UNDETERMIN')) return 'MISSING';
  return 'GOVERNED';
}
function objectLabel(item: { kind: string; canonicalRef: { id: string }; payload: Json }) {
  return text(item.payload.label) ?? text(item.payload.title) ?? text(item.payload.name) ?? text(item.payload.requirementId) ?? text(item.payload.ticketId) ?? item.canonicalRef.id;
}
function objectType(item: { kind: string; payload: Json }) {
  return text(item.payload.entityType) ?? text(item.payload.objectType) ?? item.kind;
}
function observedAt(item: { observedAt: string | null; createdAt: string }) { return item.observedAt ?? item.createdAt; }
function profileCommands(profileId: string) {
  switch (profileId) {
    case 'SYSTEM_OBSERVATORY': return ['aísla la fricción dominante', 'traza dependencias', 'contrasta dos estados', 'reconstruye trayectoria', 'envía hipótesis a Method Lab'];
    case 'AI_IMPLEMENTATION_DIAGNOSTIC': return ['traza una ejecución', 'localiza la fricción', 'muestra handoff humano', 'contrasta retrieval y modelo', 'envía perturbación a Method Lab'];
    case 'AI_ADOPTION_INTEGRATION': return ['ordena procesos por evidencia', 'muestra use cases candidatos', 'separa valor proyectado de retorno', 'propón intervención mínima'];
    case 'AI_GOVERNANCE_ASSURANCE': return ['reconstruye la decisión', 'muestra etapas faltantes', 'separa output de autoridad', 'traza retorno'];
    case 'SERVICE_OBSERVABILITY': return ['agrupa recurrencias', 'traza ticket a activo', 'muestra proveedor y SLA', 'compara retorno por periodo'];
    case 'CONTRACT_WARRANTY_ASSURANCE': return ['traza obligación a evento', 'muestra garantías abiertas', 'contrasta proveedor por periodo', 'separa evento de incumplimiento'];
    case 'TENDER_ASSURANCE': return ['muestra matriz requisito × licitante', 'abre evidencia indeterminada', 'lista contradicciones', 'separa evaluación de decisión'];
    case 'ENTERPRISE_MEMORY': return ['traza continuidad anual', 'conecta licitación a retorno', 'compara proveedores', 'muestra huecos temporales'];
    default: return ['observa evidencia', 'traza lineage', 'contrasta estados', 'genera hipótesis'];
  }
}

export async function buildCaseCinematicReadModel(caseId: string, userId: string): Promise<SfiCaseCinematicModel> {
  const envelope = await readOperationalCase(caseId, userId);
  const caseRecord = envelope.caseRecord;
  const profile = getSfiServiceProfile(caseRecord.serviceProfileId);
  const actions = await listCaseActionProposals(caseId, userId).catch(() => []);
  const relationRows: Array<{ id: string; relationType: string; from: { id: string; entityType?: string }; to: { id: string; entityType?: string }; epistemicRole?: string; evidenceRefs?: Array<{ id: string }> }> = [];

  if (SYSTEM_AI_PROFILES.has(caseRecord.serviceProfileId)) {
    const readModel = await buildSystemAiObservatoryReadModel(caseId, userId);
    for (const relation of readModel.relations) relationRows.push({ id: relation.id, relationType: relation.relationType, from: relation.from, to: relation.to, epistemicRole: relation.epistemicRole, evidenceRefs: relation.evidenceRefs });
  } else if (ENTERPRISE_PROFILES.has(caseRecord.serviceProfileId)) {
    const relations = await listOperationalEnterpriseRelations(caseId, userId).catch(() => []);
    for (const relation of relations) relationRows.push({ id: relation.id, relationType: relation.relationType, from: relation.from, to: relation.to, epistemicRole: relation.epistemicRole, evidenceRefs: relation.evidenceRefs });
  }

  const nodesById = new Map<string, { id: string; label: string; type: string; tone: Tone; status: string | null }>();
  for (const item of envelope.objects) {
    nodesById.set(item.canonicalRef.id, { id: item.canonicalRef.id, label: objectLabel(item), type: objectType(item), tone: toneFromEpistemic(item.epistemicRole), status: item.kind });
  }
  for (const relation of relationRows) {
    if (!nodesById.has(relation.from.id)) nodesById.set(relation.from.id, { id: relation.from.id, label: relation.from.id, type: relation.from.entityType ?? 'ENTITY', tone: 'GOVERNED', status: null });
    if (!nodesById.has(relation.to.id)) nodesById.set(relation.to.id, { id: relation.to.id, label: relation.to.id, type: relation.to.entityType ?? 'ENTITY', tone: 'GOVERNED', status: null });
  }

  const nodes = Array.from(nodesById.values()).slice(0, 42).map((node, index) => ({ ...node, selected: index === 0 }));
  const relations = relationRows.slice(0, 90).map((relation) => ({
    id: relation.id,
    sourceId: relation.from.id,
    targetId: relation.to.id,
    label: relation.relationType,
    tone: toneFromEpistemic(relation.epistemicRole),
    strength: relation.evidenceRefs?.length ? Math.min(1, .28 + relation.evidenceRefs.length * .08) : null,
  }));

  const insights = envelope.objects
    .filter((item) => ['OBSERVATION','EVIDENCE','FRICTION','EPISTEMIC_ASSESSMENT','ANALYSIS','HYPOTHESIS','RECOMMENDATION','RETURN','CONTRADICTION','TRAJECTORY','ATTRACTOR'].includes(item.kind))
    .slice(-45)
    .reverse()
    .map((item) => ({
      id: item.id,
      tone: item.kind === 'CONTRADICTION' ? 'CONTRADICTED' as const : item.kind === 'HYPOTHESIS' ? 'INFERRED' as const : item.kind === 'RECOMMENDATION' ? 'PROJECTED' as const : toneFromEpistemic(item.epistemicRole),
      statement: text(item.payload.statement) ?? text(item.payload.summary) ?? text(item.payload.description) ?? `${item.kind}: ${objectLabel(item)}`,
      evidenceCount: item.evidenceRefs.length,
      at: observedAt(item),
    }));

  const timeline = envelope.objects.slice(-80).map((item) => ({ id: item.id, at: observedAt(item), label: objectLabel(item), type: item.kind, tone: toneFromEpistemic(item.epistemicRole) }));
  const kinds = new Map<string, number>();
  for (const item of envelope.objects) kinds.set(item.kind, (kinds.get(item.kind) ?? 0) + 1);
  const sourceCoverage = Math.round(envelope.readiness.sourceCoverage * 100);
  const openActions = actions.filter((action) => !['REJECTED','CANCELLED','RETURN_RECORDED'].includes(action.status)).length;
  const pendingActions = actions.filter((action) => action.status === 'PENDING').length;

  const mihmObject = envelope.objects.slice().reverse().find((item) => {
    const payload = object(item.payload);
    return Object.keys(object(payload.mihm)).length > 0 || text(payload.model) === 'MIHM';
  });
  const mihm = object(mihmObject?.payload.mihm ?? mihmObject?.payload);
  const mihmEntries = Object.entries(mihm).filter(([, value]) => number(value) !== null).slice(0, 6);
  const mihmStats = mihmEntries.length
    ? mihmEntries.map(([key, value]) => ({ label: key.toUpperCase(), value: String(number(value)?.toFixed(3) ?? '—'), detail: mihmObject?.canonicalRef.id ?? null, tone: 'DERIVED' as const }))
    : [{ label: 'MIHM VECTOR', value: '—', detail: 'NO PERSISTED MIHM ASSESSMENT', tone: 'MISSING' as const }];

  const frictionObjects = envelope.objects.filter((item) => item.kind === 'FRICTION');
  const trajectoryObjects = envelope.objects.filter((item) => item.kind === 'TRAJECTORY');
  const attractorObjects = envelope.objects.filter((item) => item.kind === 'ATTRACTOR');
  const returnObjects = envelope.objects.filter((item) => item.kind === 'RETURN');
  const contradictionObjects = envelope.objects.filter((item) => item.kind === 'CONTRADICTION');

  const time = caseRecord.temporalWindow;
  const timeWindow = [time.start, time.end].filter(Boolean).join(' → ') || time.cutoff;
  const serviceLabel = profile?.label ?? caseRecord.serviceProfileId;

  const crumbs = [
    { label: 'TENANT', value: caseRecord.tenantId },
    { label: 'CASE', value: caseRecord.subject, tone: 'accent' as const },
    { label: 'SERVICE', value: serviceLabel },
    { label: 'SCOPE', value: caseRecord.scope },
    { label: 'STATUS', value: caseRecord.status },
  ];

  return {
    caseId: caseRecord.id,
    subject: caseRecord.subject,
    scope: caseRecord.scope,
    serviceProfileId: caseRecord.serviceProfileId,
    serviceLabel,
    status: caseRecord.status,
    tenantId: caseRecord.tenantId,
    timeWindow,
    generatedAt: new Date().toISOString(),
    crumbs,
    nodes,
    relations,
    insights,
    timeline,
    evidenceStats: [
      { label: 'SOURCES', value: String(kinds.get('SOURCE') ?? 0), tone: 'OBSERVED' },
      { label: 'RECORDS', value: String(kinds.get('RECORD') ?? 0), tone: 'OBSERVED' },
      { label: 'EVIDENCE', value: String(kinds.get('EVIDENCE') ?? 0), tone: 'OBSERVED' },
      { label: 'SOURCE COVERAGE', value: `${sourceCoverage}%`, detail: envelope.readiness.missingSources.length ? envelope.readiness.missingSources.join(' · ') : 'REQUIRED SOURCES PRESENT', tone: sourceCoverage === 100 ? 'GOVERNED' : 'MISSING' },
      { label: 'CONTRADICTIONS', value: String(contradictionObjects.length), tone: contradictionObjects.length ? 'CONTRADICTED' : 'GOVERNED' },
    ],
    mihmStats,
    frictionStats: [
      { label: 'FRICTION RECORDS', value: String(frictionObjects.length), tone: frictionObjects.length ? 'INFERRED' : 'MISSING' },
      { label: 'RELATIONS', value: String(relations.length), tone: relations.length ? 'OBSERVED' : 'MISSING' },
      { label: 'DIMENSION EXCHANGE', value: '—', detail: 'NO PERSISTED EXCHANGE RESULT UNLESS PROVIDED BY ANALYSIS', tone: 'MISSING' },
    ],
    regimeStats: [
      { label: 'TRAJECTORIES', value: String(trajectoryObjects.length), tone: trajectoryObjects.length ? 'DERIVED' : 'MISSING' },
      { label: 'ATTRACTORS', value: String(attractorObjects.length), tone: attractorObjects.length ? 'INFERRED' : 'MISSING' },
      { label: 'REGIME', value: 'UNRESOLVED', detail: 'No automatic regime claim from counts', tone: 'MISSING' },
    ],
    returnStats: [
      { label: 'RETURNS', value: String(returnObjects.length), tone: returnObjects.length ? 'OBSERVED' : 'MISSING' },
      { label: 'ACTION PROPOSALS', value: String(actions.length), tone: actions.length ? 'PROJECTED' : 'GOVERNED' },
      { label: 'PENDING AUTHORITY', value: String(pendingActions), tone: pendingActions ? 'PROJECTED' : 'GOVERNED' },
      { label: 'OPEN ACTION STATES', value: String(openActions), tone: openActions ? 'GOVERNED' : 'OBSERVED' },
    ],
    actions: [
      { id: 'observe', label: 'OBSERVE' },
      { id: 'contrast', label: 'CONTRAST' },
      { id: 'trace', label: 'TRACE' },
      { id: 'lab', label: 'LAB' },
      { id: 'report', label: 'REPORT' },
      { id: 'approve', label: 'APPROVE', disabled: pendingActions === 0 },
    ],
    commands: profileCommands(caseRecord.serviceProfileId),
    fieldLabel: `${caseRecord.subject} · ${serviceLabel}`,
    fieldDetail: `${nodes.length} entities/objects · ${relations.length} governed relations · ${envelope.objects.length} case records`,
    authorityNote: 'CLIENT/OPERATOR → CASE · SFI ANALYST → ANALYSIS · OWNER/ADMIN → ACTION AUTHORITY',
  };
}
