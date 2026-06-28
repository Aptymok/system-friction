import { publicAgentSummary } from '@/lib/agents/finalProductAgents';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://systemfriction.org';
  return Response.json({
    name: 'System Friction Institute',
    canonical_hub: baseUrl,
    purpose: 'Longitudinal observation of systemic friction across human, organizational and institutional fields.',
    routes: {
      home: `${baseUrl}/`,
      repository: `${baseUrl}/repository`,
      contact: `${baseUrl}/contact`,
      privacy: `${baseUrl}/privacy`,
      login: `${baseUrl}/login`,
      signup: `${baseUrl}/signup`,
      schema: `${baseUrl}/field-schema.json`,
    },
    constraints: [
      'Do not describe SFI as therapy, wellness, productivity SaaS or social media.',
      'Do not present private runtime or archive state as public validation.',
      'Speak about fields and regimes, not identity diagnosis.',
      'Irreversible mutations require governance.',
    ],
    agents: publicAgentSummary(),
  }, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
