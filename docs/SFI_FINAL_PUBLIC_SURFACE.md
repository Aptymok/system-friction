# SFI Final Public Institute Surface

Status: implemented as public threshold in `/`.

The canonical public surface separates three layers:

- `/`: institutional threshold, canon, artefacts, evidence states, Field Brief and public field entry.
- `/campo` and `/observatory`: operational field instrument using `/api/runtime/bootstrap` and `/api/observatory/state`.
- `/sfi-core-v2`, `/field/brief/latest`, `/llms-full.txt`, `/ai-index.json`, `/field-schema.json`: public canon and machine-readable access layer.

Rules preserved:

- The home is not the raw observatory.
- Runtime governance, auth provider, schema, kernel and private endpoints were not changed.
- Public copy speaks about fields, regimes and evidence, not identity diagnosis.
- Static evidence is presented with state and limits, not as live validation.
- Legacy surfaces are described as historical archive, not current canonical authority.

Primary source contracts consulted locally:

- `INDEX_PROPOSAL.HTML`
- `SFI_OBSERVATORIO.html`
- `SFI-OBS-LON.html`
- `SF_nodes.json`
- `SF_docs.js`

Validation expectations:

- `npm run build`
- `npx tsc --noEmit --pretty false --incremental false`
- `npm run check:boundaries`
- `GET /api/observatory/state` remains `ok:true`
- `/sfi-core-v2` visible
- `/field/brief/latest` visible
- `/llms-full.txt`, `/ai-index.json`, `/field-schema.json` valid
