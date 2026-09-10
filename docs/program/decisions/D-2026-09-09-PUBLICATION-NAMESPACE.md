# D-2026-09-09 · Canonical PUBLICATION namespace

Status: ACCEPTED ON SFI-00 MERGE  
Authority: SFI-00 · CONTROL ROOM  
Parent: #415 / #405 / #389  
Implementation owner: SFI-05 consuming the WS-03 canonical URL owner  
Assurance: SFI-08

## CONTRACT

`SFI-CANONICAL-NAMESPACE-1.0` extending the URL semantics of `SFI-CANONICAL-OBJECT-1.0` without creating a second canonical-object owner.

## CURRENT RULE

Before this decision, `PUBLICATION`, `REPORT` and `PAPER` all resolved through the single canonical URL owner to `/research/[slug]`.

## OBSERVED LIMITATION

`PUBLICATION` is already a distinct canonical object type and `SFI_PUBLICATION_MESH` had explicitly reserved `/publications`, but the authoritative URL resolver still aliased publication objects to the report/paper research namespace. Leaving that split unresolved would force future editorial work either to overload `/research` or to create a second route/URL resolver, violating the reuse-before-build and single-owner invariants.

## PROPOSED DELTA

- `PUBLICATION` resolves to `/publications/[slug]`.
- `REPORT` and `PAPER` remain at `/research/[slug]`.
- `canonicalNamespaceFor()` becomes the exported namespace resolver owned by `src/lib/discovery/canonicalObjectRegistry.ts`.
- `canonicalUrlFor()` continues to be the only canonical URL constructor and consumes that resolver.
- Discovery's publication mesh consumes the namespace owner instead of repeating `/publications` as a second semantic source.
- Editorial kind, series and issue remain dimensions beneath the single `PUBLICATION` object type; they do not become new canonical object types.

## WHY ABSORB CANNOT SOLVE IT

Absorption is the solution: the existing canonical object registry remains the owner and is extended with an exported namespace resolver. What cannot solve the limitation is leaving the old `/research` mapping in place while introducing `/publications` in a second component, because that would create competing canonical URL semantics.

## AFFECTED WORKSTREAMS

- WS-03 · Canonical Object Registry / Discovery Mesh: authoritative URL and machine projections.
- WS-05 · Research Graph: publication/citation landing-page semantics.
- WS-04 · Public MCP: consumes canonical projections; no independent namespace owner is added.
- SFI-00 · Contract Lock and integration authority.

## MIGRATION IMPACT

At baseline `a419b5463d8d4149487012abbb280ee10f690783`, `SFI_CANONICAL_OBJECT_REGISTRY` is empty. Therefore no registered canonical `PUBLICATION` URL is rewritten by this decision, no persisted object migration is required, and no legacy redirect is justified.

No database table, migration, persistence writer or external representation receipt owner changes.

## AUTHORITY IMPACT

None. URL namespace selection does not grant publication, external execution, irreversible mutation or CANON authority. Publication still requires the existing explicit privacy, rights, governance, security, lineage and evidence-identity gates.

## EPISTEMIC IMPACT

None. A canonical URL namespace does not change epistemic state, publication state, evidence admission, DOI state, external validation, Discovery, PULL or RETURN.

## BACKWARD COMPATIBILITY

`REPORT` and `PAPER` canonical URLs are unchanged. No compatibility redirect is created for `PUBLICATION` because no pre-existing registered canonical publication object exists at the decision baseline. If future evidence establishes a genuinely published legacy canonical URL, compatibility must be handled through a new observed migration decision rather than a synthetic redirect.

## ROLLBACK

Before any `PUBLICATION` object is registered, revert the SFI-00 merge and restore the previous namespace mapping. After a real publication object exists, rollback requires an explicit migration review preserving canonical identity and external representation lineage; blind URL rewriting or redirect creation is forbidden.

## VERIFICATION

The named `SFI canonical publication namespace gate` must prove on exact head that:

1. `PUBLICATION -> /publications`;
2. `REPORT/PAPER -> /research`;
3. the publication mesh consumes the canonical namespace owner;
4. the Contract Lock states the same mapping;
5. no runtime redirect is manufactured;
6. no authority or epistemic state is changed by the namespace operation.

`MERGED != DEPLOYED != OBSERVED_IN_PRODUCTION != RETURN_PASS` remains binding.
