# FIELD STATE CONTRACT

Fecha: 2026-05-21  
Fase: FASE 4A - Field Core DTOs y contrato de verdad

## Objetivo

Consolidar los contratos canonicos de campo sin conectar base de datos, sin migrar `node/bootstrap` y sin tocar `/terminal`.

## Principio

Un estado canonico del campo debe declarar siempre:

- `sourceState`
- `evidenceLevel`
- `confidence`
- `updatedAt`

Sin esos campos, el dato no puede presentarse como verdad operacional del campo.

## Tipos canonicos

### `SourceState`

Clases de origen epistemico:

- `observed`
- `declared`
- `derived`
- `inferred`
- `simulated`
- `fixture`
- `missing`

### `EvidenceLevel`

Nivel de evidencia:

- `direct`
- `behavioral`
- `statistical`
- `semantic`
- `speculative`
- `none`

### `FieldRegime`

Regimen del campo:

- `stable`
- `watch`
- `critical`
- `unknown`

### `FieldMetricSet`

Set canonico de metricas:

- `ihg`
- `nti`
- `ldi`
- `phi`
- `degradation`
- `operationalCapacity`

### `FieldState`

Estado canonico del campo. Incluye:

- identidad del campo;
- nodo asociado;
- regimen;
- metricas;
- capacidad operacional;
- degradacion;
- nodos;
- vinculos;
- evidencia canonica.

### `NodeState`

Estado canonico del nodo. Incluye:

- `nodeId`;
- `ownerId`;
- assets asociados;
- evidencia canonica.

### `FieldNode`

Nodo dentro del campo. Incluye identidad, tipo, estado y evidencia canonica.

### `FieldLink`

Vinculo entre nodos. Incluye nodos origen/destino, relacion y evidencia canonica.

### `LogRecord`

Registro canonico de bitacora/evento. Incluye:

- `id`;
- `nodeId`;
- `logbookId`;
- `eventName`;
- `payloadHash`;
- `createdAt`;
- evidencia canonica.

### `SourceHealth`

Salud de fuente desde la perspectiva del campo. Incluye:

- fuente;
- estado operacional;
- ultimo momento observado;
- mensaje opcional;
- evidencia canonica.

## Contrato de verdad

El campo no acepta datos anonimos. Todo estado debe responder:

1. De donde viene.
2. Que clase epistemica tiene.
3. Que nivel de evidencia lo sostiene.
4. Que confianza declara.
5. Cuando fue actualizado.

## Reglas

- UI puede renderizar `FieldState`, no fabricarlo.
- `localStorage` no produce `FieldState` canonico.
- `simulated` y `fixture` nunca equivalen a `observed`.
- `missing` es un estado valido y preferible a inventar dato.
- `inferred` requiere confianza y, en fases posteriores, lineage.
- DB y APIs existentes no se modifican en FASE 4A.

