# D-2026-09-08 · Autonomous Operation / Narrow ROOT Boundary

**Status:** ACCEPTED by Founder authority on 2026-09-08.

## Decision

SFI must operate, continue and close routine cases/cycles autonomously when its existing governed contracts and evidence gates are satisfied. Routine operational progress must not require a human accept/deny click.

ROOT is not a universal middleware.

A human sovereign decision is required only when SFI proposes one of these institutional changes:

1. **INSTITUTIONAL_CHANGE** — change a rule, authority boundary, contract, governance policy, canonical definition or institutional configuration.
2. **CAPABILITY_IMPLEMENTATION** — add, remove or materially alter an executable SFI capability/implementation in a way that changes institutional capacity or authority. Bounded repair and verification may occur before this decision; promotion/addition is the decision.
3. **LEARNING_PROMOTION** — promote a demonstrated learning candidate into institutional memory/canon/policy. Recording an observation, hypothesis, experiment, RETURN or learning candidate does not itself require ROOT.

## Explicit non-decisions

The following are operational states, not ROOT approval objects:

- case/cycle close;
- report generation or ordinary human use;
- evidence acquisition, evidence shortage or evidence classification;
- observation, reconstruction, analysis, hypothesis, rival, counterfactual or simulation;
- experiment execution already inside existing authority/cost/scope;
- bounded repair and regression testing;
- governed execution through an already-authorized capability;
- notifications, incidents, defects and degradation;
- RETURN recording and reality calibration.

If evidence is missing, SFI records what is missing, assigns/acquires it when possible, and exposes the condition in the case/graph/Observatory. It does not ask ROOT for permission merely to continue evidence work.

If SFI executes an already-authorized operation, it records actor/capability/input/authority/result/receipt/lineage. It does not ask ROOT for permission merely to execute it.

## Closure rule

Closure is an operational lifecycle transition. When the applicable closure contract is satisfied, SFI may close the case/cycle autonomously and record the closure receipt. Closure does not promote learning, canonize a conclusion, publish a report, authorize a new capability or expand authority.

`AWAITING_USER_CLOSE` is superseded as a mandatory general lifecycle gate. Legacy rows may remain reconstructable during migration/reset, but new routine operation must not route through it.

## Human communication rule

Any actual ROOT decision must be expressed first in ordinary language and answer:

- Who/what produced this request?
- What happened?
- Why does it matter?
- What exactly is being proposed?
- What new capability/rule/learning would SFI gain?
- What evidence supports it?
- What happens if ACCEPTED?
- What happens if DENIED?
- Why is ROOT authority actually required?

Machine identifiers, hashes, contracts and lineage remain available under technical trace/detail; they must not replace the plain-language explanation.

## Observatory rule

Autonomy increases observability requirements. The founder/authorized observer must be able to inspect current cases, active executions, missing evidence, defects, agent/capability health, decisions, RETURNs and closure receipts without becoming a scheduler or approval bottleneck.

## Invariant

`OBSERVE / RECONSTRUCT / ANALYZE / HYPOTHESIZE / TEST / BOUNDED_REPAIR / EXECUTE_WITHIN_EXISTING_AUTHORITY / RETURN / CLOSE != ROOT_DECISION`

`INSTITUTIONAL_CHANGE / CAPABILITY_ADD_OR_MATERIAL_CHANGE / LEARNING_PROMOTION = ROOT_DECISION`
