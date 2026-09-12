# Post-merge runtime and publication closure — 2026-09-12

Status: implementation closure record for the bounded residuals observed after PR #496 and PR #486 merged.

## Scope

This record does not create a new SFI workstream. It records the observed disposition of the Case GPT transport residual, the public Library boundary, Notas Temporales v1, Signal Vane, Cluster Atlas, and the Predictive Engine.

## Case GPT transport

The dedicated `addSfiCaseObject` Action remains a transport adapter over the canonical Case repository writer. Flat `canonicalRefId` transport is retained because nested GPT Action transport was observed to lose the identifier. Optional `sourceRefIds` and `recordRefIds` are now strict: omission is valid; malformed arrays, empty identifiers, and duplicate identifiers are rejected rather than silently removed. No evidence, governance, intervention, RETURN, or truth-claim authority is added.

## Public Library

`/library` remains a public static surface. Interactive filtering is isolated in a client presentation component and receives only repository-defined public publication metadata. The public route does not become a Cognitive Spine reader or a private runtime state consumer.

## Notas Temporales v1

Canonical publication identity remains `PUBLICATION:notas-temporales-v1` under `https://systemfriction.org/publications/notas-temporales-v1`. The HTML publication is the canonical public object; a PDF is a rendition of that object, not a second publication authority.

Final PDF rendition observed in the user-owned artifact library:

- filename: `SFI_Notas_Temporales_Mexico_Septiembre_2026_FINAL.pdf`
- media type: `application/pdf`
- bytes: `23085591`
- SHA-256: `bbc7c9df27b6f7295f9919a707f5adab3f25ddd44fee194812c8d38259135103`
- rendition state in repository metadata: `IDENTIFIED`
- public binary URL: not asserted until a controlled public object-storage or repository asset exists

Publication/deployment establishes EXPOSURE only. It does not establish Discovery, Recognition, Interaction, Relation, Propagation, PULL, or RETURN.

## Signal Vane

Observed implementation:

- registered AMV scope: yes
- runtime invocation through `runAmvRuntime`: yes
- dashboard/instrument contract: yes
- external execution: no
- persistent live-state source owned by Signal Vane: no
- automatic CognitiveEvent write: no

Disposition: `LIVE_SCOPED / CONTEXT_DRIVEN / NON_EXECUTING`. Signal Vane is not missing merely because its dashboard state remains degraded without selected/live source context. Do not invent a persistence owner to make the dashboard look live. Its stochastic projection operator remains sandbox-only and cannot feed regime or execute externally without governed approval.

## Cluster Atlas

Observed implementation:

- registered AMV scope: yes
- runtime invocation through `runAmvRuntime`: yes
- dashboard/instrument contract: yes
- external execution: no
- persistent live-state source owned by Cluster Atlas: no
- automatic CognitiveEvent write: no

Disposition: `LIVE_SCOPED / CONTEXT_DRIVEN / NON_EXECUTING`. Cluster Atlas may classify or frame clusters from supplied context, but a persistent cluster-memory plane must not be fabricated merely to remove a degraded UI state.

## Predictive Engine

Observed implementation:

- persisted model registry: yes
- prediction runs: yes
- evidence requests: yes
- observed/verified outcomes: yes
- governed learning events: yes
- due-window reconciler: yes
- AMV observational scope: yes
- automatic irreversible authority: no

Disposition: `LIVE_PERSISTED / GOVERNED_LEARNING`. This is distinct from the AMV stochastic-projection sandbox operator. The AMV state surface now reads the existing Predictive Engine health contract instead of degrading a subsystem that already has observed persistent state. That read does not authorize prediction outputs to feed regime, attractors, canon, or external execution automatically.

## Cognitive Runtime boundary

`AMVReading -> PhenomenonRelay -> CognitiveEvent` remains the sole explicit bridge for structured AMV readings currently admitted to the Cognitive Runtime. Registering an AMV scope does not automatically create a new CognitiveEvent shape or write authority. Signal Vane and Cluster Atlas therefore remain callable scoped instruments without being silently promoted into institutional memory writers.

## Deployment boundary

No production deployment should be invoked blindly. At closure time the connected Vercel integration exposed no team/project to this session, so repository CI plus public production smoke are required evidence. Legacy Netlify preview failures are not treated as Vercel production state.
