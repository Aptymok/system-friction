# 07 · Evidence and Provenance

**Status:** CANONICAL  
**Version:** 2026-08-06.evidence.v1

Evidence is an identified record capable of supporting or challenging a claim. Each evidence item must preserve source, acquisition method, observed time, ingestion time, owner or scope, content hash when available, and lineage.

Evidence strength is separate from epistemic class. A declared statement may be weak or strong as testimony but remains `DECLARED`. A deterministic calculation may be exact but remains `DERIVED`.

No interface, agent or migration may fabricate evidence IDs, dates, sources or relationships. Missing evidence is represented as a request or blocker.

Derived and inferred outputs must list the evidence and variable instances used. Simulations must list their source dataset, scenario assumptions, seed and model version.

A source may be superseded but not erased from lineage. Corrections append a new version and relation to the corrected record.

Public views expose only authorized summaries. Private evidence remains accessible according to ownership, RLS and governance rules. Redaction must preserve the existence and identity of the evidence relationship without leaking protected content.