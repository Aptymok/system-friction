# WS-06 real SFZ fixture

This fixture is generated specifically for SFI QA and carries no Cultural Reference Bank material.

- Package contract: `SFI-ACOUSTIC-INSTRUMENT-PACKAGE-1.0`
- Canonical mapping: `instrument.sfz`
- Sample: WAV, 48 kHz, 24-bit PCM, mono
- Rights assertion: generated QA material with explicit execution eligibility
- Institutional execution authorization: supplied separately to the render call; public accessibility is never used as rights evidence
- Output class: `GENERATED_RENDER`, never `EXTERNAL OBSERVATION`

`SFI-SFZ-ADAPTER@1.0.0` intentionally implements a bounded SFZ subset: `sample`, `key`, `lokey`, `hikey`, `lovel`, `hivel`, `pitch_keycenter`, and `volume`. Unknown opcodes fail closed rather than being ignored or presented as supported. Room IR/send and non-`sustain` articulation are explicitly unsupported in v1.

The expected render hash is pinned in `expected-render.json`. CI renders a fresh WAV, verifies its hash/metrics, emits a receipt, proves workspace cleanup, and uploads the real WAV + receipt as QA artifacts.
