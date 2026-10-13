# MIHM-EXP-001 — G2b: pre-CI evidence chronology

**Parent:** SFI-MIHM-FOUNDATION-001. **Earlier gate:** PR #741 G2a GitHub source audit.
**Classification:** EXPLORATORY / NOT_FROZEN / NOT_VALIDATED.

G2a inspects the current final head of closed PRs; this is **not** the historical snapshot that existed when a PR first opened. G2b therefore enumerates historical commits for each sampled PR and places **T0 at the creation time of the first qualifying CI run for that specific commit and workflow**.

The immutable commit SHA and file-change statistics become candidate pre-outcome features. The workflow conclusion, later PR head, merge result, and outcome remain strictly outside the input features. GitHub CI creation is a timestamp proxy, not proof of when a human knew about a change. Git commit declared timestamps are not authenticated push receipts.

The collector uses GitHub PR commit metadata and Actions run metadata only. It does not fetch raw code, logs, PR comments, secrets or production DB records. Sampling is limited (CI default: five closed PRs, up to ten commits per PR) and may be biased by selecting already-closed PRs. Capped GitHub API pagination, incomplete source timelines and unknown events must be identified; they are not treated as zero, success, or evidence of absence. Prior same-SHA run outcomes are a deliberately narrow subset, **not the complete repository CI history**.

**Verification:** `node --test scripts/research/mihm-exp001-timezero.test.mjs`.
**Read-only run:** `GITHUB_TOKEN=... node scripts/research/mihm-exp001-timezero.mjs > audit.json`.

**No impact:** no MIHM canonical Phi change, no MIHM-T upgrade, no new Method Lab writer, no database or ROOT action, no Reality Passport promotion, no registered RETURN, no deployment change, and no claim of validated forecasts.

**Next scientific gate:** inspect actual artifact for eligible chronology, source vintage and missingness. Then choose a precommitted CI target and horizon, construct competent matched conventional M0 and MIHM relation ablation on an exploratory development split, quantify verification cost, and freeze independent prospective holdout rules before confirmatory testing. Null/contradictory results and abstentions must be preserved.