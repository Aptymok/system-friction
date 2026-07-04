# STUDIO START PROTOCOL

**Surface:** `/studio`  
**Status:** protected producer field  
**Scope:** REM618 continuity, Edwing producer workflow, portfolio pressure, client acquisition, manual cultural signal registration and evidence-based closure.

## 1. Phenomenon

`/studio` is not a public showcase and not a mockup layer. It is the private operational field where a music object becomes one of the following:

- REM618 continuity object.
- Producer portfolio candidate.
- Client-facing pitch candidate.
- Manual Instagram/community signal.
- Archived fragment.
- Killed fragment.

The field does not assume value. It requires evidence.

## 2. Access variables

Route protection is enforced before the surface loads.

- `/studio` requires an authenticated Supabase session.
- ROOT/system users pass.
- The configured `SYSTEM_ROOT_EMAIL` passes.
- Non-root studio collaborators pass only when their email appears in `STUDIO_AUTHORIZED_EMAILS`.
- Unauthorized users are redirected away from the field.

The API route `/api/studio/evaluate` repeats the studio authorization check server-side. UI access alone is not treated as sufficient authorization.

## 3. Execution variables

The current route is composed of:

- `src/app/studio/page.tsx`
- `src/components/studio/StudioStartProtocol.tsx`
- `src/components/studio/StudioFieldClient.tsx`
- `src/app/api/studio/evaluate/route.ts`
- `src/lib/studio/evaluation.ts`

The client extracts safe browser-side audio features when possible:

- duration
- sample rate
- channel count
- peak
- RMS
- clipping risk
- silence start/end
- energy by segments
- dynamic range
- structure note

The binary audio file is not uploaded to the server and is not persisted.

## 4. Evaluation variables

`/api/studio/evaluate` receives metadata and extracted features, then builds a structured report through existing SFI engines and safe fallbacks:

- MIHM Studio evaluation.
- ScoreFriction observation evaluation.
- Cultural Wave case contrast.
- WorldSpect state contrast.
- Music evaluation.
- Conclusion.
- Necessary perturbations.

Mode labels must remain visible and should not be hidden:

- `real_engine`
- `local_audio_features`
- `local_heuristic`
- `manual_signal`
- `blocked_safe_contract`
- `source_unavailable`

A section may be useful even when partial. It must not be represented as complete when blocked or heuristic.

## 5. Responsibility distribution

Studio is responsible for intake, evaluation, task generation and evidence gating.

Studio is not responsible for:

- automatic publication,
- social scraping,
- external messaging,
- ROOT mutation,
- permanent archival of binary audio,
- pretending a closure occurred without evidence.

The operator is responsible for providing evidence and deciding whether the object continues, publishes, sells, collaborates, revises, archives, dies, or remains blocked.

## 6. First session sequence

1. Create one concrete project.
2. Attach audio evidence if available.
3. Let the browser extract local audio features.
4. Run **Evaluar con SFI**.
5. Read the mode labels before acting.
6. Generate tasks from the report.
7. Attach manual evidence before task closure.
8. Register Instagram/community signal manually when relevant.
9. Generate producer offer only as a draft.
10. Assign one decision gate.

## 7. Closure rule

No evidence, no closure.

A task may exist without evidence. It may not close without evidence.

A project may exist without audio. It may not advance to publish, sell, collaborate, revise or continue without evidence, unless the decision is archive or kill.

## 8. Operational next layer

The next legitimate expansion is persistence of studio project metadata to Supabase under a dedicated studio table, preserving the current binary boundary:

- metadata yes,
- report yes,
- task state yes,
- decision gate yes,
- audio binary no.

Any expansion beyond that must preserve the same contract: no scraping, no automatic publishing, no ROOT mutation from Studio, no fake persistence.
