# FIELD Operational Cycle v1

Status: operational contract
Date: 2026-07-12
Surface: `/field`

## Purpose

FIELD is the participant and organization surface of System Friction Institute. It is not a chat box and does not return an untraceable opinion. It opens a controlled observation cycle:

1. establish the state at T0;
2. generate a MOP-H structural reading;
3. seal a provisional hypothesis;
4. define one minimal, reversible intervention;
5. create a return window and SHA-256 seal;
6. wait for the participant to execute the intervention;
7. accept return evidence;
8. compare expected and observed movement;
9. record a partial MIHM evidence reading;
10. explain acceptance, limits and the next controlled step.

## Existing persistence contracts used

FIELD uses the tables already established by the system ownership foundation:

- `field_cases`
- `field_case_evidence`
- `field_moph_runs`
- `field_mihm_readings`
- `field_hypotheses`
- `field_interventions`
- `field_returns`
- `field_outcomes`
- `field_lessons`
- `sfi_audit_events`

It also attempts to register each cycle in:

- `sfi_reference_cases`
- `sfi_case_evidence_links`

A Reference Bank failure does not erase a valid participant cycle. It is reported as degraded and can be reconciled later.

## T0 intake

Required:

- case title;
- domain;
- description of the stuck system;
- observable objective;
- baseline evidence;
- consent to private persistence.

Recommended:

- previous attempts;
- consequence if unchanged;
- declared attractor or desired stable state;
- source reference or private file;
- reliability declaration.

The initial evidence is persisted as declared evidence unless a traceable source is provided. A private file is stored in the existing `field-evidence` bucket under the authenticated user ID.

## World context

At T0 and at return, FIELD reads the latest available:

- `worldspect_snapshots`;
- `world_vector_observations`.

World context supplies an observed environment, not a causal explanation. FIELD records:

- source status;
- observation timestamp;
- confidence;
- regime;
- dominant signal and domain values where available;
- degraded-source warnings.

A change in WorldSpect or World Vector between T0 and return becomes context for interpretation. It does not automatically explain the outcome.

## MOP-H

The existing governed MOP-H agent receives:

- stuck system;
- objective;
- attempts;
- evidence;
- consequence;
- authenticated account ID.

Its output is persisted in `field_moph_runs`. The reading may use AMV and graph evidence already present, but it remains provisional and does not execute an intervention automatically.

## MIHM evidence evaluator

FIELD does not falsely claim that participant text is equivalent to a calibrated, multimodal MIHM instrument.

It therefore produces a transparent partial reading under:

`FIELD_MIHM_EVIDENCE_PROXY_V1`

At intake it may derive limited proxies for:

- `C_s`: structural coherence proxy;
- `G_f`: field-context confidence proxy;
- `Phi`: evidence coherence-flow proxy.

Variables requiring return evidence, multimodal features or repeated observations remain `MISSING`, including where appropriate:

- `D_i`;
- `E_r`;
- `D_cog`;
- `F_s`;
- `V_i`;
- `I_mc`.

At return, the system may calculate transparent proxies from:

- sealed expected normalized movement;
- observed normalized movement;
- source reliability;
- intervention fidelity;
- baseline coherence;
- world context at return.

Each metric retains:

- value or `MISSING`;
- status;
- source;
- confidence;
- explanation;
- formula version;
- `canonicalCalibration: false`.

No psychological state is inferred.

## Hypothesis and intervention seal

FIELD persists:

- the provisional hypothesis;
- target;
- expected signal;
- confidence;
- verification window;
- minimal intervention;
- prohibited effects;
- evidence references.

It then creates a SHA-256 hash over the operational seal payload:

- case ID;
- owner ID;
- T0 timestamp;
- return due date;
- verification window;
- hypothesis ID;
- intervention ID;
- provisional expected value;
- baseline evidence ID;
- world observation timestamp.

This hash establishes what was expected before the return evidence existed. It is not a cryptographic signature of identity and does not prove that the intervention was executed.

## Verification windows

Supported:

- `72h`;
- `7d`;
- `30d`.

The default and primary FIELD cycle is 72 hours. Longer windows exist for systems whose observable conversion cannot reasonably occur within 72 hours.

## Return evidence

The participant submits:

- observed evidence note;
- source;
- optional private file;
- source reliability;
- normalized observed movement from 0 to 1;
- intervention fidelity from 0 to 1;
- optional observation timestamp.

FIELD preserves the return even when it does not reach the acceptance threshold.

Operational acceptance currently requires:

- reliability at or above 0.55;
- a minimally documented evidence note.

A return is marked verified only when:

- a traceable uploaded/source artifact exists;
- reliability is at or above 0.75;
- intervention fidelity is at or above 0.60.

These thresholds govern workflow state. They do not establish universal scientific validity.

## Comparison and outcome

The system records:

- sealed expected normalized movement;
- observed normalized movement;
- delta;
- evidence acceptance;
- verification state;
- intervention fidelity;
- return-time world context;
- partial MIHM return reading;
- learned statement;
- next controlled step.

Possible next steps include:

- add better evidence when the current return is too thin;
- open a second controlled cycle when deviation is large;
- retain, revert or test the intervention elsewhere when the cycle closes coherently.

## Reference Bank linkage

A FIELD case is registered as a prospective case when possible. Its evidence relations include:

- baseline evidence → `SUPPORTS`;
- hypothesis → `CONTEXTUALIZES`;
- intervention → `DOCUMENTS_INTERVENTION`;
- return evidence → `VERIFIES_OUTCOME`.

Closing a cycle updates its phase state but does not automatically calibrate an AMV model. Historical calibration still requires the governed corpus and model-specific promotion rules.

## Privacy

- Authentication is required for persistence and return.
- Cases are private by default.
- Files use the private `field-evidence` bucket.
- The public homepage and Observatory never receive participant free text.
- Analytics receive categorical workflow events only.
- Evidence, objective, title, case ID, user ID and audit payload are not sent to Google Analytics.
- Public publication requires a separate governance action.

## Failure behavior

- If WorldSpect or World Vector is unavailable, the cycle can continue with explicit degraded context.
- If Reference Bank linkage fails, the FIELD cycle remains intact and reports a warning.
- If required FIELD tables or the storage bucket are unavailable, the API returns a source-specific error and does not fabricate persistence.
- Missing data remains missing.

## Acceptance checklist

1. User can see current public World State before opening a cycle.
2. Unauthenticated visitors understand the four-step sequence and are directed to login.
3. Authenticated users can create a private case.
4. T0 evidence, MOP-H output, hypothesis, intervention and return window persist.
5. A stable SHA-256 return seal is shown.
6. Unsupported MIHM variables display `MISSING`.
7. The user can upload private baseline and return evidence.
8. The user can return after the selected window.
9. Expected and observed values are contrasted.
10. Evidence acceptance and verification are explained separately.
11. World context at T0 and return remains traceable.
12. The case closes with an outcome, lesson and next step.
13. No private text is sent to GA4.
14. No public prediction is represented as historically calibrated.
