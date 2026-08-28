export function normalizeGovernedActionType(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

const MATERIAL_EXTERNAL_ACTION_TYPES = new Set([
  'publish',
  'publish_content',
  'upload',
  'upload_asset',
  'distribute',
  'distribute_content',
  'send_email',
  'send_message',
  'contact_prospect',
  'make_payment',
  'payment',
  'purchase',
  'github_mutation',
  'github_write',
  'merge_pull_request',
  'vercel_deploy',
  'deploy',
  'dns_change',
  'oauth_change',
  'webhook',
  'external_mutation',
  'build_execution_adapter',
  'post_social',
  'youtube_publish',
  'instagram_publish',
  'tiktok_publish',
]);

const GENERIC_ACTION_TYPES = new Set(['', 'action', 'task', 'execute', 'external_action']);
const MATERIAL_EXTERNAL_TEXT = /\bpublish(?:ed|es|ing)?\b|\bupload(?:ed|s|ing)?\b|\bdistribut(?:e|es|ed|ing|ion)\b|\bsend\s+(?:an?\s+)?email\b|\bsend\s+(?:a\s+)?message\b|\bcontact\s+(?:a\s+)?prospect\b|\bmake\s+(?:a\s+)?payment\b|\bpurchase\b|\bwrite\s+to\s+github\b|\bmerge\s+(?:a\s+)?pull\s+request\b|\bdeploy(?:ed|s|ing|ment)?\b|\bchange\s+dns\b|\bchange\s+oauth\b|\btrigger\s+(?:a\s+)?webhook\b|\bexternal\s+mutation\b/i;

export function isMaterialExternalAction(actionType: string | null | undefined, descriptiveText: string) {
  const normalized = normalizeGovernedActionType(actionType);
  if (MATERIAL_EXTERNAL_ACTION_TYPES.has(normalized)) return true;
  if (!GENERIC_ACTION_TYPES.has(normalized)) return false;
  return MATERIAL_EXTERNAL_TEXT.test(descriptiveText);
}
