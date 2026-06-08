# ROOT Block 3 - Access Export Legacy Operations

Se agregaron contratos de acceso, export, save-reading y upload.

No se toco Supabase, schema, migrations ni storage.

Legacy revisado:

- `/api/amv/respond` sigue consumido por `src/observatory/components/terminal/AMVChat.tsx`.
- `/api/amv/field-response` sigue consumido por `src/observatory/components/field/SfiCognitiveCanvasTerminal.tsx`.
- `/api/liturgia/amv` sigue consumido por `SfiFieldShell`, `SfiCognitiveField`, `fieldOntology` y `LiturgiaDiagnosticPanel`.

Decision: legacy queda vivo e isolated. No se migra ni borra en este bloque.
