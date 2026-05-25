# FIELD PERSIST DECOMPOSITION

Fecha: 2026-05-21  
Fase: FASE 4D - Field persist demolition plan  
Estado: plan documental. No se modifica endpoint.

## Objetivo

Separar el multiplexor actual `/api/field/persist` en comandos pequeños, auditables y con ownership claro.

El endpoint actual mezcla:

- eventos de campo;
- logbook SFI;
- snapshots WorldSpect;
- drafts de media;
- posts/retornos sociales;
- ingestion social read-only;
- runtime status;
- consulta de fuentes conectadas.

FASE 4D no reescribe el endpoint. Define el plan de corte.

## Principios de corte

- Un comando por responsabilidad.
- Todo comando con schema versionado.
- Todo write con idempotency key.
- Todo write emite evento auditado.
- Todo comando valida ownership o source identity.
- Queries no deben vivir junto a writes.
- Social ingestion externa no debe compartir handler con field events.

## 1. field-events

Accion legacy: `field_event`

### Input schema

```ts
type PersistFieldEventCommand = {
  command: 'field-events.create';
  contractVersion: 'field-events.v1';
  idempotencyKey: string;
  node_id: string;
  event_type: string;
  message?: string;
  trace_payload?: Record<string, unknown>;
};
```

### Output schema

```ts
type PersistFieldEventResult = {
  ok: true;
  mode: 'supabase';
  event: unknown;
} | {
  ok: false;
  mode: 'local_only';
  error: string;
};
```

### Owner domain

FIELD CORE + API CORE

### Auth requirement

- Authenticated user.
- `ensureOwnedNode(node_id)`.

### Idempotency key

Required. Suggested derivation: `field:${node_id}:${event_type}:${payloadHash}`.

### Event emitted

- DB target current: `cognitive_event_stream`.
- Canonical event: `FIELD_EVENT_RECORDED`.

### Migration risk

Medium. This is a core write path used by field UI. Must preserve `local_only` fallback semantics.

## 2. logbook-events

Accion legacy: `sfi_logbook_event`

### Input schema

```ts
type PersistLogbookEventCommand = {
  command: 'logbook-events.create';
  contractVersion: 'logbook-events.v1';
  idempotencyKey: string;
  asset_id: string;
  event_type: string;
  message?: string;
  trace_payload?: Record<string, unknown>;
};
```

### Output schema

```ts
type PersistLogbookEventResult = {
  ok: true;
  mode: 'supabase';
  logRecord: unknown;
} | {
  ok: false;
  mode: 'local_only';
  error: string;
};
```

### Owner domain

FIELD CORE

### Auth requirement

- Authenticated user.
- Asset ownership or root/system.
- Current code only checks user auth; migration must strengthen asset ownership.

### Idempotency key

Required. Suggested derivation: `logbook:${asset_id}:${event_type}:${payloadHash}`.

### Event emitted

- DB target current: `sfi_logbook`.
- Canonical event: `LOGBOOK_EVENT_RECORDED`.

### Migration risk

High. Ownership validation must be strengthened without breaking existing asset workflows.

## 3. worldspect-snapshots

Acciones legacy:

- `world_spectrum_snapshot`
- `latest_world_spectrum_snapshot`

### Input schema

Write:

```ts
type PersistWorldSpectSnapshotCommand = {
  command: 'worldspect-snapshots.create';
  contractVersion: 'worldspect-snapshots.v1';
  idempotencyKey: string;
  node_id: string;
  reading: {
    wsi?: number;
    WSI?: number;
    nti?: number;
    NTI?: number;
    ldi?: number;
    LDI?: number;
    sources?: unknown;
    sourceUrl?: string;
    source_url?: string;
    ts?: string;
    observed_at?: string;
  } & Record<string, unknown>;
};
```

Read:

```ts
type LatestWorldSpectSnapshotQuery = {
  query: 'worldspect-snapshots.latest';
  contractVersion: 'worldspect-snapshots.v1';
  nodeId: string;
};
```

### Output schema

```ts
type WorldSpectSnapshotResult = {
  ok: true;
  mode: 'supabase';
  snapshot: unknown | null;
} | {
  ok: false;
  mode: 'local_only';
  error: string;
};
```

### Owner domain

FIELD CORE + INTEGRATION CORE

### Auth requirement

- Authenticated user.
- `ensureOwnedNode(node_id | nodeId)`.
- Snapshot creation requires measured source fields; missing source returns `worldspect_snapshot_not_measured`.

### Idempotency key

Required for write. Suggested derivation: `worldspect:${node_id}:${observed_at}:${payloadHash}`.

Read query does not require idempotency key.

### Event emitted

- DB target current: `world_spectrum_snapshots`.
- Canonical event: `WORLDSPECT_SNAPSHOT_RECORDED`.

### Migration risk

Medium. Must preserve strict refusal when snapshot lacks measured source. Must not convert missing data into live data.

## 4. media-drafts

Accion legacy: `social_draft`

### Input schema

```ts
type UpsertMediaDraftCommand = {
  command: 'media-drafts.upsert';
  contractVersion: 'media-drafts.v1';
  idempotencyKey: string;
  node_id: string;
  draft: {
    id?: string;
    objective?: unknown;
    network?: string;
    text?: string;
    status?: string;
    sourceDescriptor?: unknown;
    mihmReview?: unknown;
    worldSpectReview?: unknown;
    contentHash?: string;
    approval?: unknown;
  };
  fieldMode?: string;
  primaryPatternId?: string | null;
  secondaryPatternIds?: string[];
};
```

### Output schema

```ts
type MediaDraftResult = {
  ok: true;
  mode: 'supabase';
  draft: unknown;
} | {
  ok: false;
  mode: 'local_only';
  error: string;
};
```

### Owner domain

AGENT CORE + FIELD CORE

### Auth requirement

- Authenticated user.
- `ensureOwnedNode(node_id)`.

### Idempotency key

Required. Suggested derivation: `media-draft:${node_id}:${draft.id || draft.contentHash}`.

### Event emitted

- DB target current: `media_drafts`.
- Canonical event: `MEDIA_DRAFT_UPSERTED`.

### Migration risk

Medium. Current upsert depends on `metadata->>draftId`; must preserve duplicate/update semantics.

## 5. social-returns

Acciones legacy:

- `manual_social_post`
- `manual_social_return`
- `social_readonly_sources`
- `social_readonly_ingest`

### Input schema

Manual post:

```ts
type ManualSocialPostCommand = {
  command: 'social-returns.manual-post.create';
  contractVersion: 'social-returns.v1';
  idempotencyKey: string;
  node_id: string;
  network: string;
  text: string;
  postedAt?: string;
  externalPostId?: string | null;
  postUrl?: string | null;
  metadata?: Record<string, unknown>;
};
```

Manual return:

```ts
type ManualSocialReturnCommand = {
  command: 'social-returns.manual-return.create';
  contractVersion: 'social-returns.v1';
  idempotencyKey: string;
  node_id: string;
  manualReturn: {
    platform?: string;
    postId?: string | null;
    capturedAt?: string;
    resonanceScore?: number | null;
    engagement?: Record<string, unknown>;
    commentsSummary?: string;
    rawPayload?: Record<string, unknown>;
  };
};
```

Read-only sources query:

```ts
type SocialReadonlySourcesQuery = {
  query: 'social-returns.readonly-sources';
  contractVersion: 'social-returns.v1';
  node_id: string;
};
```

Read-only ingest command:

```ts
type SocialReadonlyIngestCommand = {
  command: 'social-returns.readonly-ingest';
  contractVersion: 'social-returns.v1';
  idempotencyKey: string;
  node_id: string;
  asset_id?: string;
  provider: 'x' | 'linkedin' | string;
};
```

### Output schema

```ts
type SocialReturnResult = {
  ok: true;
  mode: 'supabase';
  data: unknown;
  duplicate?: boolean;
} | {
  ok: false;
  mode: 'local_only';
  error: string;
};
```

### Owner domain

INTEGRATION CORE + FIELD CORE

### Auth requirement

- Authenticated user.
- `ensureOwnedNode(node_id)`.
- OAuth/read-only ingest requires connected source ownership and valid token scope.

### Idempotency key

Required for writes/ingest:

- `social-post:${node_id}:${provider}:${externalPostId || postUrl || payloadHash}`
- `social-return:${node_id}:${platform}:${postId || capturedAt}`
- `social-ingest:${node_id}:${provider}:${window}`

Readonly source query does not require idempotency key.

### Event emitted

- DB targets current: `social_posts`, `social_resonance_events`, `cognitive_event_stream`, `sfi_logbook`.
- Canonical events:
  - `SOCIAL_POST_RECORDED`
  - `SOCIAL_RETURN_RECORDED`
  - `SOCIAL_RETURN_CAPTURED`

### Migration risk

High. This command group mixes manual user input, OAuth reads, event emission and optional asset logbook writes. Must split manual and OAuth flows before runtime enforcement.

## 6. runtime-status

Accion legacy: `runtime_status`

### Input schema

```ts
type RuntimeStatusQuery = {
  query: 'runtime-status.get';
  contractVersion: 'runtime-status.v1';
  node_id: string;
};
```

### Output schema

```ts
type RuntimeStatusResult = {
  ok: true;
  mode: 'supabase';
  data: {
    recentFieldEventsCount: number;
    latestWorldSpectrumSnapshot: unknown | null;
    recentSocialPostsCount: number;
    recentSocialReturnsCount: number;
    hasReadOnlyTokens: boolean;
    latestSocialReturnAt: string | null;
    latestPersistedEventAt: string | null;
  };
} | {
  ok: false;
  mode: 'local_only';
  error: string;
};
```

### Owner domain

INTEGRATION CORE + FIELD CORE

### Auth requirement

- Authenticated user.
- `ensureOwnedNode(node_id)`.

### Idempotency key

Not required. Query only.

### Event emitted

None. Query should not emit event by default. Audit may be added for admin/security contexts only.

### Migration risk

Low to medium. Must preserve dashboard diagnostics while preventing UI from treating source health as field truth.

## 7. source-health

New command group. No exact single legacy action; it should absorb:

- connected source status from `social_readonly_sources`;
- runtime source diagnostics from `runtime_status`;
- future webhook/cron/source health.

### Input schema

```ts
type SourceHealthQuery = {
  query: 'source-health.list';
  contractVersion: 'source-health.v1';
  node_id: string;
  sourceKinds?: Array<'webhook' | 'oauth' | 'manual' | 'cron' | 'fixture' | 'public-api'>;
};
```

### Output schema

```ts
type SourceHealthResult = {
  ok: true;
  mode: 'supabase';
  sources: Array<{
    sourceId: string;
    status: 'healthy' | 'degraded' | 'unavailable' | 'unknown';
    lastObservedAt?: string;
    confidence: number;
    message?: string;
  }>;
} | {
  ok: false;
  mode: 'local_only';
  error: string;
};
```

### Owner domain

INTEGRATION CORE

### Auth requirement

- Authenticated user.
- `ensureOwnedNode(node_id)`.
- Source ownership for OAuth-backed sources.

### Idempotency key

Not required. Query only.

### Event emitted

None by default.

### Migration risk

Medium. It introduces a new read model; must not break existing `runtime_status` or `social_readonly_sources` consumers.

## 8. command-audit

New command group. Cross-cutting concern for all writes.

### Input schema

```ts
type CommandAuditRecord = {
  commandName: string;
  contractVersion: string;
  idempotencyKey: string;
  actorId: string;
  node_id?: string;
  resourceId?: string;
  decision: 'allowed' | 'denied';
  reason: string;
  payloadHash?: string;
  correlationId?: string;
};
```

### Output schema

```ts
type CommandAuditResult = {
  ok: true;
  auditId: string;
} | {
  ok: false;
  error: string;
};
```

### Owner domain

SECURITY CORE + API CORE

### Auth requirement

- Internal only.
- Emitted after policy decision.
- Must never be callable directly by public UI.

### Idempotency key

Required for audited writes. Suggested derivation: use command idempotency key.

### Event emitted

- Future canonical event: `COMMAND_AUDIT_RECORDED`.
- Future DB target: dedicated audit log, not decided in FASE 4D.

### Migration risk

Medium. Requires audit storage decision. Should be introduced before cutting high-risk write commands.

## Suggested migration order

1. Add schemas/contracts only.
2. Add parallel handlers behind internal names, not replacing `/api/field/persist`.
3. Move read-only queries first: `runtime-status`, `source-health`.
4. Move low-risk writes: `field-events`.
5. Move `worldspect-snapshots`.
6. Move `logbook-events` with strengthened asset ownership.
7. Move `media-drafts`.
8. Split social flows into manual and OAuth ingestion.
9. Add `command-audit`.
10. Deprecate `/api/field/persist` only after `/terminal` consumes new endpoints safely.

## Non-goals in FASE 4D

- No endpoint changes.
- No DB changes.
- No runtime changes.
- No Supabase changes.
- No `/terminal` changes.

