# PHASE MVT-04 · Real Data Ingestion Report

## Scope

Implemented the minimum real data route:

`SOURCE REAL -> NORMALIZER -> cognitive_event_stream -> read model -> /api/field/state -> /terminal`

No login, auth core, Supabase schema, `field/persist`, or package scripts were changed.

## Routes

- `POST /api/ingest/real`
  - Accepts operator, external, institutional, or world observations.
  - Requires `node_id`, `source_id`, `source_type`, and `content`.
  - Derives `title` from `content.slice(0, 80)` when absent.
  - Defaults `confidence` to `0.65`.
  - Writes one `cognitive_event_stream` row:
    - `stream_type = ingest`
    - `event_name = REAL_OBSERVATION_INGESTED`
    - `emitted_by = SFI_REAL_INGEST`

- `GET /api/ingest/read?node_id=...`
  - Reads the last 50 ingest events for the owned node.
  - Returns sanitized observation fields only.

- `GET /api/field/state?node_id=...`
  - Now reads the node event ledger without limiting to signals only.
  - Reduces:
    - `stream_type = signal`, `event_name = SIGNAL_DECLARED`
    - `stream_type = agent`, `event_name = AMV_RESPONSE`
    - `stream_type = ingest`, `event_name = REAL_OBSERVATION_INGESTED`

- `GET /api/source-health/internal`
  - Reports the runtime as reachable.
  - Adds `ingestEndpointReachable = true`.

## Payload Stored

The ingest payload includes:

- `source_id`
- `source_type`
- `title`
- `content`
- `url`
- `observed_at`
- `confidence`
- `evidenceLevel`
- `sourceState`
- `metadata`
- `payloadHash`

`payloadHash` is generated with Node `crypto` over a canonicalized payload.

## Field State Reduction

`/api/field/state` derives:

- `signalCount`
- `ingestCount`
- `agentResponseCount`
- average confidence across relevant events
- degradation pressure from degraded events, event pressure, and low confidence
- operational capacity from confidence and degradation
- `sourceState`
  - `observed` when real ingest or signals exist
  - `missing` when no relevant events exist
  - `degraded` when latest relevant event is degraded or row warnings exist
- `evidenceLevel`
  - `direct`, `external`, `declared`, `mixed`, or `none`
- `regime`
  - `observing` when ingest exists
  - `declared` when only signals exist
  - `silent` when no events exist
  - `degraded` when state is degraded

No external source is simulated.

## Terminal Visibility

Created `src/lib/terminal/ingestClient.ts` with:

- `ingestRealObservation(payload)`
- `readRealObservations(nodeId)`

The terminal now recognizes:

```text
/ingest <content>
```

That command writes through `/api/ingest/real` before requesting AMV. If persistence fails, the terminal shows a local warning and does not claim success.

The Operation panel now shows:

- `INGEST: count`
- `REAL: observed/missing/degraded`
- latest three ingest titles when available
- `/api/ingest/real`
- `/api/ingest/read`

## No-Go Conditions Checked

- `cognitive_event_stream` exists in migrations and is already used by production routes.
- Existing `ensureOwnedNode(node_id)` pattern supports service inserts after ownership validation.
- `/api/field/state` can read events by `node_id`.
- No DB migration was added.
- No `field/persist` change was made.

## Manual Test Plan

Use an authenticated session and a real owned node id.

1. POST real ingest:

```http
POST /api/ingest/real
Content-Type: application/json

{
  "node_id": "<node real>",
  "source_id": "operator_observation",
  "source_type": "operator",
  "title": "Primera observación real",
  "content": "Esta es una observación real persistida para activar el campo.",
  "confidence": 0.75
}
```

Expected:

```json
{ "ok": true, "data": { "ingested": true } }
```

2. GET ingest:

```http
GET /api/ingest/read?node_id=<node real>
```

Expected: `count >= 1` and `observations[0].content` exists.

3. GET field state:

```http
GET /api/field/state?node_id=<node real>
```

Expected:

- `sourceState = observed`
- `regime = observing` or `declared`
- `ingestCount >= 1`
- `confidence > 0`

4. Terminal:

```text
/ingest Observación real desde consola: el campo debe registrar esto como dato real.
```

Expected:

- `REAL_OBSERVATION_INGESTED` ghost appears.
- Ingest row exists in `cognitive_event_stream`.
- `/api/ingest/read` includes it.
- `/api/field/state` reflects `ingestCount`.
- Terminal Operation panel increments `INGEST`.

## Validation

Executed:

- `npm run typecheck`

Pending final validation after full phase edits:

- `npm run check:boundaries`
- `npm run build`

## Limitations

- This phase does not connect new external APIs.
- This phase does not prove a browser-authenticated real-node write unless run with an authenticated user session and a real node id.
- If no authenticated node is available, the routes correctly return `node_unavailable`; that is not a successful ingest.
