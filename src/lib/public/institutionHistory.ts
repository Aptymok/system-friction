export type SfiInstitutionMilestone = {
  id: string;
  occurredAt: string;
  title: string;
  summary: string;
  epistemicClass: 'OBSERVED';
  sourceType: 'github_repository' | 'github_pr' | 'github_commit' | 'live_site';
  sourceUrl: string;
  sourceLabel: string;
};

export const SFI_INSTITUTION_HISTORY: SfiInstitutionMilestone[] = [
  {
    id: 'SFI-HIST-20260222-REPOSITORY',
    occurredAt: '2026-02-22T00:26:38Z',
    title: 'Repositorio público system-friction creado',
    summary: 'Primer origen técnico verificable del repositorio público actual. Este hito documenta el inicio observable del archivo de código; no se presenta como prueba de la fecha de origen conceptual del instituto.',
    epistemicClass: 'OBSERVED',
    sourceType: 'github_repository',
    sourceUrl: 'https://github.com/Aptymok/system-friction',
    sourceLabel: 'GitHub repository metadata',
  },
  {
    id: 'SFI-HIST-20260816-EMERGENCE',
    occurredAt: '2026-08-16T16:42:45Z',
    title: 'Programa público de emergencia gobernada',
    summary: 'SFI materializó una capa pública de observación de su propia emergencia, con separación explícita entre publicación, atención, engagement, evidencia y causalidad.',
    epistemicClass: 'OBSERVED',
    sourceType: 'github_pr',
    sourceUrl: 'https://github.com/Aptymok/system-friction/pull/251',
    sourceLabel: 'PR #251',
  },
  {
    id: 'SFI-HIST-20260816-SYSTEM-AI',
    occurredAt: '2026-08-16T14:47:03Z',
    title: 'Dominio System / AI Assurance V1',
    summary: 'Se consolidó un dominio tenant-scoped para observabilidad de sistemas, diagnóstico de implementación de IA, integración/adopción y assurance de gobernanza sobre la Case Platform existente.',
    epistemicClass: 'OBSERVED',
    sourceType: 'github_pr',
    sourceUrl: 'https://github.com/Aptymok/system-friction/pull/245',
    sourceLabel: 'PR #245',
  },
  {
    id: 'SFI-HIST-20260816-LIVING-MEMBRANE',
    occurredAt: '2026-08-16T15:30:25Z',
    title: 'Membrana institucional navegable',
    summary: 'La entrada institucional se reorganizó como una superficie continua de observación, interacción y acceso, preservando límites entre presentación, evidencia, simulación, gobernanza y autoridad.',
    epistemicClass: 'OBSERVED',
    sourceType: 'github_pr',
    sourceUrl: 'https://github.com/Aptymok/system-friction/pull/248',
    sourceLabel: 'PR #248',
  },
  {
    id: 'SFI-HIST-20260821-CONVERGENCE',
    occurredAt: '2026-08-21T10:26:00Z',
    title: 'Convergencia sobre observación, evidencia y retorno',
    summary: 'Se removieron rutas heurísticas y estado sintético restante, exigiendo casos y evidencia reales, trazabilidad de ejecución y retorno persistido sin crear una arquitectura paralela.',
    epistemicClass: 'OBSERVED',
    sourceType: 'github_pr',
    sourceUrl: 'https://github.com/Aptymok/system-friction/pull/260',
    sourceLabel: 'PR #260',
  },
  {
    id: 'SFI-HIST-20260821-FRONTEND',
    occurredAt: '2026-08-21T23:34:16Z',
    title: 'Reemplazo total del frontend y gateway externo de agentes',
    summary: 'El frontend legado fue sustituido por escenas vivas, manteniendo el backend existente. Se incorporaron manifest, observe, propose, execute y Method Lab para clientes de IA gobernados.',
    epistemicClass: 'OBSERVED',
    sourceType: 'github_pr',
    sourceUrl: 'https://github.com/Aptymok/system-friction/pull/262',
    sourceLabel: 'PR #262',
  },
  {
    id: 'SFI-HIST-20260822-METHODLAB-FIX',
    occurredAt: '2026-08-22T07:53:54Z',
    title: 'Corrección de lectura persistente de Method Lab',
    summary: 'Se corrigió la ambigüedad de lectura de sfi_lab_analyses que producía el error WITHIN GROUP sobre la columna mode.',
    epistemicClass: 'OBSERVED',
    sourceType: 'github_commit',
    sourceUrl: 'https://github.com/Aptymok/system-friction/commit/44ec16a53e9b7034a30e0a78886d1b44c3031486',
    sourceLabel: 'commit 44ec16a5',
  },
  {
    id: 'SFI-HIST-20260822-AI-CONSOLE',
    occurredAt: '2026-08-22T08:10:23Z',
    title: 'Consola consolidada para agentes de IA',
    summary: 'La API externa incorporó una lectura consolidada de Method Lab, reportes, Cognitive Twin, propuestas, evidencia, runs y capacidades agénticas para clientes autorizados.',
    epistemicClass: 'OBSERVED',
    sourceType: 'github_commit',
    sourceUrl: 'https://github.com/Aptymok/system-friction/commit/79665191fb7b99bcc775c25b0e836497ff8203fc',
    sourceLabel: 'commit 79665191',
  },
  {
    id: 'SFI-HIST-20260822-LIVE',
    occurredAt: '2026-08-22T19:06:25Z',
    title: 'Estado técnico observable actual',
    summary: 'El repositorio público permanece activo sobre main y la superficie pública canónica se presenta como LIVE OBSERVATION SURFACE en systemfriction.org.',
    epistemicClass: 'OBSERVED',
    sourceType: 'live_site',
    sourceUrl: 'https://systemfriction.org',
    sourceLabel: 'systemfriction.org + GitHub repository metadata',
  },
];

export const SFI_HISTORY_BOUNDARY =
  'Esta cronología contiene únicamente hitos verificables por fuentes públicas del propio SFI/GitHub. No rellena periodos no documentados ni convierte una fecha de código en una afirmación sobre el origen conceptual del instituto.';
