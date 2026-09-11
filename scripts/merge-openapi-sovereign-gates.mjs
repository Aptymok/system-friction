import fs from 'node:fs';
import path from 'node:path';

const openapiPath = path.join(process.cwd(), 'public', 'openapi.json');
const api = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));
api.components ||= {};
api.components.schemas ||= {};
api.paths ||= {};

function stripDuplicateConfirm(schema) {
  if (!schema || typeof schema !== 'object') return schema;
  const copy = structuredClone(schema);
  if (Array.isArray(copy.required)) copy.required = copy.required.filter((name) => name !== 'confirm');
  if (copy.properties && typeof copy.properties === 'object') delete copy.properties.confirm;
  return copy;
}

if (api.components.schemas.ExecuteRequest) {
  api.components.schemas.ExecuteRequest = stripDuplicateConfirm(api.components.schemas.ExecuteRequest);
}

const executePost = api.paths['/api/external/v1/execute']?.post;
if (executePost) {
  executePost.summary = 'Dispatch an already-authorized SFI proposal';
  executePost.description = 'Dispatch an already-authorized queued proposal. Existing queue authorization plus execute scope is sufficient; no duplicate human confirmation is required. Canonical promotion and authority expansion remain separate.';
  executePost['x-sfi-human-approval'] = 'NOT_REQUIRED_DUPLICATE_AUTHORIZATION';
  executePost['x-sfi-sovereign-boundary'] = 'PRIOR_GOVERNED_QUEUE_AUTHORIZATION_REQUIRED';
}

const labPost = api.paths['/api/external/v1/lab']?.post;
if (labPost) {
  const media = labPost.requestBody?.content?.['application/json'];
  const schema = media?.schema;
  if (schema?.$ref && typeof schema.$ref === 'string' && schema.$ref.startsWith('#/components/schemas/')) {
    const sourceName = schema.$ref.split('/').pop();
    const source = api.components.schemas[sourceName];
    if (source) {
      const cloneName = 'InstitutionalLabOperationRequest';
      api.components.schemas[cloneName] = stripDuplicateConfirm(source);
      media.schema = { $ref: `#/components/schemas/${cloneName}` };
    }
  } else if (schema) {
    media.schema = stripDuplicateConfirm(schema);
  }
  labPost.summary = 'Read, persist or run institutional Method Lab operations according to granted scope';
  labPost.description = 'Institutional Method Lab route. A granted lab:run scope authorizes bounded internal execution; routine internal experiments do not require a second human confirmation. Personal OAuth tenants remain route-isolated.';
  labPost['x-sfi-human-approval'] = 'NOT_REQUIRED_FOR_ROUTINE_INTERNAL_RUN';
  labPost['x-sfi-canonical-promotion'] = false;
}

const evidencePost = api.paths['/api/external/v1/evidence-candidates']?.post;
if (evidencePost) {
  evidencePost.summary = 'Register a traceable working source for SFI case analysis';
  evidencePost.description = 'Register a traceable working source. SFI may classify and use it for ordinary case analysis without ROOT source approval. Use does not verify every source claim, authorize external execution, or promote institutional canon.';
  evidencePost['x-sfi-human-approval'] = 'NOT_REQUIRED_FOR_WORKING_SOURCE_USE';
  evidencePost['x-sfi-operational-use'] = true;
  evidencePost['x-sfi-canonical-promotion'] = false;
}

api['x-sfi-governance'] ||= {};
api['x-sfi-governance'].caseExecution = {
  contract: 'SFI-CASE-EXECUTION-POLICY-1.0',
  defaultMode: 'AUTONOMOUS_UNTIL_SOVEREIGN_BOUNDARY',
  routineHumanApprovalRequired: false,
  evidenceSourceApprovalRequired: false,
  reportApprovalRequired: false,
  caseClosureApprovalRequired: false,
  sovereignHumanDecisions: [
    'INSTITUTIONAL_CHANGE',
    'CAPABILITY_IMPLEMENTATION',
    'LEARNING_PROMOTION',
    'RESERVED_EXTERNAL_OPERATION',
  ],
  missingInputIsApproval: false,
  canonicalPromotionAutomatic: false,
};
api['x-sfi-governance'].humanInteraction = {
  contract: 'SFI-HUMAN-INTERACTION-POLICY-1.1',
  assumeProgrammingLiteracy: false,
  assumeDatabaseLiteracy: false,
  machineIdentifiersArePrimaryExplanation: false,
  plainLanguageFirst: true,
};

fs.writeFileSync(openapiPath, `${JSON.stringify(api, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-SOVEREIGN-ONLY-HUMAN-GATES-1.0',
  duplicateExecutionConfirmationRemoved: true,
  duplicateLabConfirmationRemoved: true,
  evidenceSourceApprovalRequired: false,
  canonicalPromotionAutomatic: false,
}, null, 2));
