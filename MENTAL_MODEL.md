# System Friction - Mental Model Documentation
## Evolución Conceptual del Sistema

---

## ETAPA 1: FILTRO BINARIO (Semana 1)
**Estado**: Demo visual con control de acceso

### Pregunta Estructural
"¿Cómo evitar que cualquiera vea datos sensibles?"

### Solución
```
if (usuario_tiene_email) {
  mostrar_sistema_completo()
} else {
  mostrar_preview()
}
```

### Limitación Inherente
- No distingue entre ejecutivo ocupado y explorador técnico
- Ejecutivo que deja email rápido = mismo score que técnico que lo hace lentamente
- Sistema favorece a quien más interactúa, no quien más decide

### Resultado
"Filtro que abierto es demo, que cerrado es barrera"

---

## ETAPA 2: CONTADOR CON MEMORIA (Semana 1-2)
**Estado**: Observador pasivo con scoring

### Pregunta Estructural
"¿Si todo usuario deja señal, puedes medir quién deja MEJOR señal?"

### Solución
```javascript
function track(event) {
  score += EVENT_WEIGHTS[event]
  localStorage.setItem("sf_score", score)
  // Enviar a servidor
}
```

### Avance Conceptual
**De**: "Tiene acceso o no"  
**A**: "Cuánto ha demostrado compromiso"

### Limitación Nueva
- Mide CANTIDAD de interacción, no TIPO de usuario
- Manager que explora 2 horas: score 50
- CEO que entra 30 seg y deja email corporativo: score 10
- Sistema recompensa el tiempo gastado, NO la intención de decisión

### Resultado
"Contador que favorece a curiosos sobre decisores"

---

## ETAPA 3: INTELIGENCIA DUAL (Semana 2-3)
**Estado**: Clasificador con memoria y autoridad

### Pregunta Estructural
"¿Qué si algunos usuarios simplemente son más valiosos por definición, sin importar cuánto tiempo gasten?"

### Solución
```javascript
// Dimensión 1: Engagement
score = base_score * TIME * INTERACTION_DEPTH

// Dimensión 2: Authority
role_multiplier = ROLE_WEIGHTS[role]
score = score * role_multiplier

// Dimensión 3: Intent Signal
if (email.domain === corporate) {
  priority = "high"
}

// Decision Logic
if (priority === "high" OR score > 25) {
  full_access()
}
```

### Avance Conceptual
**De**: "Score = valor de usuario"  
**A**: "Score mide una dimensión, autoridad mide otra"

### Analogía Real
```
Antes:
  Hotel ve checkout rápido como "malo" (poco tiempo)
  
Ahora:
  Hotel ve CEO que llega, pide suite, se va en 2 horas como "excelente"
  (No mide tiempo, mide intención + poder de compra)
```

### Resultado
"Sistema que distingue entre quien juega y quien decide"

---

## PASO 1 (ANTICIPADO): RUTAS DIFERENCIADAS

### Pregunta Estructual (Futura)
"Si ahora sé QUIÉN es cada usuario, ¿por qué mostrarle lo mismo a todos?"

### Solución Esperada
```javascript
const profile = getProfile() // ejecutivo, técnico, evaluador

if (profile === "executive") {
  route = EXECUTIVE_FLOW   // MOP-H en 2 clicks
  cta = "Diagnóstico institucional"
} 
else if (profile === "technical") {
  route = TECHNICAL_FLOW   // Observatory completo
  cta = "Explorar modelo"
}
```

### Cambio Mental
**De**: "Un sistema para todos"  
**A**: "Sistema que se adapta a quién está usando"

### Impacto Esperado
- Ejecutivos: -50% tiempo decisión
- Técnicos: +200% profundidad exploración
- Estudiantes: Acceso degradado pero factible

### Por Qué No Ahora
- Necesitas datos reales para validar que "ejecutivo" existe
- Posible que no exista diferencia real entre clickstreams
- Posible que todos abandonen en mismo punto
- Mejor esperar datos que suponer arquetipos

---

## PASO 2 (ANTICIPADO): PREDICCIÓN DE VALORBR>
### Pregunta Estructural (Futura)
"De todos los usuarios que dejan email, ¿cuál va a IMPLEMENTAR realmente?"

### Solución Esperada
```javascript
function calculateClosureValueScore(user) {
  const baseScore = score
  
  // Multiplicador: ¿Quién es?
  const roleWeight = ROLE_WEIGHTS[role]
  
  // Señal: ¿De dónde viene?
  const domainSignal = getDomainSignal(email) // corporate = +50
  
  // Velocidad: ¿Qué tan rápido?
  const velocity = (lastScore - initialScore) / timeInDays
  
  // Secuencia: ¿Hizo las cosas en orden?
  const sequenceLoyalty = getPatternMatch(history)
  
  const CVS = baseScore * roleWeight + domainSignal + velocity + sequenceLoyalty
  
  return CVS > 60 ? "HIGH_CLOSURE_PROBABILITY" : "LOW"
}
```

### Cambio Mental
**De**: "Este usuario está comprometido"  
**A**: "Este usuario vA A FIRMAR (o no)"

### Por Qué No Ahora
- No tienes sigientes historiales completados
- Conversiones reales recién empiezan en 1-2 semanas
- Predicción sin validación = overfitting
- Mejor esperar patrón claro (80%+ confianza)

---

## PASO 3 (ANTICIPADO): AUTO-OBSERVACIÓN DEL SISTEMA

### Pregunta Estructural (Futura)
"¿Y si el sistema observa sus propias métricas y se ajusta solo?"

### Solución Esperada
```javascript
// Dashboard interno (no visible para usuarios)
const systemIntelligence = {
  // ¿Está funcionando?
  conversionRateByRole: {...},
  abandonment_point: "...",
  
  // ¿Qué está roto?
  anomalies: [{
    symptom: "Directores abandonan en MOP-H P.5",
    severity: "HIGH"
  }],
  
  // ¿Qué deberíamos hacer?
  recommendations: [
    "Simplificar MOP-H fase 2",
    "Agregar rol selector"
  ]
}
```

### Cambio Mental
**De**: "Sistema que observa usuarios"  
**A**: "Sistema que se observa a sí mismo"

### Por Qué No Ahora
- Necesitas validar PASO 1 primero
- Dashboard sin acción detrás = ruido
- Riesgo de auto-optimización incorrecta
- Mejor mantenerlo manual hasta tener confianza

---

## ARQUITECTURA MENTAL COMPLETA

```
CAPA 1: OBSERVACIÓN
├─ Cada click → evento
├─ Cada evento → histórico
└─ Histórico → patrón

CAPA 2: CLASIFICACIÓN
├─ Score = cantidad de señal
├─ Role = tipo de usuario  
├─ Priority = intención inmediata
└─ CVS (futuro) = intención real

CAPA 3: ADAPTACIÓN
├─ Paso 0 (actual): Threshold doble
├─ Paso 1 (próximo): Rutas distintas
├─ Paso 2 (anticipado): Predicción
└─ Paso 3 (lejos): Auto-ajuste

CAPA 4: DECISIÓN
├─ Server side: Priorizar leads por CVS
├─ Product side: Qué show/hide según perfil
├─ Strategy side: Dónde invertir (ejecutivos vs técnicos)
└─ Operacional: Customizar respuestas por arquetype
```

---

## PRINCIPIOS GUÍA DE DECISIÓN

### 1. Data Over Intuition
```
NO: "Creo que los ejecutivos..."
SÍ: "Los datos de 300 sesiones muestran que..."
```

### 2. Consolidation Over Velocity
```
NO: Agregar features cada semana
SÍ: Esperar 2 semanas, validar patrón, LUEGO agregar
```

### 3. Separation of Concerns
```
-Scoring: mide engagement (no decide acceso)
-Role: mide autoridad (no mide engagement)
-Priority: mide intención inmediata (no predice conversión)
-CVS: predice conversión (no entiende engagement medio plazo)

Cada capa es independiente.
```

### 4. Graceful Degradation
```
Si role=unknown: usar multiplicador 1.0 (neutro)
Si priority=unknown: usar normal (conservador)
Si email=unknown: no tracar como high_intent

Sistema sigue funcionando sin datos completos.
```

### 5. Reversibility
```
Todos los datos son rastreados (.csv exportable)
Todas las decisiones son reversibles (no irreversibles)
Todas las features tienen OFF switch

Si paso 1 falla: rollback a Etapa 3 sin trauma.
```

---

## MAPA MENTAL: ¿QUÉ A QUIÉN, CUÁNDO, POR QUÉ?

```
USUARIO                 ESCENARIO              QUÉ SUCEDE
─────────────────────────────────────────────────────────

Ejecutivo               Entra en Observatorio
ocupado                 • Baja score (<10)     → ve 2 nodos (preview)
que deja                • Deja email corp      → system detecta priority=high
email corp              → RESULTADO: se abre la vista completa INMEDIATAMENTE
                                     (no lo penaliza por no explorar)

Técnico                 Entra en Observatorio
curioso                 • Explora 30 min       → score sube a 35
no convierte            • Nunca deja email     → RESULTADO: ve 18 nodos
(explorer)              → signal: "high_activity_low_conversion"
                                  → se anota para seguimiento

Estudiante              Entra en Observatorio
bajo contexto           • Baja score           → ve 2 nodos
bajo dinero             • Email @gmail.com     → priority=normal
                        → RESULTADO: preview, pero accesible
                                    (fricción deliberada para educación)

Manager                 Caso de uso completo
con presupuesto         • Explora 20 min       → score ~20
                        • Deja trabajo email   → priority=high + score 20
                        • Inicia MOP-H         → score +15 → score ~35
                        → RESULTADO: usuarios de mayor probabilidad
                                    (datos lo demuestran)
```

---

## CIERRE: MENTALIDAD CORRECTA

**Antes** (Sitio transaccional):
"¿Cómo hago que ver datos cueste algo?"

**Ahora** (Sistema inteligente):
"¿Cómo sé quién merece ver datos sin haberlo forzado a probar?"

**Siguiente** (Sistema estratégico):
"¿Cómo routeo a cada usuario al camino donde AMBOS ganamos?"

---

**Creado**: Sistema de Inteligencia de SF  
**Propósito**: Documentar evolución conceptual
**Próximo Reviewer**: Después de 2 semanas con datos reales
