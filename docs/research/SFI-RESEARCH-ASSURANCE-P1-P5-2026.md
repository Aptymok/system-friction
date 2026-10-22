# SFI Research Assurance — P1–P5 Contract (implementation slice)

**Status:** PROPOSED · branch-bound · no certification issued · no publication executed

## Ownership and scope

The **existing Method Lab** remains owner of research objects and the existing publication-package builder. `src/lib/method-lab/researchAssurance.ts` implements a **pure, deterministic, read-only assurance preview**, available through the existing OAuth `operateSfiLab({operation:"report",objectId})` response as `researchAssurance`. No new database, queue, registry, second writer, automation, endpoint or institutional actor is created.

Its return value is **an eligibility preview for governed review**, not a certificate. All approval, privileged promotion and transport operations remain under existing ROOT/ACP controls. The package's files, hashes, schema and `packageHash` remain unchanged.

## Phased SFI P1–P5

| Phase | Implemented here | Still needed to advance |
|---|---|---|
| **P1 Methodological/structural evaluation** | Check exact object identity/version, package metadata, public derivative state, nonempty method/objective/summary, at least one recorded evidence reference, public findings and limitations | Independent verification of referenced primary evidence; source permission checks; recomputation of all hashes by the receiving verifier and end-to-end lineage integrity after P0 |
| **P2 Adversarial evaluation** | Deterministic fail-closed epistemic tests: classification of public findings; untested work may not claim verified RETURN; avoid inferring peer review from external-agent source | Pre-registered domain-specific rival hypotheses, blind method reviewer, counterexample tests, measurable false-positive/negative assessments |
| **P3 Research-assurance certificate** | Fixed result `NOT_CERTIFIED`; highlights missing independent reviewer, credentials and certification controls | Authorized institutional certification charter; named independent methodological reviewer; cryptographic signing, immutable certificate receipt, public status lookup/revocation and version-bound record |
| **P4 Delegated authority** | Fixed `NOT_GRANTED`; report read does not expand OAuth scopes or transition a proposal | ROOT-approved delegation policy with controls and periodic audit. No autonomous ability to grant ROOT, bypass ACL, sign certificates or promote canon |
| **P5 Publication and external RETURN** | Fixed `NOT_PUBLISHED_BY_ASSESSMENT`; explicit public limits and guardrail wording | Exact-version signed promotion, separately attested external transport (Hub/Zenodo if appropriate), independent replication, citation/access measurement, RETURN and correction log |

## External pilot candidate

Existing `SFI-AUDIT-0001` was read from authenticated Method Lab, **not published** as part of this slice. As observed 2026-10-22, it has `PUBLIC_DERIVATIVE_READY`, version `1.0.1`, six public findings, three evidence references and four public limitations; `returnState=PENDING`. Its package hash from the **existing** builder is `0e11ffa84cd3ff1cd01033fe4847b09ce7f741afd989b7ca7ade3df52def5b0c`. This is a candidate for methodological review, **not** for unattended certification or deployment.

The package explicitly does not include restricted raw records, does not establish contractual liability, does not validate System Friction Theory, and still lacks a post-intervention RETURN. No client or independent reproducer certification was received.

## Operation in SFI

1. The authorized user reads an object through `operateSfiLab(report)`.
2. Method Lab returns existing `researchObject`, `publicationPackage`, `researchPassportPreview`, and new `researchAssurance`.
3. If `eligibleForGovernedReview=false`, the requester corrects the underlying method/evidence or public derivative **via the existing authorized writer**. No automatic mutation follows the read.
4. If `eligibleForGovernedReview=true`, a separate investigator reviews source adequacy, permissions, adversarial protocol, data-plane health and independence. This does not certify automatically.
5. Only an already-authorized sovereign actor may request promotion of an exact `PUBLIC_DERIVATIVE_READY` version and hash, through the **existing** research hub promotion route; an independent governance decision and exact-package transport follow.
6. Subsequent third-party replication/critique becomes an externally evidenced RETURN, not an automatic AI-generated truth label.

## Falsification and stop conditions

- Any missing/malformed hash, version mismatch, PRIVATE status, public findings without support or missing public limitations is a negative eligibility result.
- `NOT_TESTED` + `VERIFIED` RETURN is rejected as an epistemic contradiction.
- The gate must not expose private source reference values or raw private object summaries in its own response.
- Missing reviewer, absent signer, P0 data-plane mismatch or absent attested publication cannot be converted into a positive certificate state by label-only code changes.

## SFI PRECHECK

- **Owner:** Method Lab existing researchObjects + gateway report owner.
- **Existing capability inspected:** `buildMethodLabPublicationPackage()`, `readMethodLabResearchState()`, `operateSfiLab(report)`, `promote` access conditions, `externalLabRoute.test.ts`, ROOT capability map and 33 research object inventory.
- **Absorb vs create decision:** Add one pure read-only evaluator to Method Lab and reuse existing report; no separate service or registry.
- **Authoritative writer:** Unchanged `appendEpistemicEvent` and existing governed proposal/transport; evaluator performs no writes.
- **Persistence/lineage impact:** None; output derived at read time from existing object and package hash.
- **Front delta:** None.
- **Back delta:** One pure evaluator, one additive report field.
- **DB delta:** None.
- **Redundancy removed:** No parallel package builder or new promotion pipeline introduced.
- **Execution/ROOT boundary:** Read-only; P3–P5 remain disabled and governed.
- **Rollback:** Revert branch/PR; original package output and hash unchanged.
- **Verification:** `node --import tsx --test src/lib/method-lab/researchAssurance.test.ts src/lib/method-lab/externalLabRoute.test.ts`, TypeScript check, existing Method Lab/Root QA and production read-only report after approved deployment. **Do not claim test PASS before actual CI receipt.**
