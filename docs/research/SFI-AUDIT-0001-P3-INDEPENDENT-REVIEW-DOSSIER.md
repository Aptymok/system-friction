# SFI-AUDIT-0001 — Methodological Review Dossier (P3 candidate)

**Status:** `INDEPENDENT_REVIEW_REQUEST / NOT_CERTIFIED`
**Date:** 2026-10-22
**Scientific owner:** Existing Method Lab research-object registry; **no new research or citation claim created here**.
**Object:** `SFI-AUDIT-0001`, version `1.0.1`, `PUBLIC_DERIVATIVE_READY`.
**Package SHA256:** `0e11ffa84cd3ff1cd01033fe4847b09ce7f741afd989b7ca7ade3df52def5b0c`.
**Method Lab:** `SFI_AUDIT`, `MIXED` epistemic, `RETURN=PENDING`.
**Current automated controls:** P1 `PASS`, P2 `PASS`, certification `NOT_CERTIFIED`.
**Boundary:** Read-only review brief, **not evidence promotion, certification, independent reproduction, external validation, disclosure authorization or publication**.

## 1. What is actually asserted (reported metrics, not independently reproduced)

The public derivative reports a retrospective examination of **2,458** warranty workflow records. It reports **36** unresolved cases with explicitly expired repair periods, an **expired-closed cohort of 120**, of which **112** are classified temporally valid and **8** temporal exceptions. For that valid resolved cohort, reported post-expiration resolution latency has median **51 days**, 90th percentile **119.9 days**, and maximum **206.8 days**. A separate public metric reports **28** overloaded/ambiguous repair-timestamp cases.

These are values in Method Lab's public projection, *not numerical findings independently recomputed from source rows in this review*.

## 2. Six source findings and adversarial review protocol

| Finding | Public classification | What an independent reviewer must reproduce | Counterexample / alternative to test | Current status |
|---|---|---|---|---|
| F001: coarse state insufficient | OBSERVED | Compare reconstruction from coarse open/closed fields to event+authority trajectory on an eligible blinded subset | A more detailed conventional status taxonomy may recover the same states without Reality Chain | NOT_REPRODUCED |
| F002: 36 open expired cases | DERIVED | Preserve source cutoff, contract eligibility, actual days counted, original open/closed at cutoff, numerator and correct denominator | Late data entry, missing repair completion, administrative not material status | NOT_REPRODUCED |
| F003: heterogeneous clocks | OBSERVED | Map each cohort to its contractual 30-day, 20-day or 10-business-day clock and applicable exclusions/holidays | Clock differences can be ordinary contractual variance rather than a new universal friction property | NOT_REPRODUCED |
| F004: latency quantiles | DERIVED | Regenerate 120 resolved and 112 temporally valid after 8 exclusions; independently calculate median, P90, max from source | Alternate quantile definition, right-censoring, negative/inconsistent durations, cohort selection effects | NOT_REPRODUCED |
| F005: overloaded repair timestamp | OBSERVED | Verify 28 records with more than one event interpretation; disambiguate repair/completion/reporting timestamps | Document export reuse or labeling mismatch rather than operational causation | NOT_REPRODUCED |
| F006: batch closures | DERIVED | Freeze observation windows and event frequencies; test clustering against matched baseline/null process | Administrative batch processing, office-hour patterns, contractual settlement cycles | NOT_REPRODUCED |

**Quantile specification required before reviewer signoff:** declare inclusive/exclusive percentile convention, sorting, ties, rounding, time zones, negative duration handling, right censoring and the exact valid cohort. Do not infer statistical significance from one descriptive P90.

**Source permissions required:** source custodian approval, disclosure authority, deidentification assessment, lawful permitted retention and public aggregation granularity. No raw personnel or case-identifying records may enter the public package.

## 3. Independent reviewer and issuer separation

Producer, methodological reviewer, and institutional issuer must be **distinct authenticated actors**. Different prompts or different LLMs without independent input custody are not substitutes for independent scientific review.

The reviewer receives an authorized, minimum-necessary source package, executes or audits the extraction logic, preserves mismatches/negative results, declares conflicts of interest and returns a version-bound signed/attested report. The certifying authority verifies the reviewer result and SFI's own policy; that actor cannot silently elevate a favorable automated P1/P2 assessment to P3 certification.

An external-scientific-validation label requires a real third-party review, not a second SFI agent under shared organizational control.

## 4. Required evidence checklist — all OPEN unless linked to a real receipt

| Gate | Minimum evidence | Current |
|---|---|---|
| R01 Source custody/rights | Custodian authority, source license/use and disclosure limits | MISSING |
| R02 Method chronology | Frozen method, cutoff time, variable and clock definitions, transformation code | NOT_ATTESTED |
| R03 Record-level lineage | Exact mapping from F001–F006 to permitted source evidence | NOT_INDEPENDENTLY_VERIFIED |
| R04 Numeric reproduction | Recomputed counts, 112/120 exclusion, quantiles and missingness | NOT_REPRODUCED |
| R05 Competing hypotheses | At least one serious rival per central conclusion, negative cases and results | NOT_COMPLETED |
| R06 Privacy | Independently checked deidentification and export permissions | NOT_ATTESTED |
| R07 P0 data-plane | Current bilateral provider parity and exact package hash at decision time | MUST_REFRESH_AT_ISSUANCE |
| R08 Role separation | Separate researcher, reviewer and SFI certifier, audit of active grants | NOT_APPOINTED |
| R09 Signing/revocation | Authorized issuer, exact payload digest, signature, revocation/status lookup | NOT_IMPLEMENTED |
| R10 External RETURN | External reproduction/critique/adoption receipt | PENDING |

The previously observed ROOT `PRIMARY_MIRROR_CERTIFIED` receipt from 2026-10-22 is **only an as-of checkpoint**; it must be refreshed for any future certification transaction.

## 5. Explicit threats to validity

- Case records originate from a single institutional workflow; sample representativeness/generalizability cannot be assumed.
- The 8 temporal exclusions must have independent eligibility and exclusion reasons, not post-hoc favorable trimming.
- Administrative timestamps need not represent material action times.
- Survival/censoring and unresolved cases can shift latency summaries.
- Unobserved contractor actions or differing contract clauses can explain apparent timing discrepancies.
- `confidence=0.92` in the source research object does **not** have demonstrated calibration; do not represent it as a 92% chance that the findings are true.
- The project cannot assert contractual liability, a universal System Friction Theory result or an external causal RETURN from this retrospective audit.

## 6. Proposed review and publication disposition

**Current determination: `HOLD_CERTIFICATION_AWAITING_INDEPENDENT_METHOD_REVIEW`.**

The automated P1/P2 PASS means the public derivative is structurally consistent and free of the specific tested epistemic contradictions. It **does not** show source permissions, independent numerical reproduction, signed review, institutional issuer authority or post-intervention RETURN.

Once evidence is provided, the proper next state is **governed review**, not automatic certification. Any eventual `SFI-PROCESS-VERIFIED` designation must explicitly state it certifies procedural conformance for a version-bound package under a named SFI charter; it does **not** confer peer-reviewed scientific truth. Publication and DOI remain independent, authorized steps.

## 7. Independent review response (do not prefill)

- Reviewer identity, affiliation and declared conflicts: **MISSING**
- Scope and admissible source access grant: **MISSING**
- Object and exact package digest independently matched: **MISSING**
- Reproducibility run ID, input source manifest, code and environment: **MISSING**
- Findings accepted, rejected or indeterminate, with cited discrepancies: **MISSING**
- Privacy/source-custodian approval: **MISSING**
- Reviewer signature and timestamp: **MISSING**
- Institutional certifier's separate signed disposition: **MISSING**

**No certificate ID, cryptographic signature or DOI has been fabricated or issued.**
