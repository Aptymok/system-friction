# AMV Upload Audit Contract

Los uploads quedan como contrato, no como storage real.

Objetos contemplados: evidencia, cancion, demo, letra, campana, documento y audit MIHM objeto-campo.

`POST /api/amv/upload-contract` devuelve requisitos de evidencia y `blocked_requires_schema`.

No se toco schema, storage, migraciones ni Supabase.
