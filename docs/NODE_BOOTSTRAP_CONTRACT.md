# NODE BOOTSTRAP CONTRACT

Fecha: 2026-05-21  
Fase: FASE 4C - Node bootstrap v1 contract wrapper

## Objetivo

Declarar un contrato compatible para la respuesta actual de `/api/node/bootstrap` sin modificar el endpoint, sin cambiar auth, sin tocar Supabase y sin romper `/terminal`.

## Estado de implementacion

FASE 4C agrega:

- `NodeBootstrapResponseV1`
- `normalizeNodeBootstrapResponse(input)`

Ambos viven en `packages/api-contracts`.

El endpoint actual no fue modificado en esta fase.

## Contrato V1

```ts
type NodeBootstrapResponseV1 = {
  contractVersion: 'node-bootstrap.v1';
  node: Record<string, unknown> | null;
  node_error: string | null;
  user: { id: string; email?: string | null } | null;
  profile: Record<string, unknown> | null;
  audits: unknown[];
  memoryFacts: unknown[];
  memory_facts: unknown[];
  actions: unknown[];
  license: Record<string, unknown> | null;
  entitlements: Record<string, unknown>;
  sfi_assets: unknown[];
  sfi_assets_error: string | null;
};
```

## Compatibilidad

El endpoint legacy devuelve actualmente:

- `node`
- `node_error`
- `user`
- `profile`
- `audits`
- `memoryFacts`
- `memory_facts`
- `actions`
- `license`
- `entitlements`
- `sfi_assets`
- `sfi_assets_error`

El wrapper conserva ambos nombres para memoria:

- `memoryFacts`
- `memory_facts`

Esto evita romper consumidores existentes.

## Normalizacion

`normalizeNodeBootstrapResponse(input)`:

- acepta `unknown`;
- devuelve arrays vacios cuando faltan listas;
- devuelve `null` para objetos ausentes;
- preserva compatibilidad de `memoryFacts` y `memory_facts`;
- agrega `contractVersion: 'node-bootstrap.v1'`;
- no llama DB;
- no lee cookies;
- no usa Supabase;
- no modifica runtime.

## Regla de adopcion futura

La adopcion del wrapper dentro del endpoint debe ocurrir solo cuando haya prueba de compatibilidad con `/terminal`.

FASE 4C no hace esa adopcion para mantener riesgo cero.

