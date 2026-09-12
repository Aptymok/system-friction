# SFI DATAHISTORY — 2026-09-12 canonical database cleanup

This entry records the complete pre-cleanup database state requested by the Founder before canonical persistence reset run `34675397416`.

## Snapshot identity

- Created: `2026-09-12T05:23:23.133Z`
- Source Git commit: `6412ca60b9a4fc6302878834224c48fcf453de9a`
- Original full snapshot: `SFI_DB_SNAPSHOT_20260912T052323Z_6412ca60b9a4.zip`
- Original full snapshot SHA-256: `c42910b64abf28186477eb28d6df0fa47274f70bf7e446c4f24eb56490f04e76`
- Original full snapshot size: `6,399,170` bytes
- Snapshot contains: full PostgreSQL custom-format `database.dump`, `schema.sql`, public-table inventory, reset classification, manifest and internal SHA-256 checksums.
- GitHub Actions run: `34675397416`
- Full pre-reset proof artifact: `10292027350`
- Proof artifact digest: `sha256:e68273d5b62b69d5e9d2902c478125a1c0c5cb6ee1d5f254626ebdcc7e39fcb9`
- Post-reset genesis artifact: `10291743393`
- Post-reset artifact digest: `sha256:78812aee033798bfd4f149351306dd23261ec2c5bd71126c0ef168192f2ebe3a`

## Why the reset was performed

SFI persistence had accumulated development-generated telemetry, cognitive/runtime traces, QA/check data, Studio history and other implementation residue. The Founder directed that the database be backed up first and then cleaned so ongoing persistence represents real observations, hypotheses, evidence and institutional use rather than the history of developing SFI itself.

The reset preserves the complete longitudinal World plane and World Vector trajectory. Minimal identity/account/OAuth/continuity state and production-eligible instruments are deterministically reseeded so the system remains operable.

## Exact preserved World state before and after reset

| Table | Rows before | Rows after |
|---|---:|---:|
| `world_source_observations` | 6326 | 6326 |
| `world_friction_readings` | 6460 | 6460 |
| `world_hypotheses` | 303 | 303 |
| `world_hypothesis_outcomes` | 299 | 299 |
| `world_learning_events` | 278 | 278 |
| `worldspect_snapshots` | 322 | 322 |
| `world_vector_cycles` | 11 | 11 |
| `world_vector_observations` | 62 | 62 |
| `world_vector_reports` | 22 | 22 |
| `world_vector_alerts` | 0 | 0 |

Notable development/runtime residue immediately before cleanup included `epistemic_events` (3,221 rows) and `sfi_amv_memory` (2,889 rows). They were removed under `PURGE_DATA` and were not restored.

## Post-reset verified examples

- `epistemic_events`: `0`
- `sfi_amv_memory`: `0`
- `sfi_capability_health_checks`: `0`
- `sfi_cognitive_twin_runs`: `0`
- `sfi_continuity_runs`: `0`
- `studio_objects`: `0`
- `studio_evidence_traces`: `0`
- `studio_archive_events`: `0`
- `field_cases`: `0`
- `field_case_evidence`: `0`
- `prospect_research_sources`: `0`
- `root_evidence_entries`: `0`

## Recovery and confidentiality

The full snapshot contains authentication/private/internal material, so it is not committed in plaintext to this public repository. The exact full snapshot is preserved as the GitHub Actions evidence artifact identified above. A separately exported encrypted copy was produced using CMS/AES-256 with the public recipient certificate at `docs/db/SFI_DATAHISTORY_ARCHIVE_RECIPIENT_CERT.pem`; the matching private recovery key is deliberately not stored in GitHub.

The original snapshot SHA-256 above is the canonical integrity check for any recovered copy.
