import fs from 'node:fs';
import path from 'node:path';

const openapiPath = path.join(process.cwd(), 'public', 'openapi.json');
const api = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));

const studioPost = api.paths?.['/api/external/v1/studio']?.post;
if (!studioPost) throw new Error('SFI_STUDIO_OPENAPI_PATH_MISSING');

const studioRequest = api.components?.schemas?.StudioRequest;
if (!studioRequest?.properties?.operation?.enum) throw new Error('SFI_STUDIO_REQUEST_SCHEMA_MISSING');

if (!studioRequest.properties.operation.enum.includes('ingest_analyze')) studioRequest.properties.operation.enum.push('ingest_analyze');
studioRequest.properties.openaiFileIdRefs = {
  type: 'array', minItems: 1, maxItems: 1, items: { type: 'string' },
  description: 'For operation=ingest_analyze, attach exactly one conversation audio file. ChatGPT replaces this schema value at runtime with its file reference object.',
};
studioRequest.properties.analysisAuthorization = {
  type: 'object',
  description: 'Operator declaration that SFI may ingest and analyze this attachment. Declared analysis permission only; no rights transfer or canonical authority.',
  required: ['authorizedForAnalysis', 'basis'],
  properties: {
    authorizedForAnalysis: { type: 'boolean', const: true },
    basis: { type: 'string', enum: ['operator_owned', 'authorized_by_rightsholder', 'session_specific_permission'] },
    note: { type: 'string' },
  },
  additionalProperties: false,
};
studioRequest.properties.title = { type: 'string', maxLength: 240 };

studioPost.summary = 'List, inspect, read, ingest or analyze Studio objects owned by the OAuth principal';
studioPost.description = 'User-bound Studio route. ingest_analyze accepts one ChatGPT audio attachment, requires explicit analysis permission, deduplicates owner+file retries, persists only in private owner-scoped Studio storage, and runs the existing audio analyzer. Permission is not rights transfer or canonical promotion.';
studioPost['x-sfi-operation-scopes'] = { list: 'studio:read', inspect: 'studio:read', features: 'studio:read', content: 'studio:content', analyze: 'studio:run', ingest_analyze: 'studio:run' };
studioPost['x-sfi-authority-boundary'] = {
  ownerBound: true,
  rawAttachmentPersistence: 'PRIVATE_OWNER_SCOPED_STUDIO_ONLY',
  intakeIdempotency: 'owner_id + openaiFileId',
  analysisAuthorizationEpistemicClass: 'DECLARED',
  rightsTransfer: false,
  canonicalPromotionAllowed: false,
  externalPublicationAllowed: false,
};

api.info ||= {};
const [major = 1, minor = 8] = String(api.info.version || '1.8.0').split('.').map(Number);
if (major < 1 || (major === 1 && minor < 9)) api.info.version = '1.9.0';
api['x-sfi-governance'] ||= {};
api['x-sfi-governance'].chatgptStudioAttachmentIntake = {
  contract: 'SFI-CHATGPT-STUDIO-ATTACHMENT-1.1',
  operation: 'ingest_analyze',
  parameter: 'openaiFileIdRefs',
  count: 1,
  modality: 'audio',
  scope: 'studio:run',
  tenant: 'oauth.subjectId owner only',
  idempotency: 'public.studio_objects unique(owner_id, metadata.externalIntake.openaiFileId)',
  acceptedTemporaryHost: 'files.oaiusercontent.com',
  temporaryUrlPersisted: false,
  explicitAnalysisAuthorizationRequired: true,
  rightsTransfer: false,
  canonicalPromotionAllowed: false,
};

fs.writeFileSync(openapiPath, `${JSON.stringify(api, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, contract: 'SFI-CHATGPT-STUDIO-ATTACHMENT-1.1', path: '/api/external/v1/studio', operation: 'ingest_analyze', parameter: 'openaiFileIdRefs', scope: 'studio:run' }, null, 2));
