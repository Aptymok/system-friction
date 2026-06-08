# AMV Access Policy

AMV Engine es reusable. AMV State se entiende por `subject + account + scope`.

ROOT/Aptymok puede montar contexto global. Otros usuarios solo pueden leer scopes autorizados. MOP-H privado no se expone.

La politica vive en:

- `src/lib/amv/core/amvSubjectContext.ts`
- `src/lib/amv/core/amvAccessPolicy.ts`
- `src/lib/amv/core/amvScopePermissions.ts`

No se tocaron permisos productivos ni Supabase.
