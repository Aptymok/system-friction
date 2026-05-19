# PATTERN MODEL

Cada patron operativo debe tener:

```json
{
  "id": "nti",
  "nombre": "Nodo de Trazabilidad Institucional",
  "palabra": "Trazabilidad",
  "oracion_visible": "El sistema puede mostrar de donde salio algo.",
  "que_detecta": "Origen faltante o conclusion sin fuente visible.",
  "que_lo_activa": ["consulta de origen", "decision sin evidencia", "explicacion solicitada"],
  "nodos_relacionados": ["bitacora", "amv", "mihm"],
  "accion_sugerida": "Ver origen",
  "nivel_friccion": 2,
  "capa_visible": "FIELD_LAYER"
}
```

## Regla

Los patrones no son adornos. Activan nodos, rutas, inhibiciones o bitacora.

## Capas

- FIELD_LAYER: lectura corta para operar.
- TRACE_LAYER: origen, pesos, reglas y evidencia si el usuario lo pide.
- DOCUMENT_LAYER: documentos, auditorias y protocolos.

## Catalogo extendido 0-100

La estructura queda separada:

- patrones raiz = `coreFieldPatterns`
- patrones criticos = `criticalSystemsPatterns`
- export publica = `fieldPatterns`

`fieldPatterns` combina ambos grupos:

```ts
export const fieldPatterns = [
  ...coreFieldPatterns,
  ...criticalSystemsPatterns,
];
```

Cada patron critico puede activar:

- nodo relacionado;
- ruta minima;
- bitacora;
- lectura AMV en FIELD_LAYER;
- trazabilidad solo si el usuario la pide.

El catalogo completo no se muestra al usuario.
