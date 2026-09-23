# SFI PRECHECK — bounded Method Lab contract repair

- Owner: existing Method Lab gateway, research projection and authenticated MCP projection.
- Existing capability inspected: external Lab POST, runMethodLabSimulation, persistedEvidenceResolver, contracts, researchObjects, manifest, LabRequest and MCP gateway body forwarding.
- Absorb vs create decision: repair existing contracts/route/tests. No new provider, agent, grant, writer, runtime or DB object.
- Authoritative writer: existing appendEpistemicEvent and simulation writer, unchanged.
- Persistence/lineage impact: normalize previously advertised researchMetadata into canonical metadata before fingerprint/write; preserve existing commandId conflicts. No historical backfill or overwrite is performed.
- Front delta: NONE.
- Back delta: accurate run discovery/error contract, fail-closed malformed/conflicting metadata, preserve advertised metadata alias.
- DB delta: NONE.
- Redundancy removed: no duplicate subsystem introduced; alias is backward compatibility for the published manifest and is deprecated in favor of metadata.
- Execution/ROOT boundary: existing lab:read/write/run and tenant/OAuth boundaries retained. Simulations remain SIMULATED; no automatic promotion, no canary charges.
- Rollback: revert code; original event data remains.
- Verification: behavior tests send published manifest/OpenAPI examples through actual MCP request projection and actual Lab route, exercise metadata persistence and actual research read projection against in-memory storage; relevant QA, typecheck, full CI/build.

Observed code defects: lab-run manifest declares only operation despite protocolId/evidenceIds requirements; lab-persist advertises researchMetadata while writer reads only metadata. Run currently supports two simulation protocols, not every protocol in the Lab registry. Evidence IDs refer to existing root_evidence_entries or sfi_evidence_ledger rows; an epistemic event ID is not automatically a valid Lab evidence ID. Runs are not idempotent and commandId applies only to persist. Historical Reality Chain reconstruction/backfill is outside this bounded repair until its actual persisted source is read.
