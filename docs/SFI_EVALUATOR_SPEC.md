# SFI EVALUATOR SPEC

Fecha: 2026-05-21  
Fase: FASE 6B - Evaluator specification only

## Objetivo

SFI Evaluator es una futura aplicacion consumidora del Observatorio destinada a evaluar assets, senales, contextos y propuestas en relacion con el campo SFI.

En esta fase queda definido solo como especificacion. No existe runtime, app funcional, upload, analisis de archivos, modelos ni procesamiento productivo.

## Estado constitucional

Estado actual: bloqueado hasta Fase 8.

Motivos:

- requiere contratos de datos vivos ya estabilizados;
- requiere control de upload y sanitizacion documental;
- requiere modelo de autorizacion por app y por asset;
- requiere trazabilidad epistemica antes de emitir evaluaciones;
- requiere aislamiento de modelos e inferencias;
- requiere audit logs y replay protection;
- requiere politicas de retencion, borrado y acceso.

## Pipeline propuesto

1. Intake autorizado
   - Recibe referencia de asset ya registrado por un servicio autorizado.
   - No recibe archivos directamente en esta especificacion.

2. Normalizacion
   - Convierte metadatos del asset a una forma evaluable.
   - Mantiene lineage, checksum, fuente y clase epistemica.

3. Context binding
   - Asocia el asset a `FieldContext` autorizado.
   - Declara incertidumbre y limites de lectura.

4. Evaluacion
   - Calcula metricas permitidas por tipo de asset.
   - No declara verdad canonica del campo.

5. Mutual observation
   - Produce un `MutualObservationReport` que separa observacion, interpretacion, riesgo y vacios.

6. Projection
   - Produce proyecciones condicionadas, no predicciones absolutas.

7. Intervention planning
   - Sugiere intervenciones trazables y reversibles.

8. Publication
   - Entrega resultados mediante API controlada.
   - Registra auditoria, correlacion e idempotency key.

## Tipos de assets

| Asset type | Descripcion | Estado permitido antes de Fase 8 |
| --- | --- | --- |
| `document` | Documento textual, informe, minuta, memo, politica. | Especificado, no procesado. |
| `image` | Imagen, evidencia visual, captura. | Especificado, no procesado. |
| `audio` | Grabacion o nota de voz. | Especificado, no procesado. |
| `video` | Video o registro audiovisual. | Especificado, no procesado. |
| `dataset` | Tabla, CSV, matriz, export. | Especificado, no procesado. |
| `conversation` | Conversacion estructurada o transcripcion. | Especificado, no procesado. |
| `field-log` | Bitacora o evento del campo. | Lectura futura via Observatorio. |
| `proposal` | Propuesta o intervencion candidata. | Lectura futura via Observatorio. |

## Metricas por tipo

### `document`

- claridad semantica;
- consistencia interna;
- densidad operacional;
- riesgo normativo;
- trazabilidad de afirmaciones;
- nivel de incertidumbre.

### `image`

- integridad del asset;
- calidad de evidencia;
- contexto faltante;
- riesgo de mala interpretacion;
- necesidad de verificacion humana.

### `audio`

- calidad de transcripcion esperada;
- sensibilidad del contenido;
- riesgo de atribucion incorrecta;
- cobertura temporal.

### `video`

- continuidad temporal;
- escenas relevantes;
- riesgo de edicion o recorte;
- requerimiento de consentimiento.

### `dataset`

- completitud;
- consistencia de schema;
- anomalías;
- calidad de origen;
- riesgo de sesgo.

### `conversation`

- participantes declarados;
- intencion comunicativa;
- puntos de friccion;
- acuerdos y desacuerdos;
- riesgo de inferencia excesiva.

### `field-log`

- clase epistemica;
- confidence;
- lineage;
- relacion con nodos y vinculos;
- impacto potencial en regimen.

### `proposal`

- reversibilidad;
- costo de intervencion;
- superficie de riesgo;
- dependencia de fuentes;
- compatibilidad con limites del agente.

## FieldContext requerido

Evaluator no puede operar sin `FieldContext` autorizado.

Forma conceptual:

```ts
type FieldContext = {
  fieldId: string;
  nodeIds: string[];
  timeRange: {
    from: string;
    to: string;
  };
  sourceHealthIds: string[];
  allowedReadCapabilities: string[];
  epistemicLimits: string[];
  requestedBy: string;
  correlationId: string;
};
```

Restricciones:

- debe provenir del Observatorio;
- debe estar firmado o autorizado por request;
- debe incluir limites epistemicos;
- debe excluir secretos y datos no autorizados;
- debe registrar correlacion.

## MutualObservationReport

Salida futura para observacion mutua entre asset y campo.

```ts
type MutualObservationReport = {
  reportId: string;
  assetId: string;
  fieldId: string;
  observations: string[];
  interpretations: string[];
  uncertainties: string[];
  risks: string[];
  missingEvidence: string[];
  confidence: number;
  lineage: string[];
  createdAt: string;
};
```

Regla: las observaciones describen evidencia; las interpretaciones no deben fingir dato observado.

## Projection

Salida futura para escenarios condicionados.

```ts
type Projection = {
  projectionId: string;
  reportId: string;
  scenario: string;
  assumptions: string[];
  expectedEffects: string[];
  uncertainty: string;
  confidence: number;
  reversible: boolean;
};
```

Regla: una proyeccion no es prediccion absoluta ni verdad canonica.

## InterventionPlan

Salida futura para acciones propuestas.

```ts
type InterventionPlan = {
  planId: string;
  projectionId: string;
  actions: string[];
  prerequisites: string[];
  riskControls: string[];
  rollbackPlan: string[];
  approvalRequired: boolean;
};
```

Regla: toda intervencion debe ser trazable, revisable y reversible cuando sea posible.

## Security constraints

Evaluator debe cumplir:

- no direct DB access;
- no service role;
- authN/authZ por request;
- least privilege por app y asset;
- schema validation;
- idempotency key para comandos;
- correlation id para trazabilidad;
- audit logs;
- replay protection;
- aislamiento de uploads;
- sanitizacion de archivos antes de analisis;
- prohibicion de secretos en prompts, logs o resultados.

## Risk constraints

Evaluator debe controlar:

- inferencias no trazables;
- leakage de datos sensibles;
- prompt injection documental;
- sesgos por fuente;
- falsa precision;
- mezcla de fixture con dato vivo;
- atribucion incorrecta;
- sobreconfianza en modelos;
- acciones irreversibles;
- degradacion operacional del Observatorio.

## Bloqueo hasta Fase 8

Evaluator queda bloqueado hasta Fase 8 porque todavia faltan:

- gateway estable de lectura y escritura;
- contratos de asset intake;
- boundary enforcement para apps futuras;
- storage policy;
- upload quarantine;
- model isolation;
- audit runtime;
- permisos por consumidor;
- runbooks de incidente;
- pruebas de no acceso a DB.

Hasta entonces, Evaluator solo existe como especificacion y `AppScope`.
