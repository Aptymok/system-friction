import 'server-only';

export type ProspectScoutCandidate = {
  name: string;
  sector: string;
  vector: string;
  role: string;
  signal: string;
  source: string;
  source_status: 'seed' | 'manual_source_required';
  offer: 'SFI-DR01' | 'SFI-AI01' | 'SFI-GOV01' | 'SFI-NA01' | 'SFI-CX01';
  rationale: string;
  next_step: string;
};

type Tuple = [string, string, string, string, ProspectScoutCandidate['offer']];

const CATALOG: Record<string, Tuple[]> = {
  TECH: [
    ['Kavak', 'automotive marketplace / operations', 'operations / strategy lead', 'operational coordination, financing, logistics and customer experience friction', 'SFI-DR01'],
    ['Konfio', 'fintech / credit / data', 'risk / data / operations lead', 'credit, data quality, decision velocity and operational scaling pressure', 'SFI-AI01'],
    ['Clara', 'fintech / spend management', 'operations / product strategy lead', 'growth, compliance, customer enablement and platform coordination pressure', 'SFI-AI01'],
    ['Clip', 'payments / SMB infrastructure', 'operations / customer experience lead', 'payment infrastructure, support load and small business adoption friction', 'SFI-CX01'],
  ],
  ECONOMY: [
    ['BBVA Mexico', 'banking / economy', 'strategy / transformation lead', 'macroeconomic pressure, digital transformation and customer friction', 'SFI-GOV01'],
    ['Mercado Libre Mexico', 'commerce / logistics / payments', 'operations / logistics lead', 'marketplace scale, logistics pressure and payment ecosystem coordination', 'SFI-DR01'],
    ['Nu Mexico', 'fintech / banking', 'operations / risk lead', 'rapid growth, risk, service pressure and financial inclusion friction', 'SFI-AI01'],
    ['Coppel', 'retail / credit / logistics', 'operations / customer experience lead', 'credit, retail logistics and service complexity across distributed operations', 'SFI-CX01'],
  ],
  CLIMATE: [
    ['Cemex', 'construction materials / climate transition', 'sustainability / operations lead', 'decarbonization, supply chain and regulatory transition friction', 'SFI-GOV01'],
    ['Grupo Bimbo', 'food / logistics / sustainability', 'sustainability / logistics lead', 'energy, logistics, packaging and climate adaptation pressure', 'SFI-GOV01'],
    ['FEMSA', 'retail / logistics / sustainability', 'operations / sustainability lead', 'distributed retail, cold chain, water, energy and route optimization friction', 'SFI-DR01'],
  ],
  INSTITUTIONAL: [
    ['INEGI', 'public statistics / institutional data', 'data governance / innovation lead', 'data governance, operational continuity and institutional coordination pressure', 'SFI-GOV01'],
    ['IMSS', 'public health / institutional operations', 'operations / transformation lead', 'service demand, queue pressure, data coordination and institutional friction', 'SFI-GOV01'],
    ['SAT', 'tax administration / digital government', 'service / digital transformation lead', 'digital service pressure, compliance and citizen experience friction', 'SFI-GOV01'],
  ],
  CULTURAL: [
    ['Ocesa', 'live entertainment / operations', 'operations / audience experience lead', 'audience flows, ticketing, venue pressure and cultural demand volatility', 'SFI-CX01'],
    ['Cinepolis', 'entertainment / customer experience', 'customer experience / digital lead', 'attendance shifts, digital channels and service consistency friction', 'SFI-CX01'],
    ['Spotify Mexico', 'media / cultural signals', 'editorial / market insights lead', 'memetic change, audience fragmentation and cultural signal interpretation', 'SFI-NA01'],
  ],
  GEO_DIGITAL: [
    ['Cloudflare', 'internet infrastructure / resilience', 'security / reliability lead', 'digital resilience, platform trust and traffic anomaly pressure', 'SFI-AI01'],
    ['KIO Networks', 'data centers / cloud', 'operations / infrastructure lead', 'cloud reliability, enterprise demand and infrastructure coordination friction', 'SFI-DR01'],
    ['Alestra', 'telecom / enterprise infrastructure', 'enterprise services / operations lead', 'connectivity, enterprise continuity and digital infrastructure pressure', 'SFI-DR01'],
  ],
};

function row(item: Tuple, vector: string): ProspectScoutCandidate {
  const [name, sector, role, signal, offer] = item;
  return {
    name,
    sector,
    vector,
    role,
    signal,
    source: 'seed_catalog',
    source_status: 'manual_source_required',
    offer,
    rationale: `${name} is a named candidate for the ${vector} vector. Treat as a prospect hypothesis until a public source is attached.`,
    next_step: 'Attach public source or manual evidence before IFNORM approval.',
  };
}

function normalizeVector(value: unknown) {
  const text = typeof value === 'string' ? value.toUpperCase().trim() : 'TECH';
  return text || 'TECH';
}

export function runProspectScout(input: { vector?: string; seeds?: string[]; limit?: number }) {
  const vector = normalizeVector(input.vector);
  const limit = Math.max(1, Math.min(12, Number(input.limit ?? 6)));
  const base = (CATALOG[vector] ?? CATALOG.TECH).map((item) => row(item, vector));
  const seeded = Array.isArray(input.seeds) ? input.seeds.filter(Boolean).slice(0, 8).map((name) => ({
    name,
    sector: vector.toLowerCase(),
    vector,
    role: 'decision owner / operations lead',
    signal: `${name} requires manual evidence before evaluation.`,
    source: 'manual_seed',
    source_status: 'manual_source_required' as const,
    offer: 'SFI-DR01' as const,
    rationale: 'Manual seed supplied by ROOT operator.',
    next_step: 'Attach source, public signal or observed friction.',
  })) : [];

  return {
    ok: true,
    generated_at: new Date().toISOString(),
    mode: 'manual_prospect_scout',
    vector,
    candidates: [...seeded, ...base].slice(0, limit),
    warnings: ['names_are_candidates_not_verified_evidence', 'human_review_required'],
  };
}
