# WORKSPACE CONFIGURATION

Fecha: 2026-05-21  
Fase: FASE 2E - workspace controlado

## Package manager detectado

El repo usa npm:

- `package-lock.json`: presente.
- `pnpm-lock.yaml`: ausente.
- `yarn.lock`: ausente.

Decision: usar npm workspaces en `package.json`.

## Configuracion aplicada

Se agrego en `package.json`:

```json
{
  "workspaces": [
    "apps/*",
    "services/*",
    "packages/*"
  ]
}
```

Se agregaron scripts no destructivos:

```json
{
  "check:boundaries": "node scripts/check-domain-boundaries.mjs",
  "typecheck": "tsc --noEmit --pretty false --incremental false",
  "phase:verify": "npm run check:boundaries && npm run typecheck"
}
```

## Manifiestos de workspace

Se agregaron `package.json` minimos en apps, services scaffold y packages scaffold.

Estos manifiestos:

- no agregan dependencias;
- no ejecutan build;
- no migran codigo;
- solo nombran el workspace y lo marcan como privado.

## Turbo

No se agrego `turbo.json`.

Justificacion:

- no hay tareas multi-paquete reales todavia;
- no hay builds por workspace;
- agregar Turbo implicaria una dependencia/tooling adicional no necesario para FASE 2E;
- el criterio de esta fase es no romper el flujo actual.

## Limites

- No se movio `src/`.
- No se movio la app actual.
- No se tocaron rutas productivas.
- No se tocaron APIs existentes.
- No se toco Supabase/auth/.env.
- No se agregaron dependencias productivas.

