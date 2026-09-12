# SFI Notas Temporales — visual binding closure

State: implementation candidate.

The repository-backed cover `/images/editorial/notas-temporales-septiembre-2026.webp` is bound to `SFI-PUB-NT-001`.

The repository-backed cover `/images/editorial/notas-de-caso.webp` is bound to `SFI-PUB-OBS-013` (KAVAK / ESTADO / AUTORIDAD / EJECUCIÓN) as the current Case visual class.

These bindings alter presentation/discovery metadata only. They do not promote evidence, create RETURN, modify publication authority, or make the identified PDF rendition public.

The monthly Notas Temporales routine persists its candidate through the canonical `persistWorldVectorReport` writer. Monthly candidates intentionally remain cycleless (`cycle_id = null`) unless a real World Vector cycle is supplied by the caller. The routine does not create an alternate report persistence owner.
