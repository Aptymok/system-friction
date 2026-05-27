# Runtime Ownership

Productive runtime lives in `packages/sfi-kernel`, `packages/runtime`, and `services/worker`.

Experimental runtime remains under `experimental/` and must not be imported by production API routes, workers, or packages. Legacy Python adapters remain in `services/python`; `world_cli.py` is callable by scheduled ingestion and the protected WorldSpect diagnostic route only.

UI code consumes read APIs. It must not execute WorldSpect adapters or SFI kernel cycles directly.
