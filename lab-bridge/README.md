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

Supported commands:

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

The bridge is append/audit oriented. GitHub does not receive direct database credentials. SFI remains the persistence authority and every runtime result keeps the Method Lab epistemic boundary (`SIMULATED` until contrasted with observed return).
