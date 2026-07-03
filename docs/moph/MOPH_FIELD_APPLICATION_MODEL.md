# MOPH Field Application Model

## Estado

Documento operativo de integración.

## Definición

MOPH significa Minimum Operational Proof of Homeostasis.

En español operativo: Prueba Operativa Mínima de Homeostasis.

MOPH es el protocolo de ScoreFriction para probar si una intención puede convertirse en operación observable, repetible y trazable antes de escalar inversión, infraestructura o narrativa.

## Principio

MOPH no valida sueños. MOPH valida operación mínima.

Toda prueba MOPH mide la distancia entre:

1. Intención declarada.
2. Ejecución observable.
3. Repetibilidad.
4. Fricción operativa.
5. Señal externa.
6. Margen o sostenibilidad.
7. Evidencia registrada.

## Lugar de uso

MOPH se ejecuta principalmente en `/field`.

`/field` es la superficie para aplicación, seguimiento y dictamen de MOPH con usuarios externos, clientes o colaboradores.

`/studio` puede usar MOPH para prototipos creativos.

`/root` audita, gobierna, aprueba reglas, calibra pesos y observa excepciones.

## Casos aplicables

MOPH puede aplicarse a:

- carreta de tacos
- lanzamiento musical
- post de campaña
- prototipo visual
- servicio local
- microproducto
- prueba de venta
- flujo institucional
- procedimiento administrativo
- pieza cultural
- documento
- repositorio
- conversación de decisión
- operación logística

## Pipeline de 72 horas

### H0-H6 — Declaración verificable

El usuario declara una intención operacional.

Ejemplo:

```text
Quiero probar una carreta de tacos durante una ventana de 3 horas, con meta mínima de 80 tacos vendidos, margen bruto mayor a 45%, merma menor a 15% y tiempo promedio por cliente menor a 4 minutos.
```

Salida:

- intención declarada
- sustrato operativo
- objetivo medible
- ventana temporal
- hipótesis inicial

### H6-H18 — Mapa de fricción

ScoreFriction identifica fricciones iniciales.

Ejemplo para tacos:

- permiso
- ubicación
- proveedor
- costo unitario
- gas/equipo
- higiene
- clima
- seguridad
- capacidad por hora
- operador
- cobro
- basura

Salida:

- `friction_map`
- riesgos
- variables críticas
- evidencia requerida

### H18-H30 — Prototipo mínimo

El usuario construye la versión mínima observable.

Regla: mínimo menú, mínima infraestructura, máxima trazabilidad.

Salida:

- lista de insumos
- costos
- precio
- capacidad estimada
- plan de venta
- bitácora

### H30-H48 — Simulación seca

Antes de operar, se simula el flujo.

Variables:

- tiempo de montaje
- tiempo de servicio
- costo unitario
- capacidad por hora
- punto de saturación
- merma esperada
- operador requerido
- riesgo de fallo

Salida:

- ajuste previo
- dictamen de salida a prueba

### H48-H60 — Prueba real

Se ejecuta la operación mínima.

Se registra:

- hora de inicio
- hora final
- unidades producidas
- unidades vendidas
- ingreso
- costo
- margen
- merma
- tiempo de atención
- clientes rechazados
- comentarios
- incidentes

### H60-H72 — Dictamen

ScoreFriction emite régimen MOPH.

Regímenes:

- `REPETIBLE`: puede repetirse sin rediseño mayor.
- `SEÑAL_PARCIAL`: hay demanda, pero existe fricción corregible.
- `FRICCIÓN_CRÍTICA`: no debe escalarse todavía.
- `FALSA_SEÑAL`: la prueba dependió de amigos, evento único o sesgo.
- `INSUFICIENTE`: faltó evidencia.

## Índices MOPH

```text
MOPH_score =
  0.20 demanda_observada
+ 0.20 margen_operativo
+ 0.15 repetibilidad
+ 0.15 trazabilidad
+ 0.10 baja_merma
+ 0.10 baja_latencia
+ 0.10 señal_externa
- penalizaciones
```

Penalizaciones:

- permiso no resuelto
- merma alta
- dependencia de amigos
- margen no demostrado
- evidencia insuficiente
- riesgo operativo alto
- operación no repetible
- saturación del operador

## Objeto canónico

```ts
export type MophEvaluation = {
  moph_id: string;
  case_name: string;
  substrate_kind: 'operation' | 'product' | 'creative' | 'service' | 'institutional' | 'repository' | 'event';
  declared_intent: string;
  verification_window_hours: 72;
  baseline: Record<string, number | string | null>;
  friction_map: Array<{
    variable: string;
    risk: number;
    evidence_required: string[];
  }>;
  execution_log: Array<{
    timestamp: string;
    event: string;
    evidence?: string;
  }>;
  metrics: {
    demand: number | null;
    margin: number | null;
    repeatability: number | null;
    traceability: number | null;
    waste: number | null;
    latency: number | null;
    external_signal: number | null;
    operator_load: number | null;
  };
  indices: {
    MOPH_score: number | null;
    Fs: number | null;
    NTI: number | null;
    IHG: number | null;
    LDI: number | null;
  };
  regime: 'REPETIBLE' | 'SEÑAL_PARCIAL' | 'FRICCIÓN_CRÍTICA' | 'FALSA_SEÑAL' | 'INSUFICIENTE';
  recommendation: string[];
  next_window: string | null;
  root_review_required: boolean;
};
```

## Uso por interfaz

### `/field`

- iniciar MOPH
- cargar evidencia
- ver progreso
- ver fricciones
- ver dictamen
- descargar reporte
- repetir prueba

### `/studio`

- aplicar MOPH a canciones, piezas, campañas, visuales o prototipos
- comparar versiones
- generar brief siguiente
- no aprobar calibración global

### `/root`

- ver todos los MOPH
- auditar evidencia
- modificar pesos
- aprobar nuevos tipos de MOPH
- autorizar calibración
- archivar casos

## Ejemplo: carreta de tacos

Hipótesis:

```text
Una operación mínima de tacos puede vender al menos 70% del inventario inicial en una ventana de 3 horas, con margen bruto mayor a 45%, merma menor a 15% y tiempo promedio de atención menor a 4 minutos.
```

Dictamen esperado:

- Si vende más del 70%, margen mayor a 45%, merma menor a 15% y puede repetirse, pasa a MOPH-02.
- Si vende pero con merma alta, ajustar producción.
- Si vende solo a conocidos, clasificar como falsa señal.
- Si no hay evidencia suficiente, repetir sin escalar.

## Cierre

MOPH es el puente entre ScoreFriction y aplicación real.

El usuario no recibe una opinión. Recibe una prueba de 72 horas con evidencia, fricción, score, régimen y siguiente acción.
