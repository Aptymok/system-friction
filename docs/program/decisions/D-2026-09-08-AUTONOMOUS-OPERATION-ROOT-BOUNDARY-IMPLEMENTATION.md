# Implementation obligations for D-2026-09-08

This file tracks implementation obligations created by the accepted Founder decision `D-2026-09-08-AUTONOMOUS-OPERATION-ROOT-BOUNDARY.md`.

## Required code deltas

- Routine case/cycle closure must no longer require `AWAITING_USER_CLOSE` or an explicit human report decision.
- `AWAITING_USER_CLOSE` remains readable only for legacy reconstruction/migration until reset; new routine flows must not enter it.
- ROOT actionable queues must exclude ordinary closure, report approval, evidence acquisition/classification and routine execution.
- ROOT actionable queues may contain only institutional change, capability implementation/material capability change, and learning promotion.
- Missing evidence is a case/graph/Observatory notification/state and an Evidence Hunter/acquisition trajectory when available, not a sovereign approval request.
- Existing-authority execution proceeds and records actor/capability/authority/input/result/receipt/lineage; it is observable in Observatory without pre-execution ROOT approval.
- Actual ROOT decisions must render a plain-language dossier before technical trace.

## Verification

Required QA must demonstrate:

1. a routine case/cycle reaches CLOSED autonomously when closure criteria are satisfied;
2. closure does not promote learning or canon;
3. evidence shortage remains visible and does not create a ROOT decision solely because evidence is missing;
4. a routine report does not enter the sovereign queue;
5. an already-authorized execution does not require a ROOT click;
6. learning promotion still requires ROOT;
7. capability ADD/material change still requires ROOT;
8. institutional rule/authority change still requires ROOT;
9. Observatory/read surfaces expose autonomous progress and receipts.
