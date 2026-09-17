export const GITHUB_OIDC_ISSUER = 'https://token.actions.githubusercontent.com';
export const SFI_CONTINUITY_OIDC_AUDIENCE = 'sfi-continuity';
export const SFI_SELF_DEVELOPMENT_OIDC_AUDIENCE = 'sfi-self-development';
export const SFI_CONTINUITY_REPOSITORY = 'Aptymok/system-friction';
export const SFI_CONTINUITY_REPOSITORY_ID = '1163662905';
export const SFI_CONTINUITY_REF = 'refs/heads/main';
export const SFI_CONTINUITY_WORKFLOW_REF = 'Aptymok/system-friction/.github/workflows/sfi-continuity-hourly.yml@refs/heads/main';
export const SFI_SELF_DEVELOPMENT_WORKFLOW_REF = 'Aptymok/system-friction/.github/workflows/sfi-self-development.yml@refs/heads/main';

const CLOCK_SKEW_SECONDS = 30;
const MAX_TOKEN_AGE_SECONDS = 15 * 60;

export type GitHubActionsOidcPurpose = 'continuity' | 'self-development';

export type GitHubActionsOidcClaims = {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  repository?: string;
  repository_id?: string;
  ref?: string;
  workflow_ref?: string;
  event_name?: string;
};

function audienceIncludes(aud: GitHubActionsOidcClaims['aud'], expected: string) {
  return typeof aud === 'string' ? aud === expected : Array.isArray(aud) && aud.includes(expected);
}

function policyFor(purpose: GitHubActionsOidcPurpose) {
  if (purpose === 'self-development') {
    return {
      audience: SFI_SELF_DEVELOPMENT_OIDC_AUDIENCE,
      workflowRef: SFI_SELF_DEVELOPMENT_WORKFLOW_REF,
      allowedEvents: new Set(['schedule', 'workflow_dispatch', 'push']),
    };
  }
  return {
    audience: SFI_CONTINUITY_OIDC_AUDIENCE,
    workflowRef: SFI_CONTINUITY_WORKFLOW_REF,
    allowedEvents: new Set(['schedule', 'workflow_dispatch', 'workflow_run']),
  };
}

export function validateGitHubActionsOidcClaims(
  claims: GitHubActionsOidcClaims,
  nowSeconds = Math.floor(Date.now() / 1000),
  purpose: GitHubActionsOidcPurpose = 'continuity',
) {
  const policy = policyFor(purpose);
  if (claims.iss !== GITHUB_OIDC_ISSUER) return { ok: false as const, reason: 'OIDC_ISSUER_MISMATCH' };
  if (!audienceIncludes(claims.aud, policy.audience)) return { ok: false as const, reason: 'OIDC_AUDIENCE_MISMATCH' };
  if (claims.repository !== SFI_CONTINUITY_REPOSITORY) return { ok: false as const, reason: 'OIDC_REPOSITORY_MISMATCH' };
  if (String(claims.repository_id ?? '') !== SFI_CONTINUITY_REPOSITORY_ID) return { ok: false as const, reason: 'OIDC_REPOSITORY_ID_MISMATCH' };
  if (claims.ref !== SFI_CONTINUITY_REF) return { ok: false as const, reason: 'OIDC_REF_MISMATCH' };
  if (claims.workflow_ref !== policy.workflowRef) return { ok: false as const, reason: 'OIDC_WORKFLOW_REF_MISMATCH' };
  if (!policy.allowedEvents.has(String(claims.event_name ?? ''))) {
    return { ok: false as const, reason: 'OIDC_EVENT_NOT_ALLOWED' };
  }
  if (typeof claims.exp !== 'number' || claims.exp < nowSeconds - CLOCK_SKEW_SECONDS) {
    return { ok: false as const, reason: 'OIDC_TOKEN_EXPIRED' };
  }
  if (typeof claims.nbf === 'number' && claims.nbf > nowSeconds + CLOCK_SKEW_SECONDS) {
    return { ok: false as const, reason: 'OIDC_TOKEN_NOT_YET_VALID' };
  }
  if (typeof claims.iat !== 'number' || claims.iat < nowSeconds - MAX_TOKEN_AGE_SECONDS || claims.iat > nowSeconds + CLOCK_SKEW_SECONDS) {
    return { ok: false as const, reason: 'OIDC_TOKEN_AGE_INVALID' };
  }
  return { ok: true as const, reason: 'GITHUB_ACTIONS_OIDC', purpose };
}
