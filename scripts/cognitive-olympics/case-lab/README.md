# SFI CHRONOS Case Lab — AI Week NYC synthetic reconstruction

**Status:** Laboratory-only experimental fixture. **Not** institutional evidence, not canonical data, not an authoritative description of SFI's past, not a naturalistic test, and not a prospective forecast.

This is a small bounded lane **inside the existing CHRONOS / Cognitive Olympics code area**. It does **not** install or create a second Method Lab, Reality Chain, event store, authority system, Cognitive Twin or case database.

## 1. Research exercise

Two coordinated passes on a fictional case in which synthetic institutional planning, synthetic rehearsal authority and a fictional terminal return are declared:

1. **Reverse reconstruction / backcast:** Feed the initial condition, fictional authority and fictional RETURN. Ask a candidate agent to propose *possible* missing inferences and *hypothetical* execution steps. None may be relabeled as having actually occurred.
2. **Forward reconstruction / hindsight forecast:** Feed only the initial condition and fictional authority under an explicit **2026-10-07 pre-event cutoff**. Ask for a conditional hypothesis about the nearest event. Freeze the response generated **now**, then optionally reveal independent documentation referring to a real October 8 event. Because models may know October 8 already, this is a **retrospective demonstration**, never a valid 2026-10-07 prospective prediction.

**Terminal label:** `OBSERVACIÓN: PRESENTACIÓN DE SFI · JUAN MARÍN · AI WEEK NYC`.

**Fact-verification caveat:** The Google Drive recording artifact exists and has metadata creation time `2026-10-08T19:46:31.078Z`. The meeting invitation lists a scheduled start of 7 PM New York time (`2026-10-08T19:00:00-04:00` = `2026-10-08T23:00:00Z`). These timestamps are not consistent with assuming the recording was created during the advertised time slot. The lab **must not** invent a reason. A recording file is evidence of a file, not independently established evidence that the full published session occurred on schedule. Source: verified metadata in the user's privately connected Drive; meeting invitation from an acceptance email. Exact private file URLs and identifiers are deliberately excluded from the repository. The real presentation's full occurrence remains `UNVERIFIED_FROM_METADATA_ALONE` until further review.

The real artifact metadata is kept only in `realReference`; it is **never inside synthetic input anchors**, and it is withheld from the candidate unless the explicit `--reveal` option is requested.

## 2. Run locally

```bash
node scripts/cognitive-olympics/case-lab/run.mjs --mode backcast
node scripts/cognitive-olympics/case-lab/run.mjs --mode forecast
node scripts/cognitive-olympics/case-lab/run.mjs --mode forecast --reveal
node --test scripts/cognitive-olympics/case-lab/run.test.mjs
```

The built-in default is a **deterministic baseline**, not an LLM/Cognitive Twin run. Its purpose is to test data partitioning, schema and explicit labels, without any provider credentials. It produces two rival candidate pathways for backcast and two conditional forecast hypotheses; it cannot prove an artificial agent independently found the missing steps.

To have Claude or another authorized model **actually propose the missing links**, send it only the `input` object printed by the appropriate run (not `realReference`, not the `--reveal` output). Request a JSON object matching this schema:

```json
{
  "candidateId": "CLAUDE-LAB-CANDIDATE-001",
  "producedBy": "CLAUDE_DECLARED_MODEL_VERSION",
  "phase": "RETRODICTION_OF_MISSING_STEPS",
  "inferences": [
    {
      "id": "H1",
      "epistemicClass": "INFERRED",
      "certainty": "HYPOTHETICAL",
      "basisRefs": ["LAB-SYN-INITIAL-001", "LAB-SYN-AUTHORITY-001", "LAB-SYN-RETURN-001"],
      "proposition": "A possible missing explanatory step, explicitly not claimed to have happened."
    }
  ],
  "executionCandidates": [
    {
      "id": "A1",
      "epistemicClass": "SIMULATED",
      "executionState": "NOT_EXECUTED",
      "basisRefs": ["LAB-SYN-INITIAL-001", "LAB-SYN-AUTHORITY-001"],
      "proposedAction": "Hypothetical action, never a real execution receipt."
    }
  ]
}
```

For `--mode forecast`, change `phase` to `RETROSPECTIVE_FORECAST_EXERCISE`, remove references to `LAB-SYN-RETURN-001`, and let `executionCandidates` be empty. Never share the withheld outcome before collecting the model prediction. Replay after outcome known **cannot** eliminate prior training-knowledge contamination.

Validate a model's output saved in a local JSON file:

```bash
node scripts/cognitive-olympics/case-lab/run.mjs --mode backcast --candidate /path/to/candidate.json
```

Output is to stdout only; redirect manually to an isolated local report if desired. No DB, API, MCP, network, external action, or live SFI modification occurs. The output includes a local SHA-256 reproducibility checksum; it is **not** an externally anchored preregistration timestamp.

## 3. Mandatory epistemic boundary

**DO NOT** submit this fixture or generated candidates to:

- `root_evidence_entries`, institutional `epistemic_events` as an observation, or any canonical evidence/admission writer;
- Reality Chain or any Reality Passport surface as if it reflected events in the world;
- an actual `RETURN`, action execution, founder/ROOT authorization, validated decision trace or canonical Cognitive Twin memory;
- the Research Hub as an empirical result.

All fictional anchors are `SIMULATED` and named `LAB-SYN-*`. Candidate inferences must be `INFERRED / HYPOTHETICAL`; action steps must be `SIMULATED / NOT_EXECUTED`. The runner rejects unsafe epistemic statuses, unauthorized references, and forbidden evidence/authority fields.

SFI can use a quarantined synthetic scenario to **practice** reconstruction, design tests and identify missing data. It must not infer the historical existence of records that were never actually persisted.

The case's fictional return is not a real observed RETURN. The separate real recording metadata is an **external documentary reference**; its appearance under an observation heading is not a claim of canonical admission.

## 4. What comes next

1. Execute and validate this local fixture's six tests.
2. Have **an actual cognitive model** independently produce candidate hypotheses from the input object; record provider, version, elapsed time, prompt/cutoff and sealed response. Baseline output is not that achievement.
3. Use independent observed records to resolve the apparent clock discrepancy (video playback/transcript, organizer/host or event session log), without reinterpreting the original fictional reconstruction as evidence.
4. Only after this smoke test, reuse public 2012 Knight Capital data for **historical calibration**. Famous incident histories may be contaminated in LLM weights and cannot be silently treated as blind forecast results.
5. For confirmatory work, freeze truly new case inputs, controls and outcome measures before the event; acquire independent RETURN, and keep LCI / SFI-DT / MIHM-T endpoints separate.

Cross-study tracking: [Three-Experiment Convergence](../../../docs/research/SFI-THREE-EXPERIMENTS-CONVERGENCE.md) · [Adversarial review](../../../docs/research/SFI-PEMS-ADVERSARIAL-REVIEW-001.md).

**Ethics/privacy:** This fixture must not include private participant data, attendee identities, meeting content, tokenized Meet links or private model context. Only metadata necessary to locate an event artifact is referenced.
