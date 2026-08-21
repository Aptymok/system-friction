import { publicAgentSummary } from '@/lib/agents/finalProductAgents';
import { SCENE_KEYS, SCENES } from '@/components/sfi/scenes';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://systemfriction.org';
  return Response.json({
    name: 'System Friction Institute',
    canonical_hub: baseUrl,
    architecture: 'SFI Live Scene Runtime v2',
    purpose: 'Longitudinal observation, evidence handling, falsification, governance and governed action across complex sociotechnical systems.',
    interface_model: 'Live observable scenes. Data is rendered on or around the observed object instead of being reduced to dashboard cards.',
    epistemic_boundary: 'Observed, derived, inferred, experimental and canonical states are not interchangeable; runtime capability is not external validation.',
    public_scenes: Object.fromEntries(SCENE_KEYS.map((key) => [key, {
      url: `${baseUrl}/${key}`,
      title: SCENES[key].title,
      description: SCENES[key].subtitle,
      markers: SCENES[key].markers,
    }])),
    machine_interfaces: {
      llms: `${baseUrl}/llms.txt`,
      llms_full: `${baseUrl}/llms-full.txt`,
      ai_policy: `${baseUrl}/ai-policy`,
      field_schema: `${baseUrl}/field-schema.json`,
      external_agent_manifest: `${baseUrl}/api/external/v1/manifest`,
      sitemap: `${baseUrl}/sitemap.xml`,
      robots: `${baseUrl}/robots.txt`,
    },
    governed_external_agent_api: {
      authentication: 'Bearer credential managed by SFI with scoped capabilities.',
      operations: {
        observe: 'POST /api/external/v1/observe',
        propose: 'POST /api/external/v1/propose',
        execute: 'POST /api/external/v1/execute',
        lab: 'POST /api/external/v1/lab',
      },
      governance: 'External agents may only act within granted scopes. Proposal, authorization, execution and canonical promotion remain distinct states.',
    },
    cognitive_twin: {
      role: 'Governed reconstruction and proposal system using longitudinal evidence and operational state.',
      human_authority: 'ROOT retains governed acceptance/rejection authority.',
      language: 'Operator-facing proposals should be understandable in normal language.',
    },
    constraints: [
      'Do not describe SFI as therapy, wellness, productivity SaaS or social media.',
      'Do not present private runtime, account memory or laboratory state as public validation.',
      'Preserve provenance, time and epistemic state when describing evidence.',
      'Do not imply that an experimental or runtime result is canonical merely because it was computed.',
      'External agents do not bypass ROOT governance.',
    ],
    agents: publicAgentSummary(),
    updated_at: new Date().toISOString(),
  }, {
    headers: { 'Cache-Control': 'public, max-age=900' },
  });
}
