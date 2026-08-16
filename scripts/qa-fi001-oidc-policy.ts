import assert from 'node:assert/strict';
import {
  GITHUB_OIDC_ISSUER,
  SFI_CONTINUITY_OIDC_AUDIENCE,
  SFI_CONTINUITY_REF,
  SFI_CONTINUITY_REPOSITORY,
  SFI_CONTINUITY_REPOSITORY_ID,
  SFI_CONTINUITY_WORKFLOW_REF,
  validateGitHubActionsOidcClaims,
} from '../src/lib/continuity/githubActionsOidcPolicy';

const now = 1_800_000_000;
const valid = {
  iss: GITHUB_OIDC_ISSUER,
  aud: SFI_CONTINUITY_OIDC_AUDIENCE,
  repository: SFI_CONTINUITY_REPOSITORY,
  repository_id: SFI_CONTINUITY_REPOSITORY_ID,
  ref: SFI_CONTINUITY_REF,
  workflow_ref: SFI_CONTINUITY_WORKFLOW_REF,
  event_name: 'schedule',
  iat: now - 60,
  nbf: now - 60,
  exp: now + 300,
};

assert.equal(validateGitHubActionsOidcClaims(valid, now).ok, true);
assert.equal(validateGitHubActionsOidcClaims({ ...valid, aud: ['other', SFI_CONTINUITY_OIDC_AUDIENCE] }, now).ok, true);
assert.equal(validateGitHubActionsOidcClaims({ ...valid, event_name: 'workflow_dispatch' }, now).ok, true);
assert.equal(validateGitHubActionsOidcClaims({ ...valid, repository: 'attacker/repo' }, now).reason, 'OIDC_REPOSITORY_MISMATCH');
assert.equal(validateGitHubActionsOidcClaims({ ...valid, repository_id: '999' }, now).reason, 'OIDC_REPOSITORY_ID_MISMATCH');
assert.equal(validateGitHubActionsOidcClaims({ ...valid, ref: 'refs/heads/feature' }, now).reason, 'OIDC_REF_MISMATCH');
assert.equal(validateGitHubActionsOidcClaims({ ...valid, workflow_ref: 'Aptymok/system-friction/.github/workflows/other.yml@refs/heads/main' }, now).reason, 'OIDC_WORKFLOW_REF_MISMATCH');
assert.equal(validateGitHubActionsOidcClaims({ ...valid, event_name: 'pull_request' }, now).reason, 'OIDC_EVENT_NOT_ALLOWED');
assert.equal(validateGitHubActionsOidcClaims({ ...valid, aud: 'wrong-audience' }, now).reason, 'OIDC_AUDIENCE_MISMATCH');
assert.equal(validateGitHubActionsOidcClaims({ ...valid, exp: now - 31 }, now).reason, 'OIDC_TOKEN_EXPIRED');
assert.equal(validateGitHubActionsOidcClaims({ ...valid, nbf: now + 31 }, now).reason, 'OIDC_TOKEN_NOT_YET_VALID');
assert.equal(validateGitHubActionsOidcClaims({ ...valid, iat: now - 901 }, now).reason, 'OIDC_TOKEN_AGE_INVALID');

console.log('FI-001 GitHub OIDC policy QA: PASS');
