# Autonomous Prospect Radar v1

## Purpose

Convert current public signals into a governed, evidence-backed commercial hypothesis without requiring the ROOT operator to name a company or paste the pain manually.

## Operational chain

```text
SFI capability catalog
  -> no-key public RSS retrieval
  -> candidate discovery/ranking
  -> company pain investigation
  -> evidence + counterevidence
  -> provisional causal map
  -> projected threshold/intervention window
  -> SFI offer fit gate
  -> public recipient/channel verification
  -> final dossier + email draft
  -> founder review
```

## Surface

- ROOT page: `/root/commercial#prospect-radar`
- API: `GET|POST /api/root/agentic/prospect-radar`
- UI component: `src/components/root/commercial#prospect-radar/RootProspectRadar.tsx`
- Retrieval/synthesis runtime: `src/lib/agents/noKeyProspectRadar.ts`
- Persistence:
  - `prospect_research_runs`
  - `prospect_research_sources`
  - `prospect_opportunity_reports`

## Retrieval providers

The operational route does not require a paid search key.

Default public retrieval:

- Bing News RSS.
- Google News RSS.
- Maximum three sequential queries per execution.
- Fifteen-minute in-process cache.

The route does not call GDELT, OpenAI Web Search or Brave Search.

## Synthesis

Ollama is optional and local:

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3.6:latest
```

When Ollama is available, public RSS sources are passed to the local model for structured synthesis. When Ollama is not available, the runtime returns a conservative deterministic report using the retrieved sources. It does not block because a paid provider or API key is missing.

Important deployment distinction:

- Local Next.js can reach Ollama on the same computer.
- Vercel cannot reach `127.0.0.1` on the operator's computer.
- On Vercel, deterministic synthesis remains available unless an externally reachable Ollama-compatible endpoint is configured.

## Input

- Mode: discover or investigate.
- Company: optional. Empty means autonomous discovery.
- Region.
- Sector: optional.
- Pain focus: optional.
- Lookback window.
- Maximum candidates.
- Whether internal provisional offers may be considered.

## Evidence contract

The agent should use at least three public sources when available, including official/regulatory and independent evidence where possible. Every source retains URL, publisher, retrieval time, optional publication date, source type and reliability.

RSS titles, descriptions and linked articles are source claims. They are not automatically verified institutional facts. Original publisher pages must be reviewed before external contact.

Claims are separated into:

- observed;
- source claim;
- inferred;
- projected.

Counterevidence and positive company signals are required to avoid manufacturing a crisis narrative.

## Critical window contract

The agent emits `projected_threshold_window`, not a deterministic collapse prediction. It records:

- observation date;
- start and end date;
- horizon days;
- threshold definition;
- triggers;
- counter-signals;
- confidence;
- collapse assessment.

`collapse_assessment` defaults to `not_assessable`. A company bankruptcy, failure or collapse must never be asserted from a generic friction pattern.

## SFI offer contract

Public canonical offers:

- `SFI-DR01`: Diagnóstico de Fricción Sistémica.
- `MOP-H-PILOT`: governed minimal perturbation and return window.

`SFI-AI01`, `SFI-GOV01`, `SFI-NA01` and `SFI-CX01` remain internal provisional families. They are excluded unless ROOT explicitly enables provisional offers.

The output may explain SFI's specific methodological combination, but may not claim that no other provider can address the problem.

## Contact safety

- Never infer email patterns.
- Never invent a name or title.
- Direct contact is verified only when a retrieved public source supports the channel.
- If no verified direct channel exists, return the responsible role and an official company page/form.
- The radar never sends email or publishes the dossier.

## Output

- ranked candidate companies;
- selected company;
- observed pain and affected groups;
- causal chain;
- counterevidence;
- projected opportunity window;
- SFI fit and confidence;
- verified recipient/channel or explicit missing state;
- final email draft;
- final Markdown commercial dossier;
- sources, warnings and limitations.

## Governance

Every execution requires ROOT authentication and writes a ROOT audit event. The research result remains `projected_not_validated` until a human verifies the evidence and the company confirms internal relevance.
