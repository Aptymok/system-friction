# DOMAIN BOUNDARIES

Frase rectora: “La UI no calcula verdad. La UI observa.”

## Proposito

Este documento define guardrails minimos para impedir contaminacion entre dominios del scaffold monorepo SFI.

FASE 2B no migra logica productiva. Solo documenta limites y agrega un checker automatico de imports prohibidos.

## Dominios del sistema

| Dominio | Rutas | Responsabilidad |
|---|---|---|
| Interface | `apps/*`, `packages/ui` | Renderizar estado y enviar comandos declarados. |
| API Contracts | `packages/api-contracts` | Definir contratos de comandos, eventos y resultados. |
| Field Core | `packages/campo-ob`, `packages/mihm-core` | Declarar o calcular verdad del campo bajo reglas puras. |
| Security Core | `packages/security` | Roles, politicas, decisiones de autorizacion y auditoria. |
| Data Core | `packages/db` | Repositorios, schemas y frontera de acceso a datos. |
| Services | `services/*` | API, ingestion, agent y worker como procesos de backend. |
| Experimental | `experimental/*` | Pruebas aisladas sin acceso directo a datos productivos. |

## Imports permitidos

| Desde | Puede importar |
|---|---|
| `apps/*` | `packages/ui`, `packages/api-contracts`, `packages/config`, `packages/testing` solo en demo/test. |
| `packages/ui` | Tipos visuales propios, config visual y contratos si son necesarios para props. |
| `packages/mihm-core` | Node built-ins y codigo interno puro. |
| `packages/campo-ob` | Tipos internos y contratos puros si no crean dependencia a UI/DB. |
| `packages/api-contracts` | Codigo interno puro y tipos sin dependencias runtime. |
| `services/api` | `packages/api-contracts`, `packages/security`, `packages/campo-ob`, `packages/mihm-core`, `packages/db`, `packages/config`. |
| `services/ingestion` | `packages/api-contracts`, `packages/security`, `packages/sources`, `packages/config`. |
| `services/agent` | `packages/api-contracts`, `packages/campo-ob`, `packages/mihm-core`, `packages/security`; no `packages/db` directo. |
| `services/worker` | `packages/api-contracts`, `packages/security`, `packages/db`, paquetes core autorizados. |
| `experimental/*` | Paquetes puros y fixtures; no `packages/db`. |

## Imports prohibidos implementados por checker

1. `apps/*` no puede importar:
   - `packages/db`
   - `packages/mihm-core`
   - `packages/campo-ob`
   - `packages/security`
   - `services/*`

2. `packages/mihm-core` no puede importar:
   - React
   - Next
   - Supabase
   - DB
   - UI
   - services
   - apps

3. `packages/api-contracts` no puede importar:
   - UI
   - DB
   - Supabase
   - Next
   - React

4. `services/agent` no puede importar:
   - `packages/db` directamente

5. `experimental/*` no puede importar:
   - `packages/db`

6. `packages/ui` no puede importar:
   - `packages/mihm-core`
   - `packages/campo-ob`
   - `packages/db`
   - `packages/security`

## Ejemplos correctos

```ts
import type { CommandRequest } from '../../packages/api-contracts/src';
```

```ts
import type { ViewState } from '../../packages/ui/src';
```

```ts
import type { ActorContext } from '../../packages/security/src';
```

Uso correcto: `services/api` importa seguridad y contratos para aplicar policy antes de acceder a repositorios.

## Ejemplos incorrectos

```ts
// Incorrecto: apps no acceden directo a DB.
import { repository } from '../../packages/db/src';
```

```ts
// Incorrecto: UI no calcula verdad del campo.
import type { MihmVector } from '../../packages/mihm-core/src';
```

```ts
// Incorrecto: api-contracts debe ser puro.
import React from 'react';
```

```ts
// Incorrecto: services/agent no salta services/api para leer DB.
import { repository } from '../../packages/db/src';
```

## Uso

```bash
node scripts/check-domain-boundaries.mjs
```

Si `package.json` conserva el script de FASE 2B:

```bash
npm run check:boundaries
```

## Limitaciones

- El checker usa busqueda de strings y patrones simples de imports.
- No resuelve aliases de TypeScript ni symlinks.
- No interpreta exports re-exportados.
- No analiza `src/` en FASE 2B por criterio de aceptacion.
- Excluye directorios vendor/cache como `node_modules`, `.next`, `.venv`, `venv`, `site-packages` y `__pycache__`.

