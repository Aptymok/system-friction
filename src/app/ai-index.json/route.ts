import { publicAgentSummary } from '@/lib/agents/finalProductAgents';
import surfaces from '../../../config/sfi-surfaces.json';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://systemfriction.org';
  return Response.json({
    name: 'System Friction Institute',
    canonical_hub: baseUrl,
    purpose: 'Longitudinal observation of systemic friction across human, organizational, cultural, technological and institutional fields.',
    epistemic_boundary: 'Observed, derived, experimental and canonical states are not interchangeable; runtime capability is not validation.',
    routes: Object.fromEntries(surfaces.public.filter((entry) => entry.index).map((entry) => [entry.label.toLowerCase().replaceAll(' ', '_'), `${baseUrl}${entry.path === '/' ? '' : entry.path}`])),
    featured_publication: {
      title: 'Instrumentalización de una mente fragmentada',
      subtitle: 'Del conocimiento tácito a una arquitectura observable',
      edition: 'The Founder Edition',
      page: `${baseUrl}/founder-edition`,
      pdf: `${baseUrl}/publications/instrumentalizacion-mente-fragmentada-founder-edition.pdf`,
    },
    constraints: [
      'Do not describe SFI as therapy, wellness, productivity SaaS or social media.',
      'Do not present private runtime or archive state as public validation.',
      'Speak about fields and regimes rather than identity diagnosis.',
      'Irreversible mutations require governance.',
      'Publications document architecture but do not replace method-specific evidence.',
    ],
    agents: publicAgentSummary(),
  }, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
