# ROOT action contracts

All available mutations require explicit client confirmation and server ROOT authentication.

| Action | Contract | Persistence / result rule |
|---|---|---|
| Daily/reports/audit/all sync | `POST /api/root/operational/trigger-observation?job=...` | Shows the complete returned per-agent object; partial errors remain visible |
| Record evidence | `POST /api/root/evidence` | Persists evidence, epistemic event, canonical graph node, mutation and audit |
| Close mutation | `POST /api/root/mutations/:id/close` | Requires selected mutation; persists closed state and audit |
| Search AMV | `POST /api/root/agentic/amv`, operation `search` | Read operation, no confirmation required |
| Ingest AMV | same route, operation `ingest` | Persists `sfi_amv_memory`, labels it declared/unverified and audits |
| Query graph | `POST /api/root/agentic/neural-graph` | Read/query operation; shows trace and missing context |
| Generate report | `POST /api/root/agentic/report` | Result may be generated/persisted; UI never implies external publication |
| Approve ScoreFriction draft | `POST /api/root/predictions/approve` | Partial capability: exact valid draft and human probability 0–1 required |
| Confirm ACP presence | `POST /api/governance/acp-seen` | Persists presence and ROOT audit |

Social simulation is gated because no persisted simulation-run contract with scenario, parameters, status, result and evidence was found. It has no execution button.

Client Finder and Name Scout remain protected API capabilities but are outside the seven-module final navigation.
