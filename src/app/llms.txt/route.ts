import { SCENE_KEYS, SCENES } from '@/components/sfi/scenes';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://systemfriction.org';
  const today = new Date().toISOString().split('T')[0];
  const scenes = SCENE_KEYS.map((key) => `${baseUrl}/${key} — ${SCENES[key].title}`).join('\n');
  const content = `
# SYSTEM FRICTION INSTITUTE

SFI is a live observability and governance environment for complex sociotechnical systems. Its public interface is organized as live scenes rather than dashboards.

## PUBLIC LIVE SCENES
${scenes}

## MACHINE-READABLE ENTRY POINTS
${baseUrl}/llms-full.txt
${baseUrl}/ai-index.json
${baseUrl}/ai-policy
${baseUrl}/field-schema.json
${baseUrl}/api/external/v1/manifest

## EXTERNAL AGENTS
Authorized AI clients can interact through the governed v1 gateway. The public manifest describes available operations. Authentication, scopes and execution authority are controlled by SFI governance.

## COGNITIVE TWIN
The Cognitive Twin proposes and reconstructs; ROOT decides governed acceptance or rejection. Experimental output is not automatically canonical.

## EPISTEMIC BOUNDARY
Observed, derived, inferred, experimental and canonical states are distinct. Preserve provenance, time and evidence lineage. Runtime capability is not external validation.

## LAST UPDATE
${today}
`.trim();

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=900',
    },
  });
}
