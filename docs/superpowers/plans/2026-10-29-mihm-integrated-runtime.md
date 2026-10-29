# MIHM integrated runtime implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Execute continuously under the user's GO authorization.

**Goal:** Connect the repaired typed MIHM instrument to the existing scientific caller and persist verifiable bounded results without overstating calibration.

**Architecture:** Extend the existing typed audit, JR scientific runtime and its single epistemic-event writer. Consume explicit persisted graph attributes with subject and source-lineage checks; never synthesize missing inputs. No route, registry, scheduler, table, formula or permission change.

**Tech Stack:** TypeScript, Node, existing Supabase/event runtime.

**Spec:** Existing Case recommendation SFI-MIHM-TOTAL-INTEGRATION-EVIDENCE-ROUTE-20261029, accepted by the user's “GO”; existing docs/research/SFI-MIHM-ADAPTIVE-VIABILITY-INSTRUMENT-2026-10-26.md. This is an executable increment within all 21 families, not closure of MIHM TOTAL.

## Global Constraints

- Preserve subject, case/cycle identity, source provenance and original time cutoff.
- Derived screening never becomes observation, calibrated dynamics, causal propagation, homeostasis or RETURN.
- Missing inputs remain missing; absent typed input creates no synthetic result.
- Existing bounded JR target limits and primary write guard remain.
- No merge or deployment during the active finite continuity trial; no renewal of its grant.

## Review Focus

- Malformed persisted JSON must abstain without breaking unrelated methods.
- Other-subject or lineage-unbound observations cannot be used.
- A future time cutoff cannot be executed as a present observation.
- Persistence failure or divergent reread cannot be reported as successful.
- Duplicate execution preserves full limitations/lineage, not only numeric output.

### Task 1: Typed instrument caller boundary
Files: existing foundationTypedFieldAudit.ts and its test.
Consumes nodeId, lineage and attributes.mihmTypedFieldAudit={caseRef,cycleRef,input}; produces bounded ScientificMethodExecution-compatible result or null if absent.
- [ ] Add failing tests for exact -0.19 trajectory/one limit violation, case/cycle preservation, missing input, malformed input, foreign subject, future cutoff, source lineage and blocked input.
- [ ] Run tests and observe missing executor failure.
- [ ] Implement executeMihmTypedFieldForNode(node,executedAt) with explicit NOT_CALIBRATED and sourceValuesIndependentlyVerified=false.
- [ ] Run all typed tests.

### Task 2: Existing JR and authoritative persistence
Files: scientificMethodRuntime.ts, jrFieldCycle.ts, scientificMethodRuntime.test.mjs, existing MIHM workflow.
- [ ] Add runtime tests executing actual TS modules with only external I/O replaced: typed input with no conventional candidate executes, confirmed persistence and duplicate reread pass; read error, write error, absent and changed reread fail.
- [ ] Watch missing integration/persistence checks fail.
- [ ] Extend existing family union, append typed result in executeScientificMethodsForNode, include explicit typed inputs in existing bounded scientificTargets.
- [ ] Hash full executions, check lookup errors, reread exact stored payload/lineage after append; never retry ambiguous writes.
- [ ] Run typed and runtime tests; run hosted canonical architecture, boundaries, typecheck, build and capability checks before any merge.

### Task 3: Review and persistent delivery
- [ ] Record owner/preflight and verification limitations in the existing research document.
- [ ] Publish isolated draft integration PR from main absorbing repaired PR854 code without editing main or trial configuration.
- [ ] Independent whole-branch code review and fix important findings with failing regressions.
- [ ] Persist observed code/CI status into existing Case and reread. Report only exercised functionality; calibration and real production invocation stay pending until their own evidence exists.

## Execution checkpoint

Task 1 implemented: original four new tests failed for missing executor, then all 17 typed tests passed. Task 2 caller connection implemented; two actual-runtime tests passed. Persistence deep-reread hardening NOT implemented; remains a named pending task. No production invocation or calibration claimed. Local source snapshot has no installed project dependencies; full checks delegated to native GitHub CI before any merge. No trial renewal or deployment performed.

Independent review found case/cycle attribution could be rebound. Added failing regression, then bound both identity refs to persisted node lineage. Full-suite local rerun required; this does not establish independent source-value verification.

## Mechanism implementation checkpoint

Expanded existing mihm-core and wired declared mechanisms into the existing typed caller: signed legacy IHG/ICE + derivatives, constrained redistribution, linear multinode projection/contraction bound, seeded measurement uncertainty, explicit pathology screening and paired forecast comparison. 30 local tests pass. No empirical calibration or total 21-family closure. Existing public APIs/permissions unchanged. Next: native CI on updated head, then existing persistence readback hardening and actual source adapters for the remaining instrument families.
