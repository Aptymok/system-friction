# TERMINAL CANONICAL INTEGRATION PLAN

Fecha: 2026-05-22
Fase: FASE 11A - First terminal integration plan

## Objetivo

Planear como `/terminal` comenzara a consumir `/api/field/state` y `/api/signals/read` sin modificarlo todavia.

## Principio rector

`/terminal` puede renderizar experiencia.

`/terminal` no puede calcular verdad canonica del campo.

## Componentes a tocar en fase posterior

No se tocan en FASE 11A.

Componentes candidatos:

- `src/app/(terminal)/terminal/page.tsx`
- `src/observatory/components/field/SfiFieldShell.tsx`
- `src/observatory/store/nodeStore.ts`
- `src/observatory/hooks/useTelemetryPulse.ts`
- `src/observatory/store/pulseEngine.ts`

## Orden recomendado

### Paso 1 - Feature flag pasivo

Crear flag default false:

- `SFI_CANONICAL_FIELD_READ=false`

No cambia comportamiento por defecto.

### Paso 2 - API client read-only

Crear cliente separado para:

- `GET /api/field/state?node_id=...`
- `GET /api/signals/read?node_id=...`

El cliente no debe escribir.

### Paso 3 - Adapter canonical read model

Usar:

- `buildTerminalCanonicalReadModel()`

Para normalizar:

- FieldStateDTO
- NodeStateDTO
- logs
- SourceHealth

### Paso 4 - nodeStore boundary

Agregar rama pasiva en `nodeStore`:

- legacy state actual;
- canonical read model opcional;
- warnings visibles internamente.

No reemplazar metricas legacy todavia.

### Paso 5 - visual labels

Agregar etiquetas visibles cuando aplique:

- `visual_estimate`
- `local_only`
- `cache`
- `degraded`
- `missing`

### Paso 6 - progressive rendering

Si flag esta activo y endpoints responden:

- mostrar FieldState canonico como lectura secundaria;
- no ocultar legacy;
- no cambiar comandos existentes.

### Paso 7 - cutover posterior

Solo cuando existan pruebas estables:

- canonical read model reemplaza metricas legacy;
- pulseEngine queda visual-only;
- useTelemetryPulse queda heartbeat/polling;
- localStorage queda cache, no memoria.

## Feature flag

Nombre propuesto:

- `SFI_CANONICAL_FIELD_READ`

Default:

- false

Regla:

- si falta flag, comportamiento legacy.

## Fallback legacy

Fallback obligatorio si:

- `/api/field/state` falla;
- `/api/signals/read` falla;
- no hay node_id;
- auth falla;
- response no cumple shape;
- warnings criticos.

Fallback:

- mantener terminal actual;
- marcar canonical read como unavailable;
- no cambiar comandos;
- no bloquear experiencia.

## Etiquetado operacional

### visual_estimate

Usar cuando UI derive animacion o metrica visual local.

### local_only

Usar cuando dato proviene solo de cliente/localStorage.

### cache

Usar cuando dato proviene de cache y puede estar desactualizado.

### degraded

Usar cuando endpoint responde pero con warnings o datos incompletos.

### missing

Usar cuando no hay dato disponible.

## Rollback

Rollback inmediato:

1. apagar `SFI_CANONICAL_FIELD_READ`;
2. mantener legacy terminal;
3. no revertir endpoints read-only;
4. documentar error;
5. abrir issue/fase de correccion.

Rollback de codigo:

- revertir integration client;
- revertir nodeStore branch;
- conservar endpoints si no causan fallas.

## Pruebas manuales

### Sin flag

- `/terminal` se comporta igual.
- no hay cambios visuales.
- no hay llamadas nuevas.

### Con flag activo y sesion valida

- field/state responde 200.
- signals/read responde 200.
- warnings se muestran o registran.
- terminal no colapsa si falta FieldState.

### Con endpoint caido

- fallback legacy funciona.
- UI marca degraded/missing.
- no se bloquea input.

### Sin señales

- FieldState aparece como missing/unknown.
- terminal no inventa regimen.

### Con señales

- FieldState aparece como derived.
- no sustituye verdad local sin label.

## Pruebas esperadas

- typecheck;
- build;
- boundary check;
- manual browser test;
- auth session test;
- no-session redirect;
- endpoint failure fallback;
- no regression visual.

## No-go conditions

No avanzar si:

- endpoints read-only fallan en build;
- `/terminal` cambia sin flag;
- metricas legacy desaparecen sin fallback;
- localStorage se presenta como canonico;
- FieldState missing se presenta como observed;
- se rompe login/session;
- se toca field/persist;
- se altera SfiFieldShell de forma invasiva;
- se agregan writes desde terminal canonical read.

## Estado de FASE 11A

Plan solamente.

No modifica `/terminal`.

No modifica `SfiFieldShell`.

No modifica `nodeStore`.
