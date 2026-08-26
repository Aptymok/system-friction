# GitHub ↔ SFI Method Lab Bridge

This directory is a command surface for the governed bridge between GitHub Actions and the System Friction Institute Method Lab.

A JSON file committed under `lab-bridge/commands/` triggers `.github/workflows/sfi-github-lab-bridge.yml`. The workflow sends the command to `/api/external/v1/lab` using the repository secret `SFI_LAB_BRIDGE_TOKEN` and stores the response plus provenance as a GitHub Actions artifact.

Required GitHub Actions secrets:

- `SFI_LAB_BRIDGE_TOKEN`: bearer token also configured in SFI `SFI_EXTERNAL_API_KEYS_JSON`.
- `SFI_LAB_BRIDGE_BASE_URL`: optional; defaults to `https://systemfriction.org`.

Recommended delegated credential in SFI:

```json
{
  "replace-with-long-random-token": {
    "label": "ChatGPT GitHub Lab",
    "role": "root_delegate",
    "actorId": "external:chatgpt-github-lab",
    "scopes": ["lab:read", "lab:write", "lab:run", "observe", "propose", "execute"]
  }
}
```

`root_delegate` is required only for `operation: "run"`. It does not grant proposal self-approval or canonical promotion. Runtime commands also require `confirm: true` and persisted evidence IDs.

## Core commands

```json
{"operation":"state"}
```

```json
{"operation":"report"}
```

```json
{
  "operation":"persist",
  "commandId":"github-lab-note-001",
  "title":"Observed implementation advance",
  "content":"Plain-language laboratory note to persist in the epistemic event ledger.",
  "source":"github_lab_bridge",
  "refs":["commit:abc123"]
}
```

```json
{
  "operation":"run",
  "protocolId":"sociotechnical_simulation",
  "evidenceIds":["persisted-evidence-uuid"],
  "parameters":{},
  "cognitiveSpineContextRefs":[],
  "confirm":true
}
```

## Research objects / audits

Method Lab is the source of truth for active audits, research objects, findings, returns and publication candidates. The Research Hub is not edited on every observation. Hub mutation occurs only after a governed promotion.

ChatGPT, Gemini and Claude use the existing `persist` command with structured metadata:

```json
{
  "operation":"persist",
  "commandId":"research:SFI-AUDIT-0002:v0.1.0",
  "title":"Research object snapshot",
  "content":"Bounded update for the current Method Lab object.",
  "source":"external_agent",
  "refs":["evidence:uuid-1","evidence:uuid-2"],
  "metadata":{
    "kind":"METHOD_LAB_RESEARCH_OBJECT",
    "researchObject":{
      "objectId":"SFI-AUDIT-0002",
      "objectClass":"AUDIT",
      "title":"Internal bounded title",
      "publicTitle":"Public-safe title",
      "objective":"What is being observed and why",
      "method":"SFI_AUDIT",
      "state":"FINDINGS_REGISTERED",
      "epistemicState":"MIXED",
      "returnState":"PENDING",
      "publicationState":"PUBLIC_DERIVATIVE_READY",
      "summary":"Internal summary",
      "publicSummary":"Public-safe summary",
      "confidence":0.9,
      "evidenceRefs":["evidence:uuid-1"],
      "findings":[],
      "publicFindings":[],
      "metrics":{},
      "publicMetrics":{},
      "limitations":[],
      "publicLimitations":[],
      "lineage":["SOURCE","TRANSFORM","METHOD_LAB"],
      "version":"0.1.0"
    }
  }
}
```

Each meaningful version uses a new `commandId`; retries of the same semantic snapshot reuse the same `commandId` and remain idempotent.

To read all current research objects:

```json
{"operation":"state"}
```

To generate the current review/publication package for one object:

```json
{"operation":"report","objectId":"SFI-AUDIT-0001"}
```

The response contains a deterministic public-safe package (`README.md`, `FINDINGS.md`, `PUBLIC_TRACE.md`, metrics, hashed provenance, threats to validity and manifest) but does **not** mutate GitHub or Zenodo. Public packages are rendered only from `publicTitle`, `publicSummary`, `publicFindings`, `publicMetrics` and `publicLimitations`; internal evidence references never cross the publication boundary.

## Promotion boundary

The expected lifecycle is:

```text
external object
  → Method Lab evidence / research object snapshots
  → findings / intervention / return
  → PUBLIC_DERIVATIVE_READY
  → ROOT promotion proposal
  → ROOT accept/reject
  → authorized external agent transports exact package to SFI-RESEARCH-HUB
  → optional release candidate
  → deliberate Zenodo/DOI release
```

No model, bridge or agent may self-promote a research object. Raw restricted institutional evidence is never included in the public package.

The bridge is append/audit oriented. GitHub does not receive direct database credentials. SFI remains the persistence authority and every runtime result keeps the Method Lab epistemic boundary (`SIMULATED` until contrasted with observed return).
