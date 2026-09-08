import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync('scripts/sfi-program-dispatch.mjs', 'utf8');

assert.match(source, /SFI-PROGRAM-COMPLETION-DISPATCH-1\.1/);
assert.match(source, /GITHUB_REST_WITH_BOUNDED_TRANSIENT_RETRY/);
assert.match(source, /SEARCH_MARKER_AFTER_TRANSIENT_CREATE_BEFORE_RETRY/);
assert.match(source, /TRANSIENT_GITHUB_ERROR/);
assert.match(source, /HTTP\\s\+\(\?:502\|503\|504\)/);
assert.match(source, /ghApi\('GET', 'search\/issues'/);
assert.match(source, /ghApi\('PATCH', `repos\/\$\{repo\}\/issues\/\$\{number\}`/);
assert.match(source, /ghApi\('POST', `repos\/\$\{repo\}\/issues`/);
assert.match(source, /findExistingIssue\(marker\)/);
assert.match(source, /retries: 3/);
assert.match(source, /retries: 0/);
assert.match(source, /RECOVERED_AFTER_TRANSIENT_CREATE/);
assert.doesNotMatch(source, /\['issue', 'list'/, 'dispatcher must not depend on GraphQL-backed gh issue list search');
assert.doesNotMatch(source, /\['issue', 'create'/, 'dispatcher creation must use explicit REST transport');
assert.doesNotMatch(source, /\['issue', 'edit'/, 'dispatcher update must use explicit REST transport');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-PROGRAM-COMPLETION-DISPATCH-1.1',
  invariants: [
    'REST_SEARCH_NOT_GRAPHQL_ISSUE_LIST',
    'BOUNDED_TRANSIENT_RETRY',
    'CREATE_RECOVERY_SEARCH_BEFORE_RETRY',
    'NO_SILENT_DUPLICATE_TRAJECTORY_CREATION',
    'FAIL_CLOSED_AFTER_RETRY_EXHAUSTION',
  ],
}, null, 2));
