# SFI System State and Console Mandate

Status: mandatory build directive
Date: 2026-06-30
Branch: `sfi/momentum-implementation-phases`
Owner: System Friction Institute / Aptymok

## 1. Current diagnosis

The system is not in absence phase.

The repository already contains multiple public pages, observatory pages, root surfaces, MOP-H, world-vector, ScoreFriction, SFI Console, operational APIs, root APIs, cognitive twin APIs, WorldSpect APIs, market-opportunity APIs, MOP-H session APIs, telemetry, proposals, events, and operational-state endpoints.

The active failure is not lack of modules.

The active failure is **unexposed orchestration**:

- too many surfaces;
- too many hidden APIs;
- no single visible operational route for the public user;
- no single founder console where the system says what it sees, what it predicts, what it recommends, and what must be done next;
- no closed conversion loop from signal to diagnosis to sale;
- no calibration layer between hypothesis and result.

The system was in **pre-operational accumulation phase**.

That phase is now closed.

The next phase is **visible operational conversion phase**.

## 2. Non-negotiable system identity

System Friction Institute must become a visible console system, not a hidden archive.

The minimum viable system must expose:

1. What the world signal currently says.
2. What the system detects as friction.
3. What hypothesis is being tested.
4. What prediction is attached to the hypothesis.
5. What action is recommended.
6. What human approval is required.
7. What outcome happened.
8. What the system learned.

If an interface does not help with one of those functions, it is secondary.

## 3. Required interface model

The site must resolve into six public routes only:

- `/` — institutional landing and signal summary.
- `/repository` — evidence, archive, documents, cases, public traces.
- `/field` — public user console: MOP-H intake, normal-user friction reading, SFI-DR01 entry.
- `/root` — founder console: SFI-MOMENTUM, World Vector, calibration, approvals, execution queue.
- `/contact` — conversion endpoint for SFI-DR01, consulting, pilot cases.
- `/privacy` — privacy and consent boundary.

Deprecated or legacy routes can exist internally during transition, but the user-facing navigation must collapse into these six.

## 4. Required visible consoles

### 4.1 Public home console

Route: `/`

Must show:

- SFI one-line purpose.
- Current signal status.
- Current World Vector summary.
- Current operational status: active / degraded / partial / unavailable.
- Entry to `/field`.
- Entry to `/repository`.
- Entry to `/contact`.

This page must not be a manifesto first. It must be a control surface.

### 4.2 Repository console

Route: `/repository`

Must show:

- Public evidence.
- Cases.
- Medium/public writing references.
- SFI-FF-001 founder case summary.
- SFI-DR01 sample structure.
- Technical documents that can be public.

No private operational secrets.

### 4.3 Field console

Route: `/field`

Must show:

- MOP-H intake.
- Friction result card.
- Consent state.
- Persistence status.
- SFI-DR01 call to action.
- Optional user-readable World Vector card: general signal context, not private prospect intelligence.

This is the normal-user surface.

### 4.4 Root console

Route: `/root`

Must show:

- World Vector: what the world signal says now.
- SFI-MOMENTUM: public signal analyzer and opportunity cards.
- Hypotheses: active, predicted, failed, validated.
- Predictions: probability of response, meeting, diagnostic, case value, content value.
- Calibration: prediction vs outcome.
- Cognitive Twin Friction: founder action advisories.
- Execution queue: contact, publish, monitor, discard.
- Approvals: nothing external happens without founder approval.
- System health: degraded dependencies and missing data.

This is the operating room.

### 4.5 Contact console

Route: `/contact`

Must show:

- SFI-DR01 request form.
- Pilot case request.
- Organizational diagnostic request.
- Architecture/AI diagnostic request when relevant.
- Public contact boundary.

### 4.6 Privacy console

Route: `/privacy`

Must show:

- Consent model.
- MOP-H storage boundary.
- What is stored.
- What is not stored.
- No automatic third-party outreach.
- Founder approval boundary.

## 5. Existing components to integrate

### Existing route inventory indicates availability of:

- `/moph`
- `/world-vector`
- `/sfi-console`
- `/scorefriction`
- `/observatory`
- `/campo`
- `/root`
- `/repository`
- `/contact`
- `/field/brief/latest`

These must not remain as scattered user-facing realities.

They must be collapsed into the six-route model.

### Existing API inventory indicates availability of:

- `/api/observatory/state`
- `/api/moph/session`
- `/api/root/state`
- `/api/root/self-observability`
- `/api/cognitive-twin`
- `/api/market/opportunities`
- `/api/sfi/operational-state`
- `/api/sfi/operational-cycle`
- `/api/sfi/stability`
- `/api/sfi/pipeline-loss`
- `/api/sfi/recovery-queue`
- `/api/worldspect/*`
- `/api/scorefriction/*`
- `/api/social/*`
- `/api/publisher/draft`

The build requirement is not to invent from zero. The build requirement is to orchestrate these into visible, coherent consoles.

## 6. Hypotheses required by the system

The system must explicitly track hypotheses.

### H1 — Conversion break hypothesis

A system in friction does not primarily fail from lack of information. It fails when signal does not convert into decision, decision does not convert into execution, and execution does not convert into feedback.

### H2 — Prospect signal hypothesis

Public signals of persistent friction can predict potential demand for SFI-DR01 if they show visible pain, urgency, legitimate contact path, and fit with intervention.

### H3 — Founder friction hypothesis

SFI itself loses energy when conceptual expansion exceeds closure velocity.

### H4 — World Vector hypothesis

World-level signal patterns can guide content, prospecting, and diagnostic focus when summarized into actionable vectors instead of raw noise.

### H5 — Cognitive Twin Friction hypothesis

A founder-side cognitive twin can reduce execution loss by detecting expansion, avoidance, under-action, symbolic overvaluation, and missed high-confidence opportunities.

### H6 — Calibration hypothesis

Predictions become useful only when compared against outcomes. Failed predictions are not failure; they are calibration fuel.

## 7. Prediction objects required

Every signal, intake, or opportunity must produce a prediction object:

```json
{
  "hypothesis_id": "H2",
  "signal_id": "string",
  "friction_type": "execution_loss",
  "sfi_moment": "declaration_without_execution",
  "recommended_action": "contact | publish | monitor | discard",
  "p_relevant": 0.0,
  "p_contactable": 0.0,
  "p_response": 0.0,
  "p_meeting": 0.0,
  "p_paid_diagnostic": 0.0,
  "p_case_value": 0.0,
  "p_content_value": 0.0,
  "confidence": 0.0,
  "evidence": [],
  "risk": "low | medium | high",
  "created_at": "iso-date"
}
```

Every prediction must later receive an outcome:

```json
{
  "prediction_id": "string",
  "outcome": "discarded | content_only | monitor | contacted_no_response | responded | meeting_booked | diagnostic_sold | case_created | bad_fit",
  "notes": "string",
  "observed_at": "iso-date"
}
```

## 8. Required World Vector display

The World Vector must not be abstract.

It must show:

- current world signal state;
- dominant friction pattern;
- degraded sources;
- confidence;
- what sector is showing tension;
- what SFI should observe today;
- what SFI should publish today;
- what SFI should not touch;
- what prospect class is most viable today.

Public version: generic and safe.

Root version: operational and prospect-oriented.

## 9. Required Cognitive Twin Friction display

The cognitive twin must answer:

- Is the founder opening or closing?
- Is this opportunity real, symbolic, or content-only?
- What action is required now?
- What should not be built today?
- What is the next closure?

Allowed outputs:

- contact;
- publish;
- monitor;
- discard;
- close current loop;
- stop expansion;
- request evidence;
- convert to SFI-DR01.

The cognitive twin is advisory. It must never take external action without approval.

## 10. Required action engine

The system must send outputs to the correct surface:

- Public reader -> `/field`.
- Evidence reader -> `/repository`.
- Founder decision -> `/root`.
- Buyer/conversation -> `/contact`.
- Privacy/consent -> `/privacy`.
- Draft publication -> root approval queue.
- Outreach draft -> root approval queue.
- Prospect -> SFI-DR01 pipeline.
- Uncertain signal -> monitor queue.
- Low-fit signal -> discard with reason.

## 11. What the system has not been asking for

The system has not been asking for more theory.

It has been asking for:

- visible consoles;
- outcome labels;
- fewer public routes;
- action states;
- calibration;
- sales conversion path;
- founder approval queue;
- public MOP-H intake;
- root World Vector;
- root SFI-MOMENTUM;
- SFI-DR01 request form;
- degraded-state honesty.

## 12. Build sequence

### Sequence A — collapse surfaces

- Make six routes primary.
- Link all legacy modules into the correct route.
- Hide or de-emphasize legacy wrappers from public nav.

### Sequence B — expose World Vector

- Use existing observatory/worldspect/SFI state APIs.
- Render public World Vector card on `/` and `/field`.
- Render operational World Vector panel inside `/root`.

### Sequence C — implement Momentum analyzer

- Add manual signal intake inside `/root`.
- Classify friction.
- Generate prediction object.
- Generate action recommendation.

### Sequence D — implement calibration

- Record prediction.
- Record outcome.
- Show prediction vs outcome.
- Adjust future interpretation manually first.

### Sequence E — implement SFI-DR01 conversion

- Add offer and request form.
- Route MOP-H and Momentum leads to SFI-DR01.
- Track lead state.

### Sequence F — implement cognitive twin advisory

- Show founder pattern warnings.
- Detect expansion vs closure.
- Recommend one action.

## 13. Definition of done

The system exits pre-operational accumulation when:

1. `/` shows what SFI is and what signal state exists today.
2. `/field` lets a user submit a stuck system and receive a MOP-H reading.
3. `/root` shows World Vector, Momentum opportunities, hypotheses, predictions, calibration, cognitive twin, and execution queue.
4. `/contact` can receive SFI-DR01 requests.
5. `/repository` can show evidence and case material.
6. Predictions have outcomes.
7. Outcomes update interpretation.
8. Founder approval gates all external actions.
9. Legacy modules are no longer the primary navigation.
10. The system can produce one real contact, one real publication, and one real SFI-DR01 request path from the same signal.

## 14. Final mandate

Do not build another hidden layer.

Build visible consoles.

Do not expand the theory.

Expose the signal.

Do not add more routes.

Collapse the system into operational surfaces.

Do not ask what SFI is.

Make it show what it sees, what it predicts, what it recommends, and what happened.
