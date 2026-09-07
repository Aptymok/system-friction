import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const oauthConfig = readFileSync('src/lib/sfi/oauthConfig.ts', 'utf8');
const authorize = readFileSync('src/app/api/oauth/authorize/route.ts', 'utf8');
const externalAuth = readFileSync('src/lib/sfi/externalAuth.ts', 'utf8');
const decisionRoute = readFileSync('src/app/api/external/v1/governance/proposals/[id]/decision/route.ts', 'utf8');

assert.match(oauthConfig, /SFI_ROOT_SCOPES[\s\S]*'governance:decide'/, 'root scope registry must expose governance:decide');
const personalBlock = oauthConfig.match(/export const SFI_PERSONAL_SCOPES = \[([\s\S]*?)\] as const;/)?.[1] ?? '';
assert.equal(personalBlock.includes("'governance:decide'"), false, 'personal OAuth scopes must not include governance:decide');

assert.match(authorize, /const rootDelegate = profileRole === 'root' \|\| profileRole === 'system'/, 'OAuth root delegation must derive from authenticated profile role');
assert.match(authorize, /rootDelegate\s*\? SFI_ROOT_SCOPES/, 'root scopes must only be selected for rootDelegate principals');
assert.match(authorize, /const delegatedRole = rootDelegate[\s\S]*'root_delegate'/, 'issued OAuth credential must bind root_delegate role to rootDelegate');
assert.match(authorize, /const tenantId = personalPrincipal \? `user:\$\{context\.user\.id\}` : 'sfi'/, 'institutional principals must be issued in SFI tenant');

assert.match(externalAuth, /credential\.authMethod === 'oauth'/, 'external auth must preserve OAuth identity metadata');
assert.match(externalAuth, /scope\.startsWith\('cases:'\)/, 'personal scope routing must remain explicitly bounded');
assert.equal(externalAuth.includes("scope === 'governance:decide'"), false, 'personal route allowlist must not open governance:decide');

assert.match(decisionRoute, /const REQUIRED_SCOPE = 'governance:decide'/, 'decision endpoint must require governance:decide');
assert.match(decisionRoute, /credential\.authMethod !== 'oauth'/, 'static tokens must be rejected for sovereign decision');
assert.match(decisionRoute, /credential\.role !== 'root_delegate'/, 'non-root delegated OAuth credentials must be rejected');
assert.match(decisionRoute, /credential\.tenantId !== 'sfi'/, 'decision endpoint must require institutional SFI tenant');
assert.match(decisionRoute, /!credential\.subjectId/, 'decision endpoint must require a bound subject identity');
assert.match(decisionRoute, /\.from\('profiles'\)[\s\S]*\.eq\('user_id', credential\.subjectId\)/, 'decision endpoint must re-read live profile authority');
assert.match(decisionRoute, /role === 'root' \|\| role === 'system'/, 'live sovereign profile must remain ROOT or system');
assert.match(decisionRoute, /access\.full_access === true && access\.root === true/, 'live sovereign profile must retain full_access + root flags');
assert.match(decisionRoute, /decideActionProposal\(\{[\s\S]*decisionAuthority: 'root'/, 'decision must flow through canonical proposal lifecycle');
assert.match(decisionRoute, /queueApprovedProposal\(\{[\s\S]*decisionAuthority: 'root'/, 'accepted decision must flow through canonical proposal queue');
assert.match(decisionRoute, /dispatchQueuedProposal\(proposalId\)/, 'accepted proposal must flow through governed execution router');
assert.equal(/\.from\('action_proposals'\)[\s\S]{0,500}\.update\(/.test(decisionRoute), false, 'route must not directly mutate action_proposals authority state');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-ROOT-GOVERNANCE-DECISION-BOUNDARY-1.0',
  guarantees: [
    'governance:decide is ROOT-only',
    'scope possession is not sovereign authority',
    'static tokens cannot decide',
    'live ROOT profile is revalidated',
    'decision uses canonical lifecycle and governed execution',
  ],
}, null, 2));
