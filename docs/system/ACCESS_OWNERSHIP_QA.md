# Access and Ownership QA Matrix

## Static verification included in this branch

- ROOT page calls `requireFounderPage()` before reading governance state.
- ROOT metadata sets noindex/nofollow/nocache.
- Middleware requires a session for `/root`, `/field` and `/studio`.
- Middleware redirects non-founder ROOT users to `/unauthorized`.
- FIELD no longer links directly to a ROOT action.
- Shared contracts use nullable confidence; missing confidence is not represented as zero.
- Public Observatory helper queries only `PUBLISHED` publication rows.
- FIELD tables use explicit owner RLS policies.
- FIELD evidence bucket is private and owner-prefixed.

## Required staging tests after migration application

| Actor | Operation | Expected |
| --- | --- | --- |
| Anonymous | Open `/observatory` | 200, public read only |
| Anonymous | Open `/field` | Login redirect |
| Anonymous | Open `/root` | Login redirect |
| FIELD user | Open `/root` | Unauthorized/403 surface |
| Founder | Open `/root` | Governance state loads |
| User A | Insert own FIELD case | Allowed |
| User A | Insert case with User B owner ID | Rejected by RLS |
| User A | Read/update/delete User B case | Rejected by RLS |
| User A | Upload under User B storage prefix | Rejected |
| User A | Read DRAFT publication | No rows |
| Anonymous | Read PUBLISHED publication | Allowed sanitized row |
| FIELD user | Update publication state | Rejected |
| Founder server route | Publish | Allowed and audited |

## Pending executable QA

Executable authorization tests require:

- migration applied to a staging Supabase project;
- two authenticated test users;
- one founder identity configured through `SFI_FOUNDER_USER_IDS`;
- test publication and FIELD records;
- deployment or local environment with the repository secrets.

This branch must not be described as production-authorized until those tests pass.
