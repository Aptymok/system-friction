# SFI Cognitive Olympics 2026 · SFI_CL

**No se trata de llegar. Se trata de aprender a saber llegar.**

Local longitudinal cognitive laboratory for replaying 2010→2026 under sealed temporal cutoffs. The object under test is the Cognitive Twin / derived cognitive constitutions under System Friction Institute (SFI) constraints. Forecasting algorithms, statistical baselines, Ollama, Groq and other engines are instruments, not claimed SFI inventions.

## What is implemented

- Track A historical replay, 2010→2026.
- Track B shadow-world pseudonymization to reduce direct entity/indicator recognition.
- 5,000 problems/year in `full` and `congress` profiles; smaller smoke/quick profiles for calibration.
- World Bank public-data preparation with explicit `REFERENCE_ONLY` temporal-integrity warning: current historical series are **not** treated as historical-vintage proof.
- Cognitive constitutions: `origin-core`, `origin-augmented`, `origin-patched`, `sfi-evolver`, `sfi-mandatory`, `generic-control`.
- Engine separation: statistical persistence baseline, every installed Ollama model selected by `ollama:auto`, and optional Groq models.
- Real deterministic bridge to the repository's registered 21 SFI agent executors via `executeRegisteredAgent()`; the lab intentionally bypasses runtime event persistence so experiments do not contaminate institutional telemetry.
- Two-stage evidence behavior for LLM athletes: plan evidence requests first, then answer after only requested auxiliary evidence is revealed.
- Annual prediction seals (SHA-256), deterministic scoring, rule/temporal violations, annual learning memory, checkpoints, final leaderboard.
- Optional annual Congress after scoring: each LLM athlete may send at most two messages per pseudonymous peer.
- Local loopback API on `127.0.0.1:4316`.
- Auxiliary method cards derived from *Instrumentalización de una Mente Fragmentada · Founder Edition v1.2 FINAL* with original method maturity labels preserved.

## Run

```bash
node --test scripts/cognitive-olympics/smoke.test.mjs
node scripts/cognitive-olympics/prepare.mjs
node scripts/cognitive-olympics/runner.mjs --profile quick
```

Full 5K/year race:

```bash
node scripts/cognitive-olympics/runner.mjs --profile full --engines stats,ollama:auto
```

Explicit Ollama models:

```bash
node scripts/cognitive-olympics/runner.mjs --profile full --engines stats,ollama:model-a,ollama:model-b
```

Optional Groq exhibition lane (server-side/local env only):

```bash
set GROQ_API_KEY=...
node scripts/cognitive-olympics/runner.mjs --profile full --engines stats,ollama:auto,groq:<model-id>
```

The runner never prints secret values.

Congress league:

```bash
node scripts/cognitive-olympics/runner.mjs --profile congress --engines stats,ollama:auto
```

Shadow-world track:

```bash
node scripts/cognitive-olympics/runner.mjs --profile full --track B
```

## Local API

```bash
node scripts/cognitive-olympics/server.mjs
```

- `GET /v1/health`
- `GET /v1/manifest`
- `GET /v1/runs/latest`
- `POST /v1/runs` with `{ "profile":"quick", "track":"A", "engines":"stats,ollama:auto" }`

## Experimental boundaries

1. Track A is useful for calibration and learning but not definitive proof of strict historical ignorance, because contemporary LLM weights and current revised historical series may contain later knowledge.
2. The future partition is never included in an athlete problem payload. Outcomes are read only by the scorer after answers are sealed.
3. An unregistered failure cannot be relabeled after the fact as an experimental perturbation.
4. `SFI_METHODS` are auxiliary method cards. Their presence in a heat does not validate the methods themselves.
5. `sfi-evolver` may change explicit policy state after scored outcomes; `origin-core` remains a frozen cognitive control.
6. 2026 is a terminal current frame. Unobserved future outcomes are not fabricated.

## Output

Runs live under `.sfi-cl/runs/<run-id>/` and include:

- experiment manifest
- pseudonymous athlete registry
- append-only JSONL ledger
- sealed predictions + hashes per year/athlete
- score rows and annual leaderboards
- annual checkpoints / learned state
- optional Congress messages
- final longitudinal leaderboard
