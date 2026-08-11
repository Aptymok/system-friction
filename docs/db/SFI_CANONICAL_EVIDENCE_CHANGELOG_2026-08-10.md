# SFI Canonical Evidence Graph Changelog — 2026-08-10

This change removes a structural ambiguity in ROOT: persistence rows are no longer treated as independent epistemic objects merely because they live in different tables.

Implemented scope:

- canonical evidence identity by hash;
- rebuildable graph projection;
- module/case context nodes instead of storage-surface nodes;
- explicit graph health when relations are missing;
- canonical evidence counting in ROOT institutional interpretation;
- actual Cognitive Twin state in the Cognitive Twin panel;
- qualified legacy prediction display;
- reconciliation audit metadata;
- focused invariant tests and QA documentation.

No source evidence is deleted by this code change.
