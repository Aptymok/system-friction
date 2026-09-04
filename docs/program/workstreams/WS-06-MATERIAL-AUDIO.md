# WS-06 · MATERIAL AUDIO

**Mission:** institutionalize controlled audio/material execution as the first nontrivial material-production vertical of SFI: rights-aware instrument registry, neutral acoustic package, ephemeral render workspace, modular adapters, governed audio capabilities and closed-loop evaluate/rerender/RETURN.

**Initial baseline:** `565ac410fceb56d86ff9d6eaec85b901d0d77248`  
**Integration authority:** SFI-00  
**Self-merge:** FORBIDDEN

## 1. Existing owners to inspect

Before implementation inspect:

- Universal Signal audio handling;
- FAD activation for audio;
- Studio routes/contracts;
- existing MIHM/CVF/WSV/audio feature extraction;
- current file upload/storage policies;
- external agent/gateway Studio scopes;
- existing material evidence contracts;
- any audio experiment code such as EXP001/VETE YA references if present.

Do not create a second FAD or duplicate Studio authority.

## 2. Constitutional material boundary

SFI persists knowledge, rules, vectors, evidence, decisions, rights metadata, references, hashes, metrics, manifests and lineage.

SFI does not default to storing every raw audio/sample byte in the institutional database.

Temporary material execution may use authorized external/user storage plus an ephemeral workspace.

## 3. Acoustic package standard

Canonical package:

`SFI-ACOUSTIC-INSTRUMENT-PACKAGE-1.0`

```text
samples: WAV 48 kHz / 24-bit
mapping: SFZ
manifest: JSON
optional room IR: WAV
performance interchange: MIDI
SFI performance controls: JSON
```

SFZ is the neutral canonical mapping format.

Adapters may support DecentSampler, SoundFont, physical models, neural instruments, external generators or human stems without changing canonical package semantics.

## 4. Instrument Bank

Implement a real registry only after duplicate-owner preflight.

Potential owner: `sfi_instruments`.

Required fields:

```text
id
name
family
origin
engine
package_ref
package_hash
license
rights_status
range_low
range_high
articulations
velocity_layers
round_robins
sample_rate
quality_state
cultural_profiles
version
verified_at
```

No instrument may be `PRODUCTION` if package/rights state is unknown.

## 5. Cultural Reference Bank

Separate owner/persistence from executable instruments.

Potential owner: `sfi_cultural_references`.

Contains lawful observations/references:

```text
work/source identifier
external asset ref
hash
rights/observation status
feature manifest
embedding ref
FAD state
CVF state
MIHM state
observed cultural vector
```

A commercial reference is not executable sample material unless rights explicitly allow it.

## 6. Ephemeral material workspace

Implement lifecycle:

```text
authorized upload/external ref
→ temporary workspace
→ decode/analyze/separate/render/mix/master
→ result artifacts
→ authorized user/external storage
→ workspace cleanup
→ SFI receipt persists refs/hashes/metrics/manifests/lineage
```

Required receipt includes:

```text
runId
source refs + hashes
instrument package refs + hashes
performance/score refs
adapter versions
render parameters
output refs + hashes
metrics
started/finished times
cleanup state
rights assertions used
lineage
```

If cleanup fails, record failure; never claim ephemeral cleanup succeeded without evidence.

## 7. Acoustic Render Adapter

Canonical interface should support:

```text
supports(instrument/package)
resolveEvents
resolveSamples
render
emitReceipt
```

Adapters:

```text
SFZAdapter
DecentSamplerAdapter
SoundFontAdapter
PhysicalModelAdapter
NeuralInstrumentAdapter
ExternalGeneratorAdapter
HumanStemAdapter
```

Implement SFZ first as the canonical real adapter; other adapters are implemented only when there is a real usable runtime/dependency, not fake stubs presented as support.

## 8. Performance contract

A performance object must support at least:

```text
bar/time
instrument
role
notes/events
start
duration
articulation
velocity
microtiming
vibrato/continuous controls where applicable
room send
provenance
```

MIDI is interchange; SFI JSON carries higher-level semantics.

## 9. Audio capabilities

Implement as governed capabilities/passports, not new permanent autonomous agents:

```text
audio_observer
audio_reference_resolver
audio_cultural_vector
audio_score_planner
audio_performance_planner
audio_instrument_resolver
audio_renderer
audio_stem_separator
audio_mix_master
audio_candidate_evaluator
audio_intersection_forecaster
```

Integrate with WS-01 adaptive runtime when stable.

## 10. Closed-loop production

Required trajectory:

```text
VOICE / SOURCE
→ OBSERVE
→ FAD + WSV + MIHM
→ CULTURAL TARGET
→ SCORE
→ PERFORMANCE
→ INSTRUMENT RESOLUTION
→ RENDER
→ STEMS
→ OBSERVE AGAIN
→ FAD/CVF/MIHM
→ COMPARE TARGET
→ LOCALIZE FAILURE
→ RERENDER ONLY FAILURE
→ RETURN / RESULT RECEIPT
```

Do not regenerate unaffected stems when the failure is localized and adapter supports bounded rerender.

## 11. Model/external generator boundary

End-to-end generators may be optional adapters, never canonical owners.

SFI must be able to preserve:

- original voice/source;
- score/performance identity;
- instrument assignment;
- output lineage;
- local rerender control;
- objective/declared target comparison.

No claim that SFI automatically exceeds another music generator in raw sound quality. The measurable advantage sought is control, provenance, reproducibility, editability and convergence.

## 12. MCP/external tools

Coordinate with WS-04 for governed tools:

```text
audio_observe
audio_get_cultural_target
audio_build_composition_plan
audio_resolve_instruments
audio_render
audio_evaluate_candidate
audio_record_return
```

`audio_render` and material writes are authenticated/scoped operations.

## 13. Rights/security requirements

Every source/instrument/reference must expose a rights state such as:

```text
UNKNOWN
OBSERVATION_ONLY
EXECUTION_ALLOWED
DERIVATIVE_ALLOWED
PUBLICATION_ALLOWED
RESTRICTED
```

The exact enum may be absorbed into an existing rights contract if present.

Never infer execution/publication rights from public accessibility.

## 14. Forbidden outcomes

- commercial reference ripped into an instrument without rights;
- raw audio persisted in DB by default;
- fake SFZ adapter that never renders;
- eleven new autonomous LLM agents;
- black-box song output with no score/performance/instrument lineage;
- generated audio treated as observed cultural evidence by inheritance;
- external generator used as truth authority;
- cleanup claimed without receipt;
- production quality claimed without actual render/evaluation.

## 15. QA gates

Required:

```text
SFI-AUDIO-RIGHTS-SEPARATION-1.0
SFI-AUDIO-EPHEMERAL-ASSET-1.0
```

Tests must prove:

1. Instrument Bank and Cultural Reference Bank cannot be silently substituted;
2. unknown rights block restricted execution/publication paths;
3. SFZ adapter produces deterministic receipt and real render artifact in supported test fixture;
4. raw audio is omitted from durable DB checkpoint by default;
5. cleanup state is recorded;
6. localized failure can rerender bounded material without regenerating unaffected stems where supported;
7. generated/rendered output remains distinct from external observation.

## 16. Definition of done

WS-06 is complete when a real authorized input can be observed, planned, assigned to registered instruments, rendered through at least the canonical SFZ adapter, evaluated, selectively rerendered, and returned with rights/provenance/metrics/cleanup receipts, without converting SFI into raw-media storage.

## 17. Handoff

```text
BASE SHA
BRANCH
INSTRUMENT REGISTRY STATE
REFERENCE BANK STATE
MIGRATIONS
ADAPTERS REAL/AVAILABLE
EPHEMERAL WORKSPACE STATE
CAPABILITIES
MCP DEPENDENCY
QA
REAL RENDER FIXTURE/RECEIPT
KNOWN DEFECTS
PR
NEXT SAFE ACTION
```

---

# COPY-PASTE DISPATCH PROMPT

You are **SFI-06 · MATERIAL AUDIO**.

Start from fresh `Aptymok/system-friction`, read all program control-plane files and `docs/program/workstreams/WS-06-MATERIAL-AUDIO.md`. Inspect current Universal Signal audio/FAD/Studio/storage/rights owners before writing anything.

Implement the maximum current complete material-audio vertical: rights-aware Instrument Registry, separate Cultural Reference Bank, SFI Acoustic Instrument Package 1.0, real SFZ adapter, ephemeral workspace with cleanup/receipts, performance contract, governed audio capabilities, closed-loop observe→plan→render→evaluate→localized-rerender→RETURN. Integrate with WS-01/WS-04 only through frozen contracts.

No raw-audio DB warehouse, no fake adapters, no commercial-reference sampling without rights, no eleven autonomous agents, no unsupported superiority claims. You may branch/commit/open PRs but not merge. Execute real QA/render fixtures/typecheck/build and leave durable handoff state.

Proceed from actual repository state now.
