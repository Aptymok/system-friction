# SFI ↔ ChatGPT Plus Observation Plane

Status: implemented as a read-only query over existing canonical persistence owners.

## Why this exists

Full custom MCP inside ChatGPT is not a viable baseline dependency for SFI because plan availability can gate installation. SFI therefore does not depend on ChatGPT MCP for institutional observation.

For the founder's current ChatGPT account, the practical bridge is the already-connected standard providers:

- Supabase: persisted institutional state, events, cases, RETURN, continuity, Twin and Lab.
- GitHub: canonical implementation state, PRs, releases and code lineage.
- Vercel: deployed production state and runtime evidence.

## Contract

`scripts/ai/sfi-chatgpt-plus-observe.sql` is the canonical compact observation query.

It is a projection only. It creates no table, no writer and no second source of truth. It does not expose or query password, OAuth-secret, token, raw-media or private binary tables.

The query returns enough high-signal state to decide what must be inspected next. Detailed work must drill down to the original canonical row/event rather than treating the compact snapshot as the evidence itself.

## Operating rule

For substantive SFI work from ChatGPT:

1. Read/execute the canonical observation query against the connected SFI Supabase project.
2. Inspect referenced canonical rows when the decision depends on them.
3. Contrast repository state from `Aptymok/system-friction` `main`.
4. Contrast latest production deployment/runtime state in Vercel when implementation or production behavior matters.
5. Keep `implemented`, `merged`, `deployed`, `observed` and `RETURN` distinct.
6. Use existing governed execution owners for mutations. Observation itself grants no authority.

## Commercial boundary

SFI remains a standalone product and API. ChatGPT is one possible client, not a requirement. A customer should not need a specific ChatGPT subscription for SFI itself to be useful or purchasable.

## Falsification

This approach fails if the connected providers cannot retrieve the canonical state needed for a decision, if it silently becomes a second persistence owner, or if SFI starts depending on ChatGPT-specific product availability for core operation.
