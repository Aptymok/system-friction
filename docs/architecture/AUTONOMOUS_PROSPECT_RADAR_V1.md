# Autonomous Prospect Radar v1

## Purpose

Convert current public signals into a governed, evidence-backed commercial hypothesis without requiring the ROOT operator to name a company or paste the pain manually.

## Operational chain

```text
SFI capability catalog
  -> public web search
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

- ROOT page: `/root/prospect-radar`
- API: `GET|POST /api/root/agentic/prospect-radar`
- Persistence:
  - `prospect_research_runs`
  - `prospect_research_sources`
  - `prospect_opportunity_reports`

## Search providers

At least one server-side key is required:

```env
OPENAI_API_KEY=...
OPENAI_WEB_SEARCH_MODEL=gpt-5-mini
```

or:

```env
BRAVE_SEARCH_API_KEY=...
```

OpenAI Web Search is attempted first. Brave Search is the fallback. When neither provider is configured, the radar returns `PUBLIC_SEARCH_PROVIDER_NOT_CONFIGURED` and does not fall back to seed companies or fabricated evidence.

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
