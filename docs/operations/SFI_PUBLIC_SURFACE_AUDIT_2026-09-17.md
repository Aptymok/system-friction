# SFI Public Surface Audit — 2026-09-17

Status: OBSERVED against branch `ops/close-planned-open-loops-20260917` / PR #517.

Purpose: converge the existing site without rebuilding it, and keep PUBLIC / AUTH / INTERNAL boundaries explicit. This audit does not authorize merge or production deployment.

## Current disposition

| Route / family | Disposition | Audience / function | Evidence boundary |
| --- | --- | --- | --- |
| `/` | KEEP | Public entry threshold | `PublicEntryGateway` |
| `/observatory` | KEEP | Public live observation | `ObservatoryConsole` |
| `/field` | MERGE / ALIAS | Public semantic alias of Observatory | dynamic `[scene]` resolves `field` to the same `ObservatoryConsole`; preserve compatibility, do not present as a separate architecture |
| `/publications`, `/publications/[slug]` | KEEP | Public editorial archive and depth | publication state remains distinct from external evidence / RETURN |
| `/research/[slug]` | KEEP | Public research depth | only registered public research landings resolve; otherwise 404 |
| `/library` | KEEP | Public knowledge / evidence / relation projection | canonical graph read; publication disposition still applies |
| `/institution` | KEEP | Public identity / authority / limits | current public surfaces only |
| `/history`, `/history/mutations` | KEEP | Public institutional and mutation evidence history | mutation history distinguishes CODE → QA → DEPLOYMENT → EXERCISE → LEARNING |
| `/privacy` | KEEP | Public policy | public policy surface |
| `/login`, `/forgot`, `/reset`, `/entry`, `/auth-unavailable` | KEEP / AUTH SUPPORT | Authentication and bounded entry resolution | access support, not institutional public content |
| `/cases/new` | KEEP / INTERNAL | Authenticated work ingress | unauthenticated users do not receive case creation capability |
| `/signal/new` | KEEP / INTERNAL | Authenticated human signal ingress | cycle operations require authenticated state |
| `/method-lab` | KEEP / INTERNAL | Owner-scoped or institutional Method Lab | authenticated; `robots: noindex`; institutional view retains ROOT observer boundary |
| `/studio` | KEEP / INTERNAL | Authenticated Studio | member-gated |
| `/observatory/reports`, `/observatory/reports/[caseId]` | HIDE / INTERNAL | Authenticated case-platform reports | public Observatory CTA removed; routes remain protected and non-public |
| `/root`, `/root/*`, `/cases`, `/governance`, `/twin` | HIDE / INTERNAL | Governed operational surfaces | authority remains separate from public membrane |
| `systems`, `archive`, `falsification`, `optionality`, `authority`, `agents`, `identity`, `models`, `genai` | HIDE / LEGACY COMPATIBILITY | Historical scene aliases | `LEGACY_INTERNAL_SCENES` redirect to `/root`; removed from public sitemap/profile, not deleted |
| `/member`, `/world-vector` | MERGE / ALIAS | Compatibility redirects | both converge to `/field`; no separate architecture inferred |
| `/repository` | HOLD / CONTRADICTION | Runtime currently redirects `/repository → /archive → /root`, but older registries still declare a public foundational repository | do not delete or re-publicize until the contradictory historical declarations are reconciled against current Library/Graph architecture |

## Changes admitted in PR #517

1. Public sitemap now projects current public human surfaces instead of legacy internal scenes.
2. Home presents Observatory, Publications, Library and Institute as primary public surfaces. FIELD remains a stable Observatory alias, not a fifth architecture.
3. Public Observatory no longer advertises authenticated Case Platform reports.
4. Public Publications no longer advertises `/root/discovery`; it points to the public Observatory instead.
5. Institute no longer publishes the legacy scene map as the current public architecture.
6. Public typography is constrained to the visual grammar roles: Noto Serif Display / EB Garamond / Liberation Mono / Noto Sans. QA rejects Space Grotesk / Inter on the converged public entry and Institute surfaces.
7. Runtime authority, persistence, internal routes and legacy redirects are preserved.

## Explicit non-closures

- PDF binary publication: `BLOCKED_PUBLIC_BINARY_TRANSPORT`. Canonical original and verified web renditions exist; connected Drive/Dropbox surfaces do not grant anonymous-public ACL, and the current GitHub connector cannot ingest the local binary as a file parameter. HTML publication remains public; `publicUrl` for the PDF must remain null until a real public binary URL is observed.
- Library → Neural Graph materialization: `BLOCKED_AUTHORITY_SESSION`. The existing reconciliation endpoint requires a real authenticated ROOT session; service-role/cron substitution is not authorized.
- External Discovery RETURN: `TRIGGER_ONLY`. Discovery implementation is closed; external recognition/retrieval is empirical and must not be fabricated.
- Self-development real RETURN: `TRIGGER_ONLY` until an eligible real candidate exists.

## Closure condition for this audit

The screen-routing audit is complete when the branch retains the dispositions above, functional CI is green, completion receipts are recertified against the final branch head, and unresolved authority/external-world conditions remain explicitly classified instead of being simulated.
