# SFI Notas Temporales — visual binding closure

State: implementation candidate.

The repository-backed cover `/images/editorial/notas-temporales-septiembre-2026.webp` is bound to `SFI-PUB-NT-001`.

The repository-backed cover `/images/editorial/notas-de-caso.webp` is bound to `SFI-PUB-OBS-013` (KAVAK / ESTADO / AUTORIDAD / EJECUCIÓN) as the current Case visual class.

These bindings alter presentation/discovery metadata only. They do not promote evidence, create RETURN, modify publication authority, or make the identified PDF rendition public.

The monthly Notas Temporales routine persists its candidate through the canonical `persistWorldVectorReport` writer. A cycleless report (`cycle_id = null`) is admitted only for `temporal_issue_monthly`; other World Vector report types still require a real cycle. The routine does not create an alternate report persistence owner.

Method Lab composition is institutional-only. Because the monthly routine uses the service client, it explicitly constrains `sfi_lab_analyses.owner_id IS NULL` before any analysis is supplied to Signal Vane, Cluster Atlas, or the repository-targeted candidate. Personal owner-scoped analyses are outside this editorial boundary.
