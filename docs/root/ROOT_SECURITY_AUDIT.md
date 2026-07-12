# ROOT security audit

## Remediated

- `/root` now enforces founder authorization on the server before reading private state.
- ROOT metadata forbids indexing and caching by crawlers.
- `GET /api/root/neural-graph/live` now requires `requireRootActor('neural-graph.live.read')`.
- ACP state is read through ROOT-gated `GET /api/governance/acp`.
- ACP presence is recorded through ROOT-gated, audited `POST /api/governance/acp-seen`; GET now returns 405.
- Self-observability GET is a gated read and no longer writes. Its write form is POST and audited.
- Self-reconstruction preview/propose/patch routes are gated; writes are audited.
- Founder state, operational readiness, AMV, report, Client Finder and Name Scout routes now use canonical ROOT gates; mutation routes audit.
- `/api/root/me` returns 401/403 rather than exposing ROOT identity data to a non-ROOT user.
- Read action suffixes suppress audit/epistemic writes, preserving the rule that refresh is not evidence.

## HTTP proof without a session

- `/root` -> 307 to login.
- `/api/root/console` -> 401.
- `/api/root/neural-graph/live` -> 401.
- `/api/root/operational/trigger-observation` -> 401.
- `/api/governance/acp` -> 401.
- `GET /api/governance/acp-seen` -> 405.
- `POST /api/governance/acp-seen` -> 401.

## Remaining limitations

- Authenticated founder and FIELD-role browser proof requires real test sessions; no bypass or fake cookie was introduced.
- Database write proof requires the target Supabase migration/state and an authenticated founder. Build/type proof does not assert that remote SQL has been applied.
- Existing database errors may be returned as bounded `details` strings by legacy routes; no stack traces are returned. A future hardening pass may map more provider messages to stable public error codes.
