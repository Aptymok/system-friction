# Vercel Cost Gate Receipt

Observed trigger: Vercel Git integration reached the daily deployment limit after more than 100 deployment attempts during active FULL REMAKE development.

Bounded repair: set `vercel.json` `git.deploymentEnabled` to boolean `false`, preserving the separately controlled explicit production workflow.

Expected effect: ordinary branch/PR/main Git events no longer intentionally create Vercel deployments; GitHub CI remains the implementation/assurance plane. Production deployment remains explicit and should occur only when production observation is necessary for RETURN.

Verification owner: SFI-08 / release assurance.
