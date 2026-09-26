# SFI · WORLD HYPOTHESIS CLOSURE REPORT

**Report state:** DERIVED / CANDIDATE  
**Observation cutoff:** 2026-09-26  
**Corpus:** persisted World Observatory hypothesis/outcome/learning records  
**Scope:** T0 2026-08-02 → 2026-09-16  
**Authority boundary:** this document reports persisted closure state. It does not reclassify hypotheses, create evidence, or create RETURN.

---

## 1. Executive reading

The first closed World Observatory cohort is not a story of “predictions that worked.”

It is a record of what happened when SFI forced hypotheses to encounter a later world.

Across **314 closed hypotheses**, the dominant terminal state is **PARTIALLY_VALIDATED: 278 objects (88.54%)**. The remaining **36 objects (11.46%) are INCONCLUSIVE**. There are currently **0 VALIDATED** and **0 CONTRADICTED** objects in this cohort.

That distribution must not be presented as an accuracy score.

What is reconstructible is narrower and more useful:

- 314 hypotheses reached a persisted terminal classification.
- 278 terminal outcomes contain linked RETURN evidence ids.
- Those same 278 objects have persisted learning events.
- 36 terminal outcomes contain no linked RETURN evidence and no learning event.
- Mean confidence moved from **0.5368** at T0 to **0.4677** after closure, a mean absolute change of **−0.0691**.
- Mean source coverage across the full cohort is **0.3321**.

The current corpus therefore shows a system that has learned to close hypotheses without pretending that every closure is decisive.

That is the finding.

---

## 2. Cohort anatomy

| Measure | Observed |
| --- | ---: |
| Closed hypotheses | 314 |
| PARTIALLY_VALIDATED | 278 |
| INCONCLUSIVE | 36 |
| VALIDATED | 0 |
| CONTRADICTED | 0 |
| Outcomes persisted | 314 |
| Outcomes with linked RETURN evidence | 278 |
| Outcomes without linked RETURN evidence | 36 |
| Learning events | 278 |
| Mean initial confidence | 0.5368 |
| Mean current confidence | 0.4677 |
| Mean confidence delta | −0.0691 |
| Mean source coverage | 0.3321 |

### Boundary

**PARTIALLY_VALIDATED ≠ VALIDATED**

**INCONCLUSIVE ≠ FALSE**

**OUTCOME RECORD ≠ INDEPENDENT EVIDENCE**

**LEARNING EVENT ≠ CANONICAL TRUTH**

---

## 3. The split is structurally exact in the current corpus

The current database resolves into two observed groups:

### Group A · 278

**Classification:** PARTIALLY_VALIDATED  
**Linked RETURN evidence:** yes  
**Learning event:** yes  
**Mean source coverage:** 0.3751  
**Mean confidence delta:** −0.0781

### Group B · 36

**Classification:** INCONCLUSIVE  
**Linked RETURN evidence:** no  
**Learning event:** no  
**Mean source coverage:** 0  
**Mean confidence delta:** 0

The equality of these counts is an observed property of the current corpus. It is **not sufficient to establish that evidence absence caused inconclusiveness**.

It does, however, give SFI a precise falsifiable question for the next cohort:

> When a hypothesis enters validation with an explicit test contract and measurable evidence requirements, does the system produce more discriminating terminal outcomes without increasing false certainty?

That is a better next question than “how many predictions were right?”

---

## 4. Methodological transition

The corpus spans at least two methodology generations.

| Method / evaluator | Terminal state | N |
| --- | --- | ---: |
| SFI-WORLD-2026.08.1 / SFI-WORLD-2026.08.1 | PARTIALLY_VALIDATED | 278 |
| 2026.08.1 hypothesis / 2026.09.1 evaluator | INCONCLUSIVE | 1 |
| SFI-WORLD-2026.09.1 / SFI-WORLD-2026.09.1 | INCONCLUSIVE | 28 |
| SFI-WORLD-2026.09.1 / strict-test-contract evaluator | INCONCLUSIVE | 7 |

Seven recent objects explicitly reached the strict evaluator with the recorded outcome:

**LEGACY_HYPOTHESIS_WITHOUT_PREREGISTERED_TEST_CONTRACT**

Twenty-nine other recent closures include an evaluator state in which the governed model was unavailable or the closure remained non-discriminating.

This is not a cosmetic implementation detail.

It marks the boundary between two generations of SFI:

**Generation 1** could form hypotheses and later compare them.

**Generation 2** requires the hypothesis to define, at T0, what future evidence is capable of discriminating it.

The latter is substantially harder—and epistemically stronger.

---

## 5. Confidence did not mechanically inflate

Mean confidence across the complete cohort moved:

**0.5368 → 0.4677**

Mean delta:

**−0.0691**

That is approximately a **12.9% decrease relative to the cohort's mean starting confidence**.

This does not prove calibration quality. It does establish that the persisted closure mechanism did not simply push every hypothesis upward.

The next report should therefore measure calibration by cohort, methodology version and terminal class rather than treating confidence as a decorative scalar.

Required future measures:

- Brier-style or equivalent calibration error where outcomes permit it;
- confidence movement by test-contract version;
- source-family independence;
- evidence coverage;
- decisive vs non-decisive rate;
- contradiction capture rate;
- false-positive / false-negative cost where measurable.

---

## 6. Why the INCONCLUSIVE objects matter

The 36 INCONCLUSIVE objects are not the embarrassing remainder of the report.

They are one of its strongest results.

The system preserved cases where it could not legitimately discriminate the hypothesis instead of converting missing evidence into a negative result.

Several recent objects preserve explicit reasons such as:

- no preregistered test contract;
- governed assessment model unavailable;
- no linked RETURN evidence;
- zero source coverage.

A mature closure engine should be capable of saying:

> The validation window ended, but the available instrumentation cannot distinguish this claim.

That is materially different from saying:

> The hypothesis was wrong.

---

## 7. RETURN anatomy

For a closure to become reconstructible, the report should preserve six distinct layers:

1. **T0 CLAIM** — hypothesis frozen before validation.
2. **TEST CONTRACT** — expected signals, contradiction criteria, thresholds, source requirements and validation window.
3. **LATER OBSERVATIONS** — records acquired inside the frozen window.
4. **CRITERION ASSESSMENT** — which preregistered criteria could or could not be measured.
5. **DETERMINISTIC CLASSIFICATION** — VALIDATED / PARTIALLY_VALIDATED / CONTRADICTED / INCONCLUSIVE.
6. **LEARNING** — retained, rejected or missing variables only when a persisted learning event exists.

The report generator must never collapse these six layers into a prose verdict.

---

## 8. What changes now

The next World hypothesis cohort should be treated as the first cohort for which SFI attempts strict prospective closure by design.

A hypothesis should not enter the active validation lane unless it has:

- a frozen statement;
- a T0 timestamp;
- a validation start and end;
- measurable expected criteria;
- measurable contradiction criteria;
- minimum observation requirements;
- required source families where appropriate;
- a rule for NOT_DETERMINABLE;
- a preserved prior confidence;
- an explicit RETURN contract.

If those are absent, the hypothesis may still exist as an exploratory inference, but it should not masquerade as a prospectively testable object.

---

## 9. Report direction

The final public/internal report should not read like a dashboard export.

Its narrative architecture should be:

**I. The question** — Can an institution preserve a hypothesis long enough for the world to disagree with it?

**II. The cohort** — What exactly was frozen and later closed?

**III. The confrontation with RETURN** — What later evidence was actually available?

**IV. Where discrimination failed** — Why did some windows close without a measurable answer?

**V. What changed in the method** — Why strict preregistration became necessary.

**VI. Calibration** — Did confidence move appropriately?

**VII. Contradictions** — What did the world refuse to support?

**VIII. Learning** — What changed in SFI after the cohort?

**IX. The next falsification** — What would demonstrate that the new method is still inadequate?

This keeps the report from becoming a victory document.

It becomes a record of institutional learning under constraint.

---

## 10. Current disposition

**OBSERVED**
- 314 closed hypotheses.
- 278 PARTIALLY_VALIDATED.
- 36 INCONCLUSIVE.
- 278 outcomes with linked RETURN evidence.
- 36 outcomes without linked RETURN evidence.
- 278 persisted learning events.
- Mean confidence 0.5368 → 0.4677.
- Mean source coverage 0.3321.

**DERIVED**
- 88.54% of the current cohort is PARTIALLY_VALIDATED.
- 11.46% is INCONCLUSIVE.
- Mean confidence fell by 0.0691, approximately 12.9% relative to mean T0 confidence.
- The current corpus splits exactly between PARTIALLY_VALIDATED + evidence + learning and INCONCLUSIVE + no linked evidence + no learning.

**NOT ESTABLISHED**
- That 88.54% constitutes predictive accuracy.
- That absence of linked evidence caused every INCONCLUSIVE classification.
- That PARTIALLY_VALIDATED hypotheses describe causal mechanisms correctly.
- That the 2026.08 and 2026.09 cohorts are directly comparable without controlling for methodology.
- That report publication would constitute external validation or RETURN.

---

## 11. Next gate

The next meaningful evidence is not another prettier report.

It is a new cohort that begins with the strict test contract already in force and survives its complete prospective validation window.

Then SFI can compare:

**legacy closure → strict prospective closure**

and ask whether reconstructibility actually improved.

That comparison can falsify the method itself.

---

**SYSTEM FRICTION INSTITUTE**  
Observation → Evidence → Inference → Authority → Execution → RETURN
