# SYSTEM FRICTION INSTITUTE — MONOREPO CONSTITUTION
## Protocolo de Depuración Institucional · Versión Arquitectónica 1.0

```
SFI-ARCH-001
Estado: CONSTITUCIÓN ACTIVA
Instancia: System Friction Institute
Repositorio destino: aptymok/system-friction-main (monorepo)
```

---

## DECLARACIÓN DE DOMINIO TRIPLE

El monorepo no organiza código.  
Separa epistemología operacional.

Tres dominios. Fronteras no negociables.

```
┌─────────────────────────────────────────────────────────┐
│  CONSTITUTIONAL CORE                                    │
│  Lo que define verdad operacional.                      │
│  Origen de eventos. Fuente de campo.                    │
├─────────────────────────────────────────────────────────┤
│  EXPERIMENTAL DOMAIN                                    │
│  Lo que especula, proyecta, simula, propone.            │
│  Nunca muta el núcleo directamente.                     │
├─────────────────────────────────────────────────────────┤
│  INTERFACE DOMAIN                                       │
│  Lo que observa, visualiza, consume.                    │
│  La UI no calcula verdad. La UI observa.                │
└─────────────────────────────────────────────────────────┘
```

**Ley fundacional:**
```
Constitutional Core ≠ Experimental Domain ≠ Interface Domain
```

Ningún módulo habita dos dominios simultáneamente.  
Si existe ambigüedad de asignación: el módulo entra en cuarentena hasta resolución.

---

## ESTRUCTURA DEL MONOREPO

```
system-friction-main/
│
├── CONSTITUTION.md              ← este documento
├── AUDIT_LOG.md                 ← registro de decisiones de depuración
├── MIGRATION_CRITERIA.md        ← qué sobrevive y qué no
│
├── packages/                    ← CONSTITUTIONAL CORE
│   ├── mihm-core/               ← modelo matemático central (MIHM, SF variables)
│   ├── campo-ob/                ← observatorio de mutua observación (CAMPO·ΩB)
│   ├── events/                  ← event store + esquema de eventos epistémicos
│   ├── db/                      ← esquemas, migraciones, acceso controlado
│   ├── auth/                    ← identidad, tokens, sesiones
│   ├── security/                ← zero trust, validación, rate limiting
│   ├── api-contracts/           ← contratos tipados de comunicación inter-servicio
│   ├── sources/                 ← descriptores de fuentes externas + health metrics
│   ├── config/                  ← configuración centralizada, env validation
│   ├── testing/                 ← utilidades de test, fixtures, mocks auditados
│   └── ui/                      ← componentes base de interfaz (sin lógica de negocio)
│
├── services/                    ← OPERATIONAL INFRASTRUCTURE
│   ├── api/                     ← único punto legítimo de comunicación app→núcleo
│   ├── ingestion/               ← recepción y clasificación de señales externas
│   ├── worker/                  ← procesamiento asíncrono de eventos
│   └── agent/                   ← [EXPERIMENTAL] agente cognitivo aislado
│
├── apps/                        ← INTERFACE DOMAIN
│   ├── observatory-dashboard/   ← visualización del estado del campo
│   ├── admin/                   ← gestión de nodos, bitácoras, auditoría
│   ├── demo/                    ← instancia demostrativa aislada
│   └── evaluator/               ← [FASE 8] aplicativo de evaluación SFI
│
└── experimental/                ← EXPERIMENTAL DOMAIN
    └── cognitive-twin/          ← en cuarentena hasta trazabilidad verificada
```

---

## ASIGNACIÓN DE DOMINIO POR PAQUETE

### CONSTITUTIONAL CORE — `packages/`

Todo elemento de este dominio debe cumplir:

- tiene schema explícito y versionado
- tiene trazabilidad de cambios (ownership documentado)
- tiene idempotencia en operaciones de escritura
- tiene auditoría de acceso
- no depende de ningún elemento de EXPERIMENTAL DOMAIN
- no depende de ningún elemento de INTERFACE DOMAIN

| Paquete | Responsabilidad única | Puede importar de |
|---|---|---|
| `mihm-core` | Variables SF, ecuaciones MIHM, operadores matemáticos | `config` |
| `campo-ob` | Taxonomía de nodos, leyes ΩB, calificación de campo | `mihm-core`, `events`, `config` |
| `events` | Event store, esquema epistémico, clasificación de certeza | `config`, `db` |
| `db` | Esquemas Drizzle/Prisma, migraciones, tipos de datos | `config` |
| `auth` | Identidad de nodo, tokens, sesiones, permisos | `db`, `security`, `config` |
| `security` | Zero trust, validación, sanitización, rate limits | `config` |
| `api-contracts` | Tipos compartidos entre services y apps | nada |
| `sources` | Descriptores de fuentes externas, health status, ρ (confianza) | `events`, `config` |
| `config` | Variables de entorno, validación, constantes | nada |
| `testing` | Fixtures, helpers, mocks auditados | `config` |
| `ui` | Componentes base de presentación | nada de negocio |

### OPERATIONAL INFRASTRUCTURE — `services/`

Los servicios son los únicos nodos con acceso directo a `packages/db`.  
Ninguna app accede a base de datos directamente.

| Servicio | Responsabilidad | Dominio |
|---|---|---|
| `api` | Único gateway. Orquesta, valida, autoriza, enruta. | Constitutional |
| `ingestion` | Recibe señales externas. Clasifica. Registra en event store. | Constitutional |
| `worker` | Procesa eventos asincrónicos. Sin estado propio. | Constitutional |
| `agent` | Agente cognitivo. Solo propone eventos. Nunca escribe directo. | **Experimental** |

#### Regla de `services/agent`:

```
agent PUEDE:
  - leer estado del campo vía services/api
  - emitir propuestas de evento
  - generar observaciones con nivel de certeza explícito

agent NO PUEDE:
  - escribir en db directamente
  - modificar state de campo sin pasar por api
  - ejecutar mutaciones sin registro en ΒM
```

### INTERFACE DOMAIN — `apps/`

Las apps son observadoras.  
No calculan verdad.  
Consumen estado del campo vía `services/api`.

```
apps/observatory-dashboard  → consume: campo state, node states, event stream
apps/admin                  → consume: logbooks, audit trail, source health
apps/demo                   → consume: campo state read-only, sin escritura
apps/evaluator              ← NO construir antes de Fase 8
```

**Restricción absoluta de apps:**

```
app → services/api          ✓ permitido
app → services/ingestion    ✗ prohibido
app → packages/db           ✗ prohibido
app → packages/mihm-core    ✗ prohibido (solo vía api)
app ↔ app                   ✗ prohibido (comunicación directa entre apps)
```

### EXPERIMENTAL DOMAIN — `experimental/`

```
experimental/cognitive-twin   ← CUARENTENA ACTIVA
```

Condiciones para salir de cuarentena:
1. Trazabilidad completa de todas las operaciones de escritura
2. Clasificación de certeza explícita en todas las salidas
3. Comunicación exclusiva vía `services/api` (cero acceso directo a DB)
4. Auditoría de efectos sobre campo documentada en ΒM

---

## ARQUITECTURA EPISTÉMICA DE EVENTOS

El activo real del sistema no es la UI.  
Es la arquitectura de eventos epistemológicos.

### Esquema de Evento Epistémico

Todo evento registrado en el sistema lleva clasificación de certeza obligatoria:

```typescript
// packages/events/src/schema.ts

type EpistemicClass =
  | 'observed'       // evidencia directa, fuente trazable, ρ ≥ 0.80
  | 'inferred'       // derivado de patrones, evidencia indirecta, ρ ∈ [0.50, 0.80)
  | 'projected'      // extrapolación de tendencia, ρ ∈ [0.30, 0.50)
  | 'simulated'      // generado por modelo, sin correlato empírico directo
  | 'derived'        // calculado a partir de otros eventos, trazabilidad completa
  | 'weak_signal'    // señal candidata, sin verificación de recurrencia aún
  | 'archived'       // evento histórico sin actividad en campo actual

interface SFIEvent {
  id:              string           // uuid v4
  correlation_id:  string           // agrupa eventos de mismo ciclo causal
  timestamp:       string           // ISO 8601
  source:          EventSource      // descriptor de origen
  epistemic_class: EpistemicClass   // clasificación de certeza — OBLIGATORIO
  confidence:      number           // ρ ∈ [0, 1]
  lineage:         string[]         // ids de eventos padres (trazabilidad)
  checksum:        string           // integridad del registro
  payload:         Record<string, unknown>
  node_type:       NodeType         // tipo ontológico del nodo emisor
  field_delta:     number | null    // ΔΦ_CAMPO estimado si aplica
  uncertainty:     string | null    // descripción explícita de incertidumbre
}

interface EventSource {
  id:           string
  type:         'internal' | 'external' | 'agent' | 'user' | 'inferred'
  reliability:  number    // ρ base de la fuente
  url:          string | null
  last_verified: string | null
}
```

**Ley de integridad epistémica:**  
Un evento sin `epistemic_class` explícito no entra al event store.  
Un evento sin `confidence` numérico no entra al event store.  
Sin trazabilidad no hay operación válida.

### Lo que distingue observación de ficción operacional

El sistema puede producir output de distintas naturalezas.  
Nunca deben confundirse:

```
OBSERVACIÓN     → evidencia directa + fuente trazable + ρ ≥ 0.80
INFERENCIA      → patrón de múltiples observaciones + modelo explícito
SIMULACIÓN      → modelo sin correlato empírico actual
PROYECCIÓN      → extrapolación de tendencia observada
MEMORIA         → evento histórico recuperado de bitácora
EVIDENCIA       → observación con lineage completo y checksum verificado
FICCIÓN OPER.  → cualquier output que no declare su clase epistémica
```

Todo output del sistema, incluyendo dashboards, evaluaciones e inferencias del agente, debe declarar su clase epistémica.  
Sin declaración: el output no es legítimo para el campo.

---

## PROTOCOLO DE DEPURACIÓN INSTITUCIONAL — FASES

Las fases no son plan de construcción.  
Son protocolo de depuración secuencial.  
Una fase no se inicia sin que la anterior produzca entregable verificable.

### Fase 0 — Auditoría Forense
**Estado: completada.**

Entregable: documento de auditoría con clasificación de cada componente existente en:
- `SALVAR` — sobrevive auditoría, entra al monorepo
- `AISLAR` — funcional pero requiere cuarentena antes de integración
- `CLAUSURAR` — no migra, se archiva con documentación de razón
- `CUARENTENA` — pendiente de verificación de trazabilidad

Componentes ya clasificados:
```
cognitive_event_stream      → SALVAR  (corazón del event store)
node/bootstrap              → SALVAR  (identidad de nodo verificada)
sfi_assets                  → SALVAR  (activo operativo confirmado)
WorldSpect global measured  → SALVAR  (señal de campo verificada)
createKernelRoute           → AISLAR  (lógica válida, dependencias opacas)
self-healing                → AISLAR  (mecanismo útil, sin trazabilidad actual)
simulación cognitiva        → CLAUSURAR (no trazable, sin evidencia)
CognitiveTwin               → CUARENTENA (potencial real, condiciones no cumplidas)
UI mezclada con verdad      → CLAUSURAR como está / refactorizar por separación
estado Zustand persistido   → CLAUSURAR como fuente de verdad
```

---

### Fase 1 — Mapa de Procesos

**Objetivo:** identificar qué procesos realmente existen (no los que se supone que existen).

Entregable requerido: `PROCESS_MAP.md`

```markdown
Por cada proceso identificado:
- nombre del proceso
- entrada (qué dispara el proceso)
- transformación (qué hace)
- salida (qué produce)
- dependencias (de qué depende)
- estado actual: [VERIFICADO | PARCIAL | SIMULADO | DESCONOCIDO]
- dominio destino: [CONSTITUTIONAL | EXPERIMENTAL | INTERFACE]
```

Criterio de avance: todo proceso en estado DESCONOCIDO debe resolverse antes de Fase 2.  
No se avanza con procesos de estado indeterminado.

---

### Fase 2 — Arquitectura Monorepo Destino

**Objetivo:** establecer la estructura física del repositorio con responsabilidades declaradas.

Entregables requeridos:

```bash
# Inicialización del monorepo
pnpm init
pnpm add -D turbo typescript eslint prettier

# Estructura base
mkdir -p packages/{mihm-core,campo-ob,events,db,auth,security,api-contracts,sources,config,testing,ui}
mkdir -p services/{api,ingestion,worker,agent}
mkdir -p apps/{observatory-dashboard,admin,demo}
mkdir -p experimental/cognitive-twin

# Turbo pipeline (turbo.json)
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

Cada paquete declara en su `package.json`:
```json
{
  "name": "@sfi/[nombre]",
  "version": "0.0.1",
  "domain": "constitutional|experimental|interface",
  "private": true
}
```

El campo `domain` no es cosmético. Es la declaración que los linters constitucionales verifican.

---

### Fase 3 — Risk Management + Zero Trust

**Objetivo:** establecer las restricciones que el sistema hace cumplir — no las que se declaran y se espera que se respeten.

#### Reglas de importación (ESLint + custom rules)

```javascript
// packages/config/eslint/domain-boundaries.js

// Ningún paquete de interface importa de experimental
// Ningún paquete de constitutional importa de experimental
// Ningún package de interface importa directamente de db

const DOMAIN_RULES = {
  'experimental': {
    canImportFrom: ['@sfi/api-contracts', '@sfi/config'],
    cannotImportFrom: ['@sfi/db', '@sfi/auth', '@sfi/security']
  },
  'interface': {
    canImportFrom: ['@sfi/ui', '@sfi/api-contracts', '@sfi/config'],
    cannotImportFrom: ['@sfi/db', '@sfi/mihm-core', '@sfi/campo-ob']
  }
}
```

#### Zero Trust entre servicios

```yaml
# services/api — único gateway autorizado
# Todas las requests entre servicios llevan:

headers:
  X-SFI-Service-Token: [token rotado cada 24h]
  X-SFI-Correlation-ID: [uuid del ciclo de request]
  X-SFI-Epistemic-Class: [clase epistémica del request]
  X-SFI-Node-ID: [identidad del nodo solicitante]
```

#### Variables de entorno — validación obligatoria

```typescript
// packages/config/src/env.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL:        z.string().url(),
  AUTH_SECRET:         z.string().min(32),
  API_GATEWAY_URL:     z.string().url(),
  NODE_ENV:            z.enum(['development', 'production', 'test']),
  SFI_FIELD_THRESHOLD: z.coerce.number().min(0).max(1).default(0.30),
  SFI_DECAY_LAMBDA:    z.coerce.number().positive().default(0.1),
})

// Falla hard en startup si el entorno no está completo.
// No hay modo degradado silencioso para variables constitucionales.
export const env = envSchema.parse(process.env)
```

---

### Fase 4 — Constitución Computacional del Observatorio

**Objetivo:** implementar `packages/mihm-core` y `packages/campo-ob` como código operativo.

#### `packages/mihm-core` — implementación

```typescript
// packages/mihm-core/src/index.ts

export interface SFINode {
  id:           string
  type:         NodeType        // BIO|ECO|ECON|INST|DIG|ALG|AGT|CYB|CULT|ENE|INF|PERC
  recurrence:   number          // R_n ∈ [0,1]
  tension:      number          // T_n ∈ [0,1]
  interfaces:   number          // I_n ∈ ℤ⁺
  noise:        number          // ε_n ∈ [0,1]
  coherence:    number          // C_n ∈ [0,1]
  activatedAt:  string
}

// Ec. ΩB-01: Calificación de nodo
export function qualifyNode(node: SFINode, delta: number = 0.01): number {
  const { recurrence, tension, interfaces, noise } = node
  return (recurrence * tension * interfaces) / (noise + delta)
}

// Ec. ΩB-04: Degradación de nodo
export function degradeNode(
  node: SFINode,
  alpha: number,
  t: number,
  initialDegradation: number = 0.1
): number {
  return initialDegradation * Math.exp(alpha * t) * (1 - node.coherence)
}

// Ec. ΩB-06: Capacidad operativa
export function operationalCapacity(
  node: SFINode,
  degradation: number,
  weightIn: number,
  weightOut: number
): number {
  return node.coherence * (1 - degradation) * Math.sqrt(weightIn * weightOut)
}

// Ec. ΩB-07: Urgencia de intervención
export function urgencyScore(
  degradation: number,
  capacity: number,
  sumLinkedWeights: number,
  epsilon: number = 0.001
): number {
  return degradation * (1 / (capacity + epsilon)) * sumLinkedWeights
}

// Umbral de activación por defecto
export const ACTIVATION_THRESHOLD = 0.30

// Niveles de capacidad operativa
export function capacityLevel(co: number): 'FULL' | 'REDUCED' | 'CRITICAL' | 'DEGRADED' {
  if (co >= 0.75) return 'FULL'
  if (co >= 0.50) return 'REDUCED'
  if (co >= 0.25) return 'CRITICAL'
  return 'DEGRADED'
}
```

#### `packages/campo-ob` — implementación

```typescript
// packages/campo-ob/src/node-types.ts
export const NODE_TYPES = [
  'BIO', 'ECO', 'ECON', 'INST', 'DIG',
  'ALG', 'AGT', 'CYB', 'CULT', 'ENE', 'INF', 'PERC'
] as const

export type NodeType = typeof NODE_TYPES[number]

// Distancia ontológica entre tipos (0 = mismo tipo, 3 = máxima distancia)
// Pendiente: formalización completa — ver BRECHA-001
export const ONTOLOGICAL_DISTANCE: Partial<Record<string, number>> = {
  'BIO-ECO':   1, 'BIO-CULT':  1, 'BIO-ENE':   2,
  'ECO-ECON':  2, 'ECO-ENE':   1, 'ECON-INST': 1,
  'ECON-CULT': 1, 'DIG-ALG':   1, 'DIG-ENE':   1,
  'DIG-PERC':  1, 'ALG-ECON':  2, 'INST-ALG':  2,
  'CULT-PERC': 1, 'PERC-ECO':  2, 'AGT-INF':   1,
  // ... expandir con calibración empírica
}

// packages/campo-ob/src/entry-protocol.ts
export type NodeEntryState =
  | 'LATENT'          // señal recibida, sin clasificar
  | 'ACTIVE_SIGNAL'   // recurrencia verificada ≥ 3
  | 'CANDIDATE'       // tensión confirmada
  | 'CLASSIFIED'      // tipo asignado, Q_n calculado
  | 'ACTIVE'          // integrado al campo

// packages/campo-ob/src/filter.ts
export type FilterResult =
  | { pass: true }
  | { pass: false; reason: 'SINGLE_OCCURRENCE' | 'REDUNDANT' | 'SCALE_BOUNDARY' | 'UNTRACEABLE' }

// packages/campo-ob/src/logbooks.ts
export type LogbookId = 'ΒΣ' | 'ΒΝ' | 'ΒV' | 'ΒF' | 'ΒM' | 'ΒD' | 'ΒK' | 'ΒR'
```

---

### Fase 5 — Dashboard Constitutivo

**Objetivo:** construir `apps/observatory-dashboard` como observador puro del campo.

El dashboard no calcula. Consume.

```typescript
// apps/observatory-dashboard — regla de diseño

// PERMITIDO
const fieldState = await fetch('/api/field/state')     // consume services/api
const activeNodes = await fetch('/api/nodes/active')   // consume services/api

// PROHIBIDO
import { qualifyNode } from '@sfi/mihm-core'           // lógica de negocio en UI
import { db } from '@sfi/db'                           // acceso directo a DB
```

Componentes del dashboard (orden de prioridad):
1. Estado del campo Φ_CAMPO(t) — valor numérico + régimen actual
2. Nodos activos por tipo — capacidad operativa CO_n de cada uno
3. Stream de eventos epistémicos recientes — con clase epistémica visible
4. Vínculos activos — W_ij por par de tipos
5. Alertas de degradación — nodos con D_n > umbral

La clase epistémica de cada dato debe ser visible en la UI.  
El usuario sabe siempre si está observando evidencia, inferencia o proyección.

---

### Fase 6 — Contrato de Aplicativos Independientes

**Objetivo:** definir el contrato formal que cualquier aplicativo futuro debe cumplir para ser consumidor legítimo del observatorio.

```typescript
// packages/api-contracts/src/consumer-contract.ts

interface ObservatoryConsumerContract {
  // El aplicativo declara su identidad de nodo
  nodeId:   string
  nodeType: NodeType

  // El aplicativo solo puede:
  reads:  ReadCapability[]   // qué puede leer del campo
  writes: WriteCapability[]  // qué puede proponer (no ejecutar)

  // El aplicativo nunca puede:
  // - escribir directamente en DB
  // - modificar estado de campo sin pasar por services/api
  // - suprimir la clase epistémica de datos que consume
}

type ReadCapability =
  | 'field.state'
  | 'nodes.active'
  | 'nodes.degradation'
  | 'events.stream'
  | 'logbooks.read'
  | 'sources.health'

type WriteCapability =
  | 'events.propose'     // propone evento — no lo ejecuta
  | 'signals.submit'     // envía señal a ingestion
  | 'observations.log'   // registra observación con ρ
```

---

### Fase 7 — Migración Controlada

**Objetivo:** migrar solo lo que sobrevivió auditoría de Fase 0.

Criterios de migración (todos deben cumplirse):

```
□ El proceso tiene propietario declarado
□ El proceso tiene schema de entrada y salida definido
□ El proceso es trazable (qué lo dispara, qué produce)
□ El proceso ha sido clasificado como SALVAR en auditoría Fase 0
□ El proceso tiene tests que verifican comportamiento esperado
□ El proceso no mezcla lógica de dominio con estado de interfaz
```

Si un proceso no cumple todos los criterios: no migra.  
Se documenta la razón en `AUDIT_LOG.md` y se archiva.

**La decisión de no migrar es una decisión de diseño, no un fracaso.**

Orden de migración:
1. `packages/config` — base de todo
2. `packages/db` — esquemas desde cero con Drizzle
3. `packages/events` — event store con esquema epistémico
4. `packages/auth` — identidad de nodo
5. `packages/security` — zero trust
6. `packages/mihm-core` — implementación de ecuaciones
7. `packages/campo-ob` — protocolo de observatorio
8. `services/ingestion` — recepción de señales
9. `services/api` — gateway único
10. `services/worker` — procesamiento asíncrono
11. `apps/observatory-dashboard` — observador del campo
12. `apps/admin` — gestión de bitácoras

---

### Fase 8 — SFI Evaluator

**No comienza antes de que Fase 7 esté verificada.**

El evaluador es un consumidor del observatorio — no un sistema independiente.

Usa:
- `evidence lineage` del event store para fundamentar evaluaciones
- `field state` actual para contextualizar
- `source health` para declarar confiabilidad de sus insumos
- `uncertainty` explícita en cada output
- `confidence intervals` derivados de ecuaciones de `mihm-core`
- `degradation projections` basadas en D_n(t)

No usa:
- análisis heurístico sin trazabilidad
- estado local de cliente como fuente de verdad
- inferencias sin clase epistémica declarada

**La diferencia operativa:**

```
Sistema sin evaluador legítimo:
"Tu organización tiene alta fricción."

Sistema con evaluador legítimo:
"Se identifican 3 nodos en estado CRÍTICO (CO_n < 0.25).
La degradación promedio del campo ECON→CULT es D=0.71.
Esta inferencia tiene clase: DERIVED, confianza: ρ=0.64.
Fuentes: ENOE Q4-2024, IFT conectividad municipal, ENVIPE 2024.
Incertidumbre: ausencia de datos de INST para el período analizado."
```

Esa diferencia es la legitimidad del sistema.

---

## REGLAS DE COMUNICACIÓN INTER-SERVICIO

```
app         → services/api          ✓ REST/GraphQL autenticado
services/api → packages/db          ✓ acceso controlado via ORM
services/api → services/worker      ✓ queue events
services/api → services/ingestion   ✓ forward signals
services/agent → services/api       ✓ solo propuestas, lectura autorizada
services/agent → packages/db        ✗ PROHIBIDO
apps        → packages/db           ✗ PROHIBIDO
apps        → packages/mihm-core    ✗ PROHIBIDO (solo vía api)
experimental → packages/db          ✗ PROHIBIDO
app ↔ app                           ✗ PROHIBIDO
```

---

## DECLARACIÓN DE BRECHAS ACTIVAS

```
BRECHA-001: distancia ontológica d_ij
  Estado: parcialmente mapeada
  Pendiente: calibración empírica de pares no documentados
  Impacto: Ec. ΩB-03 opera con valores aproximados

BRECHA-002: kernel de memoria K(t)
  Estado: forma funcional no especificada
  Pendiente: datos históricos del campo para calibración
  Impacto: Ley ΩB-04 no es operativa con precisión

BRECHA-003: protocolo de cuantificación de ρ por tipo de fuente
  Estado: rango [0,1] definido, criterios de asignación pendientes
  Pendiente: tabla de ρ_base por tipo de fuente y por plano ontológico

BRECHA-004: Modo Ciego Operativo
  Estado: declarado en CAMPO·ΩB v1.0, no implementado
  Pendiente: protocolo de entrada, operación y salida del modo
```

Las brechas son conocimiento estructurado.  
No son bugs.  
Son el límite honesto del sistema en este régimen.

---

## LEY FUNDACIONAL DEL SISTEMA

> "El objetivo no es que nada pase.  
> El objetivo es reducir la brecha entre evento adverso y retorno a operatividad."

El sistema no construye invulnerabilidad.  
Construye resiliencia observable, degradación controlada, recuperación trazable.

---

## REGISTRO DE ESTADO

```
CAMPO·ΩB Monorepo Constitution v1.0
Protocolo de Depuración Institucional

Fase 0: COMPLETADA — auditoría forense existente
Fase 1: PENDIENTE — mapa de procesos
Fase 2: PENDIENTE — arquitectura monorepo
Fase 3: PENDIENTE — risk management + zero trust
Fase 4: PENDIENTE — constitución computacional
Fase 5: PENDIENTE — dashboard constitutivo
Fase 6: PENDIENTE — contrato de aplicativos
Fase 7: PENDIENTE — migración controlada
Fase 8: BLOQUEADA — no inicia sin Fase 7 verificada

Asiento Cognitivo Primario: Aptymok
La observación continúa.
```