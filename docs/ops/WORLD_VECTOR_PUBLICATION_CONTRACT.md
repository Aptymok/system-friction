# World Vector Publication Contract

## Boundary

Publication endpoints generate drafts only.

They do not publish to LinkedIn.

They do not publish to Medium.

They do not commit repository files automatically.

Founder approval is required before external publication.

## Draft Types

LinkedIn draft:

```text
GET /api/world-vector/publication/linkedin-draft
```

Repository archive entry:

```text
GET /api/world-vector/publication/repository-entry
```

Medium seed:

```text
GET /api/world-vector/publication/medium-seed
```

## Persistence

Default mode is read-only.

`persist=true` requires the governed ROOT actor gate.

Supported persistence:

- LinkedIn draft uses `world_vector_reports` as `public_weekly` / `linkedin`.
- Repository entry uses `world_vector_reports` as `public_weekly` / `repository`.

Unsupported persistence:

- Medium seed has no exact `world_vector_reports` report type yet and returns a blocked persistence response.

## Public Safety

Drafts must not include:

- raw WorldSpect payloads
- Supabase internals
- secrets
- private diagnostics
- automatic external publishing claims

Drafts may include:

- cycle range
- current sector
- dominant signal
- confidence/status
- public summary
- internal trace id for repository review
