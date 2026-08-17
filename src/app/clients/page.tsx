import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AccessDeniedError, requireAuthenticatedUser } from '@/lib/system/access/server';
import { listOperationalCases, listOperationalTenants } from '@/lib/sfi/case-platform/repository';
import { listTenantEnterpriseRelations } from '@/lib/sfi/case-platform/enterpriseRepository';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'SFI Clients · Enterprise Continuity',
  description: 'Superficie privada de continuidad longitudinal para clientes de System Friction Institute.',
  robots: { index: false, follow: false, nocache: true },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type PeriodKey = '30d' | '90d' | '365d' | 'all';
type DomainKey = 'all' | 'mai' | 'warranty' | 'tender' | 'bridges';
type EnterpriseRelation = Awaited<ReturnType<typeof listTenantEnterpriseRelations>>[number];
type EnterpriseEntity = EnterpriseRelation['from'];

type GraphNode = EnterpriseEntity & {
  key: string;
  x: number;
  y: number;
  stage: number;
};

const PERIODS: Array<{ key: PeriodKey; label: string; days: number | null }> = [
  { key: '30d', label: '30 días', days: 30 },
  { key: '90d', label: '90 días', days: 90 },
  { key: '365d', label: '12 meses', days: 365 },
  { key: 'all', label: 'Todo el historial', days: null },
];

const DOMAINS: Array<{ key: DomainKey; label: string; short: string }> = [
  { key: 'all', label: 'Continuidad completa', short: 'ALL' },
  { key: 'mai', label: 'MAI · Service Desk', short: 'MAI' },
  { key: 'warranty', label: 'Contratos + Garantías', short: 'WARRANTY' },
  { key: 'tender', label: 'Licitaciones', short: 'TENDER' },
  { key: 'bridges', label: 'Puentes entre dominios', short: 'BRIDGES' },
];

const STAGES = [
  'LICITACIÓN',
  'PROVEEDOR / CONTRATO',
  'ACTIVO / SERVICIO',
  'MAI / SLA',
  'GARANTÍA',
  'RETORNO / DESEMPEÑO',
] as const;

const MAI_ENTITIES = new Set(['TICKET', 'SLA', 'INCIDENT', 'SERVICE_REQUEST', 'HELP_DESK_TICKET']);
const WARRANTY_ENTITIES = new Set(['CONTRACT', 'OBLIGATION', 'ASSET', 'SERVICE', 'WARRANTY', 'WARRANTY_EVENT', 'RETURN', 'SUPPLIER_PERFORMANCE']);
const TENDER_ENTITIES = new Set(['TENDER', 'REQUIREMENT', 'BIDDER', 'BID_SUBMISSION', 'PROCUREMENT_PROCESS', 'TENDER_ASSESSMENT']);

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizePeriod(value: string | undefined): PeriodKey {
  return PERIODS.some((period) => period.key === value) ? value as PeriodKey : '90d';
}

function normalizeDomain(value: string | undefined): DomainKey {
  return DOMAINS.some((domain) => domain.key === value) ? value as DomainKey : 'all';
}

function relationDate(relation: EnterpriseRelation) {
  return relation.observedAt || relation.createdAt;
}

function withinPeriod(relation: EnterpriseRelation, period: PeriodKey) {
  const definition = PERIODS.find((item) => item.key === period) ?? PERIODS[1];
  if (definition.days === null) return true;
  const timestamp = Date.parse(relationDate(relation));
  if (!Number.isFinite(timestamp)) return false;
  return timestamp >= Date.now() - definition.days * 86_400_000;
}

function entityDomains(entityType: string) {
  const type = entityType.toUpperCase();
  const domains = new Set<Exclude<DomainKey, 'all' | 'bridges'>>();
  if (MAI_ENTITIES.has(type)) domains.add('mai');
  if (WARRANTY_ENTITIES.has(type)) domains.add('warranty');
  if (TENDER_ENTITIES.has(type)) domains.add('tender');
  return domains;
}

function relationDomains(relation: EnterpriseRelation) {
  const domains = new Set([...entityDomains(relation.from.entityType), ...entityDomains(relation.to.entityType)]);
  return domains;
}

function relationMatchesDomain(relation: EnterpriseRelation, domain: DomainKey) {
  if (domain === 'all') return true;
  const domains = relationDomains(relation);
  if (domain === 'bridges') return domains.size > 1;
  return domains.has(domain);
}

function profileDomain(profileId: string): Exclude<DomainKey, 'all'> | 'other' {
  switch (profileId) {
    case 'SERVICE_OBSERVABILITY': return 'mai';
    case 'CONTRACT_WARRANTY_ASSURANCE': return 'warranty';
    case 'TENDER_ASSURANCE': return 'tender';
    case 'ENTERPRISE_MEMORY': return 'bridges';
    default: return 'other';
  }
}

function entityStage(entityType: string) {
  switch (entityType.toUpperCase()) {
    case 'TENDER':
    case 'REQUIREMENT':
    case 'BIDDER':
    case 'BID_SUBMISSION':
    case 'PROCUREMENT_PROCESS':
    case 'TENDER_ASSESSMENT':
      return 0;
    case 'SUPPLIER':
    case 'CONTRACT':
    case 'OBLIGATION':
      return 1;
    case 'ASSET':
    case 'SERVICE':
      return 2;
    case 'TICKET':
    case 'HELP_DESK_TICKET':
    case 'INCIDENT':
    case 'SERVICE_REQUEST':
    case 'SLA':
      return 3;
    case 'WARRANTY':
    case 'WARRANTY_EVENT':
      return 4;
    case 'RETURN':
    case 'SUPPLIER_PERFORMANCE':
      return 5;
    default:
      return 2;
  }
}

function entityKey(entity: EnterpriseEntity) {
  return `${entity.entityType}:${entity.id}`;
}

function shortId(value: string) {
  if (value.length <= 18) return value;
  return `${value.slice(0, 9)}…${value.slice(-5)}`;
}

function relationLabel(relation: EnterpriseRelation) {
  const payload = relation.payload;
  for (const key of ['label', 'name', 'title', 'description']) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return relation.relationType.replaceAll('_', ' ');
}

function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return 'SIN FECHA';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'FECHA NO DETERMINADA';
  return new Intl.DateTimeFormat('es-MX', withTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' }).format(date).toUpperCase();
}

function buildHref(tenantId: string, period: PeriodKey, domain: DomainKey) {
  const params = new URLSearchParams({ tenant: tenantId, period, domain });
  return `/clients?${params.toString()}`;
}

function buildGraph(relations: EnterpriseRelation[]) {
  const graphRelations = relations.slice(-42);
  const nodesByKey = new Map<string, EnterpriseEntity>();
  for (const relation of graphRelations) {
    nodesByKey.set(entityKey(relation.from), relation.from);
    nodesByKey.set(entityKey(relation.to), relation.to);
  }

  const grouped = new Map<number, Array<EnterpriseEntity & { key: string }>>();
  for (const entity of nodesByKey.values()) {
    const stage = entityStage(entity.entityType);
    const current = grouped.get(stage) ?? [];
    current.push({ ...entity, key: entityKey(entity) });
    grouped.set(stage, current);
  }

  for (const group of grouped.values()) {
    group.sort((a, b) => `${a.entityType}:${a.id}`.localeCompare(`${b.entityType}:${b.id}`));
  }

  const maxInStage = Math.max(1, ...Array.from(grouped.values()).map((group) => group.length));
  const height = Math.max(500, maxInStage * 74 + 150);
  const usableHeight = height - 170;
  const graphNodes = new Map<string, GraphNode>();

  for (let stage = 0; stage < STAGES.length; stage += 1) {
    const group = grouped.get(stage) ?? [];
    group.forEach((entity, index) => {
      const y = 115 + ((index + 1) * usableHeight) / (group.length + 1);
      graphNodes.set(entity.key, {
        ...entity,
        stage,
        x: 85 + stage * 205,
        y,
      });
    });
  }

  return { relations: graphRelations, nodes: graphNodes, height };
}

async function requireClientPage() {
  try {
    return await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError && error.status === 401) {
      redirect('/login?next=%2Fclients');
    }
    throw error;
  }
}

function Metric({ label, value, note }: { label: string; value: number | string; note: string }) {
  return (
    <article className="border border-[#332c20] bg-[#090908bd] p-5 backdrop-blur-lg">
      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#98896b]">{label}</span>
      <strong className="mt-3 block font-serif text-4xl font-normal text-[#e4c377]">{value}</strong>
      <p className="mt-3 text-xs leading-6 text-[#8e8575]">{note}</p>
    </article>
  );
}

function DomainCard({
  eyebrow,
  title,
  cases,
  relations,
  description,
  active,
  href,
}: {
  eyebrow: string;
  title: string;
  cases: number;
  relations: number;
  description: string;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`group block border p-5 no-underline transition-colors ${active ? 'border-[#c8a951] bg-[#151106d9]' : 'border-[#332c20] bg-[#090908bd] hover:border-[#6d5a31]'}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#c8a951]">{eyebrow}</span>
        <span className="font-mono text-[9px] text-[#776f62]">{cases} CASES · {relations} REL</span>
      </div>
      <h3 className="mt-4 font-serif text-2xl font-normal text-[#f0e4c9]">{title}</h3>
      <p className="mt-3 text-xs leading-6 text-[#908777]">{description}</p>
    </Link>
  );
}

export default async function ClientsPage({ searchParams }: { searchParams: SearchParams }) {
  const { user } = await requireClientPage();
  const params = await searchParams;
  const period = normalizePeriod(first(params.period));
  const domain = normalizeDomain(first(params.domain));

  const rawTenants = await listOperationalTenants(user.id);
  const tenants = [...rawTenants].sort((a, b) => {
    const rank = (type: string) => type === 'CLIENT' ? 0 : type === 'INTERNAL' ? 1 : type === 'RESEARCH' ? 2 : 3;
    return rank(a.type) - rank(b.type) || a.name.localeCompare(b.name);
  });

  if (!tenants.length) {
    return (
      <main className="min-h-screen bg-transparent px-5 py-16 text-[#d8d1c0] md:px-10">
        <div className="mx-auto max-w-6xl">
          <header className="border border-[#332c20] bg-[#090908c9] p-6 backdrop-blur-xl md:p-9">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#c8a951]">SFI CLIENTS · ENTERPRISE CONTINUITY</p>
            <h1 className="mt-4 font-serif text-5xl font-normal text-[#f2e8d2]">No hay un tenant accesible para esta identidad.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#999080]">
              Esta superficie no crea acceso ni mezcla información entre clientes. Sólo materializa tenants con membresía activa para la identidad autenticada.
            </p>
            <Link href="/" className="mt-7 inline-block border border-[#5b4b28] px-4 py-3 font-mono text-[9px] uppercase tracking-[0.15em] text-[#c8a951] no-underline hover:border-[#c8a951]">Volver a SFI</Link>
          </header>
        </div>
      </main>
    );
  }

  const requestedTenantId = first(params.tenant);
  const selectedTenant = tenants.find((tenant) => tenant.id === requestedTenantId) ?? tenants[0];
  const allCases = await listOperationalCases(user.id);
  const tenantCases = allCases.filter((item) => item.tenantId === selectedTenant.id);

  let allRelations: EnterpriseRelation[] = [];
  let graphWarning: string | null = null;
  try {
    allRelations = await listTenantEnterpriseRelations(selectedTenant.id, user.id);
  } catch (error) {
    graphWarning = error instanceof Error ? error.message : 'No fue posible leer el grafo empresarial.';
  }

  const periodRelations = allRelations.filter((relation) => withinPeriod(relation, period));
  const filteredRelations = periodRelations.filter((relation) => relationMatchesDomain(relation, domain));
  const graph = buildGraph(filteredRelations);
  const activeCases = tenantCases.filter((item) => !['CLOSED', 'REJECTED'].includes(String(item.status))).length;
  const evidenceLinked = filteredRelations.filter((relation) => relation.evidenceRefs.length > 0).length;
  const bridgeCount = periodRelations.filter((relation) => relationDomains(relation).size > 1).length;
  const nodesInFilteredGraph = new Set(filteredRelations.flatMap((relation) => [entityKey(relation.from), entityKey(relation.to)])).size;

  const caseCounts = {
    mai: tenantCases.filter((item) => profileDomain(item.serviceProfileId) === 'mai').length,
    warranty: tenantCases.filter((item) => profileDomain(item.serviceProfileId) === 'warranty').length,
    tender: tenantCases.filter((item) => profileDomain(item.serviceProfileId) === 'tender').length,
    bridges: tenantCases.filter((item) => profileDomain(item.serviceProfileId) === 'bridges').length,
  };

  const relationCounts = {
    mai: periodRelations.filter((relation) => relationMatchesDomain(relation, 'mai')).length,
    warranty: periodRelations.filter((relation) => relationMatchesDomain(relation, 'warranty')).length,
    tender: periodRelations.filter((relation) => relationMatchesDomain(relation, 'tender')).length,
    bridges: bridgeCount,
  };

  const recentRelations = [...filteredRelations]
    .sort((a, b) => Date.parse(relationDate(b)) - Date.parse(relationDate(a)))
    .slice(0, 12);

  const recentCases = [...tenantCases]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 10);

  return (
    <main className="min-h-screen bg-transparent px-5 py-16 text-[#d8d1c0] md:px-10">
      <div className="mx-auto max-w-[1500px]">
        <header data-sfi-field-anchor="client-continuity-context" className="border border-[#332c20] bg-[#090908d9] p-6 backdrop-blur-xl md:p-9">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#c8a951]">SFI CLIENTS · ENTERPRISE CONTINUITY</p>
              <h1 className="mt-4 font-serif text-5xl font-normal leading-[0.95] text-[#f2e8d2] md:text-6xl">{selectedTenant.name}</h1>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-[#999080]">
                Observación longitudinal tenant-scoped de licitación → proveedor → contrato → activo → MAI → SLA → garantía → retorno → desempeño → siguiente licitación.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 font-mono text-[9px] uppercase tracking-[0.13em]">
                <span className="border border-[#5b4b28] px-3 py-2 text-[#c8a951]">{selectedTenant.type}</span>
                <span className="border border-[#332c20] px-3 py-2 text-[#a69a83]">ROL: {selectedTenant.role}</span>
                <span className="border border-[#332c20] px-3 py-2 text-[#a69a83]">TENANT: {selectedTenant.key || shortId(selectedTenant.id)}</span>
                <span className="border border-[#332c20] px-3 py-2 text-[#a69a83]">READ MODEL · EVIDENCE AWARE</span>
              </div>
            </div>

            <form method="get" className="grid w-full gap-3 border border-[#332c20] bg-[#060605b8] p-4 sm:grid-cols-2 xl:w-[470px]">
              <label className="block">
                <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#877c68]">Cliente / tenant</span>
                <select name="tenant" defaultValue={selectedTenant.id} className="mt-2 w-full border border-[#403725] bg-[#0b0a08] px-3 py-3 text-xs text-[#d8d1c0] outline-none focus:border-[#c8a951]">
                  {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} · {tenant.type}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#877c68]">Periodo longitudinal</span>
                <select name="period" defaultValue={period} className="mt-2 w-full border border-[#403725] bg-[#0b0a08] px-3 py-3 text-xs text-[#d8d1c0] outline-none focus:border-[#c8a951]">
                  {PERIODS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                </select>
              </label>
              <input type="hidden" name="domain" value={domain} />
              <button type="submit" className="border border-[#c8a951] px-4 py-3 font-mono text-[9px] uppercase tracking-[0.16em] text-[#e4c377] hover:bg-[#1c1608] sm:col-span-2">Aplicar contexto</button>
            </form>
          </div>
        </header>

        <section aria-label="Filtros de dominio" className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {DOMAINS.map((item) => (
            <Link
              key={item.key}
              href={buildHref(selectedTenant.id, period, item.key)}
              className={`shrink-0 border px-4 py-2 font-mono text-[9px] uppercase tracking-[0.14em] no-underline ${domain === item.key ? 'border-[#c8a951] bg-[#171207] text-[#e4c377]' : 'border-[#332c20] text-[#8f8574] hover:border-[#6d5a31] hover:text-[#c8b990]'}`}
            >
              {item.short}
            </Link>
          ))}
        </section>

        <section data-sfi-field-anchor="continuity-state" className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Casos activos" value={activeCases} note={`${tenantCases.length} casos tenant-scoped en total.`} />
          <Metric label="Relaciones observables" value={filteredRelations.length} note={`Dentro de ${PERIODS.find((item) => item.key === period)?.label.toLowerCase()}.`} />
          <Metric label="Entidades conectadas" value={nodesInFilteredGraph} note="Nodos distintos en el corte actual." />
          <Metric label="Con evidencia" value={evidenceLinked} note="Relaciones con evidenceRefs explícitas." />
          <Metric label="Puentes de dominio" value={bridgeCount} note="Cruces MAI ↔ garantía ↔ licitación en el periodo." />
        </section>

        <section data-sfi-field-anchor="assurance-domains" className="mt-4 grid gap-4 lg:grid-cols-4">
          <DomainCard eyebrow="SERVICE OBSERVABILITY" title="MAI" cases={caseCounts.mai} relations={relationCounts.mai} description="Tickets, solicitudes, incidentes y SLA observados como registros; recurrencia sin convertir frecuencia en causa." active={domain === 'mai'} href={buildHref(selectedTenant.id, period, 'mai')} />
          <DomainCard eyebrow="CONTRACT & WARRANTY" title="Garantías" cases={caseCounts.warranty} relations={relationCounts.warranty} description="Contrato, obligación, activo, garantía, eventos y retornos con linaje de evidencia y determinabilidad separada." active={domain === 'warranty'} href={buildHref(selectedTenant.id, period, 'warranty')} />
          <DomainCard eyebrow="TENDER ASSURANCE" title="Licitaciones" cases={caseCounts.tender} relations={relationCounts.tender} description="Requerimientos, licitantes y evaluaciones sostenidos por fuente; ausencia de evidencia permanece UNDETERMINED." active={domain === 'tender'} href={buildHref(selectedTenant.id, period, 'tender')} />
          <DomainCard eyebrow="ENTERPRISE MEMORY" title="Continuidad" cases={caseCounts.bridges} relations={relationCounts.bridges} description="Puentes longitudinales entre los dominios sin heredar verdad, causalidad, ranking ni autoridad institucional." active={domain === 'bridges'} href={buildHref(selectedTenant.id, period, 'bridges')} />
        </section>

        <section id="graph" data-sfi-field-anchor="enterprise-relation-graph" className="mt-4 border border-[#332c20] bg-[#080807d9] backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-[#332c20] p-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#c8a951]">RELATIONAL GRAPH · TENANT SCOPED</p>
              <h2 className="mt-2 font-serif text-3xl font-normal text-[#f0e4c9]">Continuidad del objeto institucional</h2>
              <p className="mt-2 max-w-3xl text-xs leading-6 text-[#8e8575]">Se muestran como máximo las 42 relaciones más recientes del corte seleccionado para mantener legibilidad. La persistencia subyacente no se recorta.</p>
            </div>
            <div className="flex flex-wrap gap-2 font-mono text-[8px] uppercase tracking-[0.12em] text-[#817767]">
              <span className="border border-[#403725] px-2 py-1">RECORD · línea discontinua</span>
              <span className="border border-[#403725] px-2 py-1">INFERENCE · línea punteada</span>
              <span className="border border-[#5b4b28] px-2 py-1 text-[#bda76c]">EPISTEMIC · línea sólida</span>
            </div>
          </div>

          {graphWarning ? (
            <div className="m-5 border border-[#633f2b] bg-[#180d08] p-4 font-mono text-[10px] leading-6 text-[#c69a7b]">GRAPH READ WARNING · {graphWarning}</div>
          ) : null}

          {!graph.relations.length ? (
            <div className="p-12 text-center">
              <p className="font-serif text-3xl text-[#cfc2a6]">Sin relaciones para este corte.</p>
              <p className="mx-auto mt-3 max-w-2xl text-xs leading-6 text-[#827968]">La ausencia aquí no se interpreta como ausencia del fenómeno. Cambia periodo o dominio, o incorpora relaciones source-backed desde los flujos operativos existentes.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <svg viewBox={`0 0 1200 ${graph.height}`} className="min-w-[1120px]" style={{ width: '100%', height: graph.height }} role="img" aria-label="Grafo longitudinal de relaciones empresariales del cliente">
                <defs>
                  <marker id="sfi-client-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                    <path d="M0,0 L8,4 L0,8 z" fill="#6d5a31" />
                  </marker>
                </defs>

                {STAGES.map((stage, index) => (
                  <g key={stage}>
                    <line x1={85 + index * 205} y1="68" x2={85 + index * 205} y2={graph.height - 30} stroke="#211d16" strokeWidth="1" />
                    <text x={85 + index * 205} y="44" textAnchor="middle" fill="#8f8164" fontSize="10" fontFamily="monospace" letterSpacing="1.1">{stage}</text>
                  </g>
                ))}

                {graph.relations.map((relation) => {
                  const from = graph.nodes.get(entityKey(relation.from));
                  const to = graph.nodes.get(entityKey(relation.to));
                  if (!from || !to) return null;
                  const role = String(relation.epistemicRole).toUpperCase();
                  const dash = role === 'INFERENCE' ? '2 7' : role === 'RECORD' ? '8 6' : undefined;
                  const evidence = relation.evidenceRefs.length > 0;
                  return (
                    <line
                      key={relation.id}
                      x1={from.x + 65}
                      y1={from.y}
                      x2={to.x - 65}
                      y2={to.y}
                      stroke={evidence ? '#806c3b' : '#484033'}
                      strokeWidth={evidence ? 1.5 : 1}
                      strokeDasharray={dash}
                      markerEnd="url(#sfi-client-arrow)"
                      opacity="0.8"
                    />
                  );
                })}

                {Array.from(graph.nodes.values()).map((node) => (
                  <g key={node.key} transform={`translate(${node.x - 65} ${node.y - 23})`}>
                    <rect width="130" height="46" rx="2" fill="#0c0b09" stroke="#5b4b28" />
                    <text x="10" y="17" fill="#d0b66d" fontSize="9" fontFamily="monospace" letterSpacing="0.7">{node.entityType}</text>
                    <text x="10" y="33" fill="#8e8575" fontSize="9" fontFamily="monospace">{shortId(node.id)}</text>
                  </g>
                ))}
              </svg>
            </div>
          )}
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <article id="trace" data-sfi-field-anchor="longitudinal-trace" className="border border-[#332c20] bg-[#090908bd] p-5 backdrop-blur-lg md:p-6">
            <div className="flex items-end justify-between gap-4 border-b border-[#2d281f] pb-4">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#c8a951]">TEMPORAL TRACE</p>
                <h2 className="mt-2 font-serif text-3xl font-normal text-[#f0e4c9]">Eventos relacionales recientes</h2>
              </div>
              <span className="font-mono text-[9px] text-[#786f60]">{recentRelations.length} / {filteredRelations.length}</span>
            </div>
            <div className="divide-y divide-[#28231b]">
              {recentRelations.length ? recentRelations.map((relation) => (
                <div key={relation.id} className="grid gap-3 py-4 md:grid-cols-[150px_1fr_auto] md:items-start">
                  <time className="font-mono text-[9px] uppercase tracking-[0.08em] text-[#7f7564]">{formatDate(relationDate(relation), true)}</time>
                  <div>
                    <p className="text-sm text-[#d6ccb7]">{relationLabel(relation)}</p>
                    <p className="mt-1 font-mono text-[9px] uppercase leading-5 text-[#817868]">{relation.from.entityType}:{shortId(relation.from.id)} → {relation.to.entityType}:{shortId(relation.to.id)}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 md:justify-end">
                    <span className="border border-[#403725] px-2 py-1 font-mono text-[8px] uppercase text-[#9d9077]">{relation.epistemicRole}</span>
                    {relation.evidenceRefs.length ? <span className="border border-[#5b4b28] px-2 py-1 font-mono text-[8px] uppercase text-[#c0a968]">EVIDENCE {relation.evidenceRefs.length}</span> : null}
                  </div>
                </div>
              )) : <p className="py-8 text-sm text-[#817868]">No hay eventos relacionales visibles para el filtro actual.</p>}
            </div>
          </article>

          <article id="cases" data-sfi-field-anchor="client-cases" className="border border-[#332c20] bg-[#090908bd] p-5 backdrop-blur-lg md:p-6">
            <div className="border-b border-[#2d281f] pb-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#c8a951]">CASE PLATFORM</p>
              <h2 className="mt-2 font-serif text-3xl font-normal text-[#f0e4c9]">Casos del cliente</h2>
            </div>
            <div className="divide-y divide-[#28231b]">
              {recentCases.length ? recentCases.map((item) => (
                <div key={item.id} className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm leading-6 text-[#d6ccb7]">{item.subject}</p>
                    <span className="shrink-0 border border-[#403725] px-2 py-1 font-mono text-[8px] uppercase text-[#9d9077]">{item.status}</span>
                  </div>
                  <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.08em] text-[#827765]">{item.serviceProfileId.replaceAll('_', ' ')} · UPDATED {formatDate(item.updatedAt)}</p>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#756d60]">{item.scope}</p>
                </div>
              )) : <p className="py-8 text-sm text-[#817868]">Todavía no hay casos operativos en este tenant.</p>}
            </div>
          </article>
        </section>

        <section data-sfi-field-anchor="client-governance-boundary" className="mt-4 border border-[#5b4b28] bg-[#100d08d9] p-5 backdrop-blur-lg md:p-6">
          <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#c8a951]">EPISTEMIC + GOVERNANCE BOUNDARY</p>
              <h2 className="mt-2 font-serif text-3xl font-normal text-[#f0e4c9]">Una relación no es una causa.</h2>
            </div>
            <div className="grid gap-4 text-xs leading-6 text-[#908777] md:grid-cols-2">
              <p>Los vínculos mostrados pertenecen al grafo del tenant. Una relación declarada puede seguir siendo RECORD; una inferencia requiere evidencia y una conclusión contractual o causal requiere assessment explícito.</p>
              <p>Esta vista no promueve automáticamente información del cliente al grafo institucional de SFI, no publica datos crudos en OBSERVATORY y no calcula rankings automáticos de proveedores o licitantes.</p>
            </div>
          </div>
        </section>

        <footer className="mt-4 flex flex-col gap-3 border-t border-[#29241c] py-5 font-mono text-[8px] uppercase tracking-[0.12em] text-[#6f675a] md:flex-row md:items-center md:justify-between">
          <span>SFI ENTERPRISE ASSURANCE DOMAIN 1.0 · OPERATIONAL BACKEND</span>
          <span>CLIENT SURFACE · TENANT ISOLATED · {user.email ?? shortId(user.id)}</span>
        </footer>
      </div>
    </main>
  );
}
