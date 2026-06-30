# SFI-MOMENTUM Implementation Phases

Status: implementation directive
Branch: `sfi/momentum-implementation-phases`
Date: 2026-06-30
Owner: System Friction Institute / Aptymok

## 0. Closure decision

System Friction Institute does not need another conceptual expansion before market contact. It needs a closed operating circuit:

`public signal -> friction interpretation -> opportunity score -> case hypothesis -> human outreach -> content output -> lead -> SFI-DR01`

This document defines the implementable MVP for that circuit while preserving the final site constraint:

- Public routes remain: `/`, `/repository`, `/field`, `/root`, `/contact`, `/privacy`.
- `/field` contains the public MOP-H intake and normal-user diagnostic surface.
- `/root` contains founder-only SFI-MOMENTUM console and approvals.
- No new public wrapper routes such as `/moph`, `/momentum`, `/prospect-console` are introduced.
- No direct database access from client components.
- No service-role client in browser code.
- No fake data, fake prospects, or automated invasive outreach.
- Production must not use insecure TLS. Local proof may use `NODE_TLS_REJECT_UNAUTHORIZED=0` and `SFI_ALLOW_INSECURE_LOCAL_TLS=true` only for local verification.

## 1. Product names fixed

### Public intake

**MOP-H Field Intake**

Normal-user entry point inside `/field`.

Purpose: allow a user to describe a stuck system and receive a minimal friction reading.

### Internal console

**SFI-MOMENTUM**

Founder-only console inside `/root`.

Purpose: detect public signals, interpret friction, produce opportunity cards, generate case hypotheses, prepare human outreach drafts, and generate publication angles.

### Sellable product

**SFI-DR01 · Systemic Friction Diagnostic**

Purpose: the first paid offer. Every lead, signal, case, and contact must resolve into either SFI-DR01, monitoring, content, or discard.

## 2. MVP architecture

### Existing base to preserve

The repository already has a MOP-H API at `src/app/api/moph/session/route.ts` and persistence logic at `src/lib/moph/session-store.ts` using `sfi_moph_sessions` with fallback behavior. These are the starting points, not disposable code.

### Required modules

1. `/field` public MOP-H intake panel.
2. `/root` private SFI-MOMENTUM console panel.
3. Server-only analysis functions for friction classification.
4. Server-only opportunity scoring.
5. Server-only outreach/content draft generation.
6. Existing persistence layer reuse.
7. Founder approval gate before any mutation or external action.

## 3. Data contract without new tables

Until database governance is intentionally reopened, this MVP must avoid new Supabase migrations.

Use existing persistence patterns:

- MOP-H user sessions: existing `sfi_moph_sessions` route/store.
- Internal observations: reuse existing SFI operational/event/proposal storage where available.
- Draft outputs: store as JSON payloads in the existing operational ledger/proposal/event surface only if the current schema supports it.
- If schema support is not confirmed, store draft outputs transiently server-side and render them in `/root` without claiming persistence.

The system must label persistence status explicitly:

- `persisted`
- `session_only`
- `degraded`
- `not_persisted`

## 4. Phase 1 — Field capture closure

Objective: make `/field` capable of capturing demand.

Deliverables:

1. Public MOP-H intake with five fields:
   - What system is stuck?
   - What objective is not converting into execution?
   - What has already been tried?
   - What evidence exists?
   - What happens if nothing changes?

2. Minimal result card:
   - Friction type.
   - Conversion break.
   - Risk.
   - First intervention hypothesis.
   - CTA: request SFI-DR01.

3. Persistence:
   - Use existing MOP-H session API.
   - Respect consent state.
   - Never expose service-role logic to client.

Acceptance criteria:

- User can submit a MOP-H intake from `/field`.
- Response renders without hallucinated certainty.
- If persistence fails, the UI says degraded/session-only rather than pretending success.
- CTA directs toward `/contact` or an internal contact action.

## 5. Phase 2 — Root Momentum console

Objective: give the founder a private console that converts signals into opportunities.

Deliverables inside `/root`:

1. Signal intake card:
   - Manual paste of public signal URL/text.
   - Optional sector/region.
   - Source type.

2. Analysis output:
   - Signal summary.
   - Detected entity/sector.
   - Friction type.
   - SFI Moment.
   - Evidence.
   - Opportunity score.
   - Recommended offer.
   - Risk label.

3. Action outputs:
   - Case hypothesis.
   - Human outreach draft.
   - Public content angle.
   - Decision buttons: contact, publish, monitor, discard.

Acceptance criteria:

- Root-only access.
- No automatic external sending.
- Every output is marked as draft until founder approval.
- No fake prospects.

## 6. Phase 3 — Friction classifier

Objective: standardize interpretation.

Classifier labels:

- `execution_loss`
- `digital_transformation_block`
- `institutional_overload`
- `reputation_tension`
- `cultural_monetization_gap`
- `technical_fragmentation`
- `data_without_decision`
- `diagnostic_opportunity`
- `public_case_opportunity`
- `content_opportunity`

SFI Moments:

- `declaration_without_execution`
- `visible_crisis`
- `data_without_decision`
- `leadership_transition`
- `public_procurement_or_call`
- `cultural_saturation`
- `architecture_ai_normativity`
- `repeated_systemic_pattern`

Acceptance criteria:

- Classifier returns structured JSON.
- Classification includes evidence text.
- Output includes uncertainty.
- Output can be rejected by founder.

## 7. Phase 4 — Opportunity scoring

Objective: prioritize action.

Score formula:

`SOS = D*0.25 + U*0.20 + P*0.20 + F*0.20 + A*0.10 + L*0.05`

Variables:

- `D`: visible structural pain.
- `U`: temporal urgency.
- `P`: probable ability to pay or institutional legitimacy.
- `F`: fit with SFI-DR01.
- `A`: legitimate accessibility of contact.
- `L`: ethical/commercial legitimacy.

Output classes:

- `A_contact_today`
- `B_content_first`
- `C_monitor`
- `D_discard`

Acceptance criteria:

- Score never overrides human review.
- Low-legitimacy signals cannot become contact recommendations.
- The console explains why a score was assigned.

## 8. Phase 5 — SFI-DR01 conversion path

Objective: every valid opportunity must resolve into the paid product.

Deliverables:

1. SFI-DR01 one-page offer block on `/field` or `/contact`.
2. Founder-facing proposal generator in `/root`.
3. PDF outline generator for SFI-DR01.
4. Contact script.

Minimum offer:

- 8-15 page diagnostic.
- Friction map.
- Conversion break analysis.
- Persistence matrix.
- Minimal intervention hypothesis.
- 60-minute reading session.

Acceptance criteria:

- A lead has only four possible states: new, qualified, contacted, closed/lost.
- No open-ended symbolic states.
- Every proposal names a price or marks price as `pilot_pending`.

## 9. Phase 6 — Visibility engine

Objective: publish from detected friction, not from emotional overflow.

Deliverables:

1. LinkedIn post draft.
2. Medium note draft.
3. Short X/Twitter-style signal draft.
4. Repository note when relevant.

Rules:

- Do not name third parties in accusatory terms.
- Do not exploit crisis.
- Convert public signal into general pattern.
- End with MOP-H or SFI-DR01 call to action.

Acceptance criteria:

- Every content item has target audience.
- Every post has one CTA.
- Every post maps to one SFI Moment.

## 10. Phase 7 — Feedback loop

Objective: make the system learn from reality.

Track:

- Signal analyzed.
- Action selected.
- Contact sent manually or not.
- Response received or not.
- Meeting booked or not.
- Paid diagnostic or not.
- Reason lost.
- Learning.

Acceptance criteria:

- No opportunity remains without status.
- Weekly review shows: contacted, responded, meetings, diagnostics sold, content published.

## 11. Implementation order

Do not build everything at once.

Order:

1. Field capture.
2. Root manual signal analyzer.
3. Classifier.
4. Scorer.
5. Outreach/content drafts.
6. SFI-DR01 offer path.
7. Feedback states.
8. Automation only after manual loop works.

## 12. Non-goals

Not now:

- Autonomous scraping.
- Automated LinkedIn messaging.
- New public routes.
- New database migrations.
- World observatory total rebuild.
- Atlas expansion.
- KXTXR expansion.
- New aesthetic layer before sales loop.

## 13. Definition of done

SFI-MOMENTUM MVP is done when:

1. A normal user can enter `/field`, describe a stuck system, and receive a usable MOP-H reading.
2. The founder can enter `/root`, paste a public signal, and receive a classified opportunity card.
3. The system can draft a human message and a public post from that signal.
4. The system can route the opportunity toward SFI-DR01.
5. The result is tracked as contact, content, monitor, or discard.
6. Nothing depends on fake data.
7. Nothing sends external messages automatically.
8. Nothing violates the public route constraint.

## 14. Closure statement

SFI-MOMENTUM is not a marketing gimmick. It is the commercial sensing layer of System Friction Institute.

Its job is to convert the Institute from internal archive into external contact:

`world tension -> SFI reading -> human action -> paid diagnostic -> institutional learning`.
