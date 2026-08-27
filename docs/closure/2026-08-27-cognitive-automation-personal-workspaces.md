# Cognitive automation + personal workspaces closure

Status: implementation candidate awaiting CI, merge, production migration and deployment.

This closure converges the cognitive runtime onto `runtimeAgentExecutor -> agentExecutionMap`, removes the superseded parallel loader/dispatcher/kernel chain, makes cognitive roles event-triggered bounded automations selected by the MetaOrchestrator, and introduces owner-scoped personal Cognitive/Lab execution for normal authenticated accounts.

Normal accounts do not gain SFI institutional membership, proposal authority, ROOT access, sovereign actions or canonical promotion. OAuth personal tenants are `user:<subject_id>` and are route-bound to owner-scoped Cognitive, Personal Lab and Studio APIs. Institutional Method Lab, governance proposal/execution and canonical promotion remain separate.

ACP proposal reads use identity/root-view authorization rather than the governance-health gate so degraded/blind governance cannot hide the recovery queue. Proposal mutations remain governed in their dedicated routes.

Production migration `20260827113000_personal_cognitive_workspace_ownership.sql` must be applied only after the code is merged. The migration adds owner boundaries for personal cognitive/lab persistence while leaving pre-existing institutional rows unowned (`owner_id IS NULL`) until explicitly classified.

PR #298 carries the canonical `SFI PRECHECK`: this integration absorbs into the existing OAuth gateway, `runtimeAgentExecutor` and canonical institutional writers; it does not create a second proposal/intervention/execution/return/lesson circuit. The separate causal-loop closure must build on those writers after this integration reaches `main`.
