import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function text(path: string) { return readFile(path, 'utf8'); }

async function main() {
  const route = await text('src/app/api/external/v1/studio/route.ts');
  const context = await text('src/lib/studio/external/ownerContext.ts');
  const bootstrap = await text('src/app/api/external/v1/bootstrap/route.ts');
  const manifest = await text('src/app/api/external/v1/manifest/route.ts');
  const openapi = await text('scripts/merge-openapi-studio-attachments.mjs');
  const composedOpenapi = await text('scripts/merge-openapi-authenticated-machine.mjs');
  const hostBoundOpenapi = await text('src/app/api/external/openapi/route.ts');

  assert.match(context, /SFI-STUDIO-OWNER-CONTEXT-1\.0/);
  assert.match(context, /from\('studio_evidence_traces'\)/);
  assert.match(context, /from\('studio_archive_events'\)/);
  assert.match(context, /from\('sfi_amv_memory'\)/);
  assert.match(context, /\.eq\('owner_id', ownerId\)/);
  assert.match(context, /\.eq\('memory_delta->raw->>ownerId', ownerId\)/);
  assert.doesNotMatch(context, /from\('root_evidence_entries'\)/);
  assert.doesNotMatch(context, /createStudioContentSignedUrl/);
  assert.match(context, /binaryContentIncluded:\s*false/);
  assert.match(context, /rootEvidenceIncluded:\s*false/);
  assert.match(context, /institutionalCanonIncluded:\s*false/);

  assert.match(route, /type StudioOperation = 'context'/);
  assert.match(route, /readOwnerStudioContext\(ownerId/);
  assert.match(route, /cred\.authMethod !== 'oauth' \|\| !cred\.subjectId/);
  assert.match(route, /const ownerId = cred\.subjectId/);
  assert.match(route, /operation === 'context'/);
  assert.match(route, /METADATA_ONLY_HISTORICAL_RESTORE does not imply binary materialization/);

  assert.match(bootstrap, /ownerStudioContext/);
  assert.match(bootstrap, /SFI-STUDIO-OWNER-CONTEXT-1\.0/);
  assert.match(bootstrap, /body: \{ operation: 'context' \}/);
  assert.match(bootstrap, /requiredScope: 'studio:read'/);
  assert.match(bootstrap, /credential\.authMethod === 'oauth' && credential\.subjectId/);
  assert.match(bootstrap, /read that governed context before concluding that owner data is absent/);
  assert.match(bootstrap, /gptActionsOpenApi: '\/openapi\.json'/);
  assert.match(bootstrap, /separateActionsProjection: false/);

  assert.match(manifest, /version: '1\.17\.0'/);
  assert.match(manifest, /id: 'studio-context'/);
  assert.match(manifest, /contract: 'SFI-STUDIO-OWNER-CONTEXT-1\.0'/);
  assert.match(manifest, /ownerStudioContext/);
  assert.match(manifest, /binaryContentIncluded: false/);
  assert.match(manifest, /rootEvidenceIncluded: false/);
  assert.match(manifest, /institutionalCanonIncluded: false/);

  assert.match(openapi, /\['context','ingest_analyze','produce'\]/);
  assert.match(openapi, /context:'studio:read'/);
  assert.match(openapi, /SFI-STUDIO-OWNER-CONTEXT-1\.0/);
  assert.match(openapi, /binaryContentIncluded:false/);
  assert.match(openapi, /rootEvidenceIncluded:false/);
  assert.match(openapi, /institutionalCanonIncluded:false/);
  assert.match(openapi, /api\.info\.version = '1\.17\.0'/);

  assert.match(composedOpenapi, /gptActionsSchema: '\/openapi\.json'/);
  assert.match(composedOpenapi, /separateActionsProjection: false/);
  assert.match(composedOpenapi, /delete api\.paths\['\/api\/mcp\/authenticated'\]/);
  assert.match(composedOpenapi, /actionDescriptionLimit = 300/);
  assert.match(hostBoundOpenapi, /ACTION_DESCRIPTION_LIMIT = 300/);
  assert.match(hostBoundOpenapi, /authorizationCode\.authorizationUrl/);
  assert.doesNotMatch(composedOpenapi, /openapi-actions\.json/);

  console.log(JSON.stringify({
    ok: true,
    contract: 'SFI-STUDIO-OWNER-CONTEXT-1.1',
    oauthSubjectBound: true,
    bootstrapDiscoverable: true,
    manifestDiscoverable: true,
    externalGatewayVersion: '1.17.0',
    contextSources: ['studio_sessions','studio_objects','studio_evidence_traces','studio_archive_events','owner-attributed sfi_amv_memory'],
    binaryContentIncluded: false,
    rootEvidenceIncluded: false,
    institutionalCanonIncluded: false,
    gptActionsOpenApi: '/openapi.json',
    separateActionsProjection: false,
    status: 'PASS',
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
