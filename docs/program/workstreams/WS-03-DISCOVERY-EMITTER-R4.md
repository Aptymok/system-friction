# WS-03 · Discovery Emitter · R4

Parent: #408 / #413 / #389

This bounded slice absorbs the existing canonical object registry, identity owner, sitemap, AI index, public MCP and `sfi_external_representations` persistence owner. It adds one deterministic emission projection for publicable canonical objects and exposes RSS, Atom and JSON Feed representations without creating a second canon.

## Boundaries

- canonical authority remains `SFI-CANONICAL-OBJECT-1.0`;
- external representation != canon;
- only objects already passing canonical publicability are emitted;
- emission receipts persist as `READY`, never fabricated `PUBLISHED`;
- IndexNow remains `NOT_CONFIGURED` until a key and governed external execution are present;
- IndexNow absence/failure cannot unpublish a canonical object;
- public MCP remains WS-04-owned and is referenced, not reimplemented;
- no private/ROOT object is emitted into public feeds.

## Surfaces

- `/feed.xml` — RSS 2.0;
- `/feed.atom` — Atom;
- `/feed.json` — JSON Feed 1.1;
- existing `/sitemap.xml` now consumes the shared emitter projection for canonical objects;
- existing `/ai-index.json` exposes the same discovery machine-resource map;
- ROOT-only `POST /api/root/discovery/emission` persists an idempotent `READY` representation receipt in existing `sfi_external_representations`.

## Falsification

FAIL if a blocked/private canonical object appears in a feed, if feeds redefine canonical identity, if a receipt is persisted as externally published without observation, if IndexNow absence changes publication state, if a duplicate canonical/persistence owner is introduced, or if emitted object identity differs across sitemap/feed/AI/MCP projections.
