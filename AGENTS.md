# SFI agent/developer preflight

Before changing code in this repository:

1. Read `docs/architecture/IA_CANONICAL_SURFACES_2026-08-12.md`.
2. Observe the current implementation and reuse/absorb existing capabilities before creating files, routes, writers, registries, agents, schedulers or database objects.
3. Identify the canonical owner surface/capability and the authoritative writer for every institutional object you touch.
4. Preserve identity, provenance, epistemic class, time, lineage and authorization. Missing data stays missing.
5. Do not turn visual lenses (`systems`, `archive`, `falsification`, `optionality`, `governance`, `authority`, `agents`, `identity`, `models`, `genai`) into independent bounded contexts.
6. Do not leave a duplicate runtime implementation after absorption/replacement. Git history is the archive.
7. Do not claim execution without proposal-scoped observed RETURN/evidence. Do not promote canon automatically.
8. Minimize human mechanical intervention: governed agents may route/assign/execute/retry within authorized scope; ROOT observes authority boundaries and decides only when a real decision is required.
9. Cognitive Spine already exists under `src/core/cognitive-spine` with institutional adapters/status/QA. Cognitive Twin exists under `src/core/cognitive-twin`. Inspect both and their adapter boundary before adding anything named Twin, Spine, memory, context or cognition; never create a second implementation because of naming or visualization.
10. Before merge run the canonical architecture audit, domain boundaries, relevant capability QA, typecheck and build.

Required implementation note before coding:

- Owner:
- Existing capability inspected:
- Absorb vs create decision:
- Authoritative writer:
- Persistence/lineage impact:
- Front delta:
- Back delta:
- DB delta:
- Redundancy removed:
- Execution/ROOT boundary:
- Rollback:
- Verification:

If these fields cannot be answered, do not implement yet.
