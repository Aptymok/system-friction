# KXTXR — T0/T1 read-only baseline, 24 October 2026

## Verified source boundaries

- **Canonical plan source** (read-only Drive): `SFI_KXTXR_90D_MASTER.json`, version **1.1.0**, Drive file ID `1WmGirr_AeMwMkCNlkOBZLxsjaKul9QO-`, 486398 bytes, SHA-256 `71dd2895430a1c3f92f6e265b9318103e5c413a5659e69438d289d3c1627fc06` for the bytes examined.
- **Case**: SFI_ROOT returned `OPEN`, admission `GATED`, `rootAddressable=false`, two existing `RECORD` objects, `readyForAnalysis=false`; the case's existing stored cutoff is **2026-10-23**. Nothing was added or reclassified.
- **T0**: 2026-10-20 (plan begins). **T1**: 2026-10-23 (case cutoff). These are a sourced planning baseline and an as-of *preview*, **not** world-observed certification.
- **Master counts**: 90 day records; 57 `NO_PUBLICATION`; 33 `DRAFT_UNTIL_ALL_GATES_PASS`. At the case's cutoff, four days had elapsed and 86 were future. None of those four days required an Instagram publication.
- **Day 02** 2026-10-21: master declares a `QUE NO` carousel draft; two JPEGs were independently found through read-only Google Drive metadata: FRACTURA `1OyDcRbl2os2g8lWVKS9yScO9BwGfBLKM` (566217 bytes) and LUNAR `1TOGAplhkTN7TTDYRKKGWVjxqB1klrPQO` (552964 bytes). Metadata proves file existence only. No artist approval, platform publication, campaign outcomes, or RETURN are verified.

## Executable offline adapter

`scripts/reality_chain/kxtxr_manifest_preview.py` validates the canonical manifest, preserves exact 90-day dates, accepts an **explicit** T1 cutoff, computes the input SHA-256, and returns a minimal lineaged timeline with states that separate `NOT_DUE`, `NO_PUBLICATION_PLANNED_ACTIVITY_UNVERIFIED`, `SOURCE_DECLARED_DRAFT_NO_PUBLICATION_RECEIPT`, and `UNKNOWN_NO_PLATFORM_COVERAGE`. It is **read-only**; it cannot create a SOURCE, EVIDENCE, case object, report, approval, publication or institutional Passport.

Usage with a separately authorized downloaded source:

```bash
python3 scripts/reality_chain/kxtxr_manifest_preview.py \
  --manifest /private/path/SFI_KXTXR_90D_MASTER.json \
  --source-id 1WmGirr_AeMwMkCNlkOBZLxsjaKul9QO- \
  --case-id YOUR_AUTHORIZED_CASE_UUID \
  --as-of-date 2026-10-23 \
  --output /private/path/kxtxr_t0_t1_preview.json
```

Test coverage is entirely synthetic and does **not** embed the original KXTXR document in the GitHub repository. `test_kxtxr_manifest_preview.py` rejects wrong calendars, conflicting draft receipts, unfounded publication claims, and accidental mixing of the case cutoff with today's date.

## Remaining authoritative gates

1. The manifest and source inventory must be admitted through the existing user-bound Case Platform authorization; a Drive URL is not admitted EVIDENCE.
2. Retrieve independent social platform publication/coverage receipts before classifying posting execution or absence; a draft is not publication. Edwing retains routine artistic publication authority.
3. Validate production data-plane parity, pending migrations and case write/report/Passport readback; do not deploy on the strength of offline preview alone.
4. Reconstruct observed execution geometry and RETURN only after actual receipts, not from a calendar or source declaration.

This file is a read-only engineering observation. There are no silent changes to the 90-day plan, consent, case status, production data, ROOT authority, or Discovery 800.
