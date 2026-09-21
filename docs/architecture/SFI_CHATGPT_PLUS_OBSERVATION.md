# SFI ↔ ChatGPT Plus Observation Plane

Status: implemented as a read-only query over existing canonical persistence owners.

## Why this exists

Full custom MCP inside ChatGPT is not a viable baseline dependency for SFI because plan availability can gate installation. SFI therefore does not depend on ChatGPT MCP for institutional observation.

For the founder's current ChatGPT account, the practical bridge is the already-connected standard providers:

- Supabase: primary/canonical persisted institutional state when available.
- Neon: continuity/second-read plane and bounded continuity-write fallback where already authorized.
- GitHub: canonical implementation state, PRs, releases and code lineage.
- Vercel: deployed production state and runtime evidence.

## Contract

`scripts/ai/sfi-chatgpt-plus-observe.sql` is the canonical compact observation query.

It is a projection only. It creates no table, no writer and no second source of truth. It does not expose or query password, OAuth-secret, token, raw-media or private binary tables.

The query returns enough high-signal state to decide what must be inspected next. Detailed work must drill down to the original canonical row/event rather than treating the compact snapshot as the evidence itself.

## Operating rule

For substantive SFI work from ChatGPT:

1. Execute the canonical observation query independently against connected SFI Supabase and Neon when both are available.
2. Compare the two snapshots before interpreting freshness. A divergence is itself OBSERVED state and must be explained by owner semantics; never choose a database merely because one timestamp is newer.
3. Supabase remains primary/canonical when available. Neon may be fresher specifically in continuity where bounded fallback writes are already authorized. Other domains must retain their existing owner rules.
4. Inspect referenced canonical rows when the decision depends on detail.
5. Contrast repository state from `Aptymok/system-friction` `main`.
6. Contrast latest production deployment/runtime state in Vercel when implementation or production behavior matters.
7. Keep `implemented`, `merged`, `deployed`, `observed` and `RETURN` distinct.
8. Use existing governed execution owners for mutations. Observation itself grants no authority.

## Commercial boundary

SFI remains a standalone product and API. ChatGPT is one possible client, not a requirement. A customer should not need a specific ChatGPT subscription for SFI itself to be useful or purchasable.

## Falsification

This approach fails if the connected providers cannot retrieve the canonical state needed for a decision, if it silently becomes a second persistence owner, or if SFI starts depending on ChatGPT-specific product availability for core operation.

## First live falsification / validation

On 2026-09-21 the same query was executed against both planes. Proposals, Cases, `epistemic_events` (888 / max sequence 888) and Cognitive Twin runs (63) matched. Supabase continuity remained at the 2026-09-17 heartbeat, while Neon continuity showed a successful 2026-09-21 heartbeat with 148 continuity runs. This demonstrates why cross-plane comparison is required and why freshness cannot be treated as a global authority rule.
