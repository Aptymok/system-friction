# WS-03 Discovery Emitter · Handoff

BASE SHA: `ade34a5e06ad86384a4974c535d802321ee5fa65`
BRANCH: `ws03/discovery-emitter-final`
OWNER: SFI-03 · Discovery Mesh
ASSURANCE: SFI-08
INTEGRATION: SFI-00

CANONICAL OWNER: existing `src/lib/discovery/canonicalObjectRegistry.ts`
EXTERNAL REPRESENTATION OWNER: existing `public.sfi_external_representations`
PUBLIC MCP OWNER: existing WS-04 `src/lib/mcp/publicMcpServer.ts`

DELTA:
- one Discovery Emitter projection;
- RSS / Atom / JSON Feed routes;
- sitemap canonical-object synchronization through emitter;
- AI index discovery machine-resource synchronization;
- ROOT-only idempotent READY receipt writer;
- IndexNow explicit NOT_CONFIGURED/fail-closed state;
- exact-head emitter tests and QA workflow.

NO production deploy is part of this branch. `MERGED != DEPLOYED != OBSERVED_IN_PRODUCTION` remains binding.
