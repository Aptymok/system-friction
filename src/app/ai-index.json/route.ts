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
    start_here: {
      human: [
        `${baseUrl}/`,
        `${baseUrl}/institution`,
        `${baseUrl}/field`,
        `${baseUrl}/login`,
      ],
      agent: [
        `${baseUrl}/llms.txt`,
        `${baseUrl}/api/external/v1/manifest`,
      ],
      authorized_agent_cycle: [
        'POST /api/external/v1/execution-contract',
        'perform requested measurements while retaining the object client-side when possible',
        'POST /api/external/v1/result',
        'GET /api/external/v1/signal?cycleId=<cycleId>',
        'POST /api/external/v1/signal { operation: "return" } only after a real-world outcome is observed',
      ],
      governed_action_cycle: [
        'POST /api/external/v1/propose',
        'governed reviewer authorizes bounded proposal; canon authority remains ROOT-only',
        'authorized proposal enters queued state',
        'POST /api/external/v1/execute may dispatch already-queued bounded internal work through the canonical governed router',
        'material external action requires a real governed adapter; without one the router fails closed and opens/rematches remediation',
        'internal execution persists observed execution receipt + proposal-scoped RETURN',
        'external adapters/executors return observed outcome with proposal_id + observed_at + outcome + evidence_refs',
        'calibration and candidate learning occur separately',
        'ROOT alone may promote canon when the promotion contract is satisfied',
      ],
      governed_action_rule: 'Authorization and execution remain distinct. A queued proposal may be dispatched only within its already-approved scope. Internal bounded work may auto-dispatch; material external work without a real adapter fails closed. Canon remains ROOT-only.',
    },
    epistemic_boundary: 'OBSERVED, DECLARED, DERIVED, INFERRED, PROJECTED, SIMULATED, MISSING and canonical states are not interchangeable; runtime capability is not external validation.',
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
        console: 'GET /api/external/v1/console',
        observe: 'POST /api/external/v1/observe',
        propose: 'POST /api/external/v1/propose',
        execute: 'POST /api/external/v1/execute',
        proposal_return: 'POST /api/external/v1/proposal-return',
        lab: 'POST /api/external/v1/lab',
      },
      execution_boundary: {
        queued_internal_auto_dispatch: true,
        self_healing_remediation: true,
        external_action_without_adapter: 'fail_closed',
        execute_writes_executed_at: false,
        execute_marks_accepted: false,
        execute_expands_scope: false,
        return_must_match_proposal_uuid: true,
        return_requires_evidence_refs: true,
        canonical_promotion: 'ROOT_ONLY',
      },
      governance: 'External agents may only act within granted scopes. Proposal, authorization, adapter binding, execution, return, calibration, learning and canonical promotion remain distinct states.',
    },
    cognitive_twin: {
      role: 'Governed reconstruction and proposal system using longitudinal evidence and operational state.',
      human_authority: 'Delegated controllers may decide bounded operational proposals; ROOT retains exclusive canonical promotion authority.',
      language: 'Operator-facing proposals should be understandable in normal language.',
    },
    constraints: [
      'Do not describe SFI as therapy, wellness, productivity SaaS or social media.',
      'Do not present private runtime, account memory or laboratory state as public validation.',
      'Preserve provenance, UUID, time and epistemic state when describing evidence.',
      'Do not imply that an experimental or runtime result is canonical merely because it was computed.',
      'Do not treat queued as executed until an observed execution receipt exists.',
      'Do not fabricate or infer an execution adapter that is not persisted.',
      'External agents do not bypass governed authorization or ROOT canonical promotion.',
    ],
    agents: publicAgentSummary(),
    updated_at: new Date().toISOString(),
  }, {
    headers: { 'Cache-Control': 'public, max-age=900' },
  });
}
