# System Friction - Inteligence Layer v1.0
## Informe Ejecutivo de Consolidación

**Fecha**: 14 Abril 2026  
**Estado**: CONSOLIDADO Y OPERATIVO  
**Próximo Checkpoint**: 2 semanas de observación de datos  

---

## 1. CAMBIOS EJECUTADOS (PASO 0)

### 1.1 Capa de Autoridad
```javascript
const ROLE_WEIGHTS = {
  operator: 1.0,      // usuario operativo, bajo poder de decisión
  manager: 1.5,       // gestor con alguna autoridad
  director: 2.0,      // toma decisiones  
  founder: 2.5        // máxima autoridad
}
```

**Efecto**: Un evento (ej: email_captured) vale:
- Operador: 10 puntos
- Manager: 15 puntos  
- Director: 20 puntos
- Founder: 25 puntos

### 1.2 Detección Automática de "Usuario Valioso Silencioso"
```javascript
// Si captura email corporativo (no gmail/yahoo/hotmail):
localStorage.setItem("sf_priority", "high")
```

**Escenario típico**:
- Usuario entra, ve poco (score bajo)
- Deja email: usuario@empresa.com
- Sistema automáticamente lo clasifica como HIGH PRIORITY
- Recibe acceso completo aunque score < 10

**Impacto**: No penaliza a ejecutivos ocupados que deciden rápido sin explorar.

### 1.3 Double Threshold (Score + Priority)
```javascript
if (priority === "high" OR score > 25) {
  // Full access - 18 nodos, données completes
}
else if (score >= 10) {
  // Moderate access - 5 nodos, tensión visible
}
else {
  // Preview only - 2 nodos, máxima fricción
}
```

| Score | Priority | Acceso | Nodos | Estrategia |
|-------|----------|--------|-------|-----------|
| 5 | normal | Preview | 2 | Capturar email |
| 15 | normal | Moderate | 5 | Exploración |
| 30 | normal | Full | 18 | Usuario comprometido |
| 5 | high | Full | 18 | Director ocupado |
| 20 | high | Full | 18 | Decisor corporativo |

### 1.4 Pattern Detection - Explorador
```javascript
if (event === "session_end" && score > 20 && !emailCaptured) {
  track("high_activity_low_conversion")
  // Usuario exploró mucho pero nunca se comprometió
}
```

### 1.5 Improved Session Quality Filter
```javascript
// Solo marca como "low_quality" si:
// - Duración < 5 segundos AND
// - Score < 5 AND  
// - Priority !== "high"
// (Protege a ejecutivos que entran y salen rápido)
```

### 1.6 URL Parameter for Testing
```
Sistema.html?role=director
→ localStorage["sf_role"] = "director"
→ Cualquier evento vale 2x
```

---

## 2. DATOS QUE AHORA RECOLECTA

Cada evento ahora envía:
```json
{
  "event": "email_captured",
  "role": "director",
  "score": 45,
  "weight": 20,
  "priority": "high",
  "profile": "executive",
  "email": "user@empresa.com",
  "path": "/mop-h-form.html",
  "timestamp": 1649999999999
}
```

**Analítica nueva que permite:**
- ¿Qué roles convierten más?
- ¿Qué score predice cierre?
- ¿Qué emails son de alta intención?
- ¿Qué patrones preceden abandono?

---

## 3. ESTADO ACTUAL DEL SISTEMA

### Capabilidades Operativas
✅ Clasifica usuarios por engagement (score)  
✅ Detecta autoridad/rol de usuario  
✅ Adapta contenido según tier (preview/moderate/full)  
✅ Protege usuarios valiosos de fricción excesiva  
✅ Identifica patrones de exploración  
✅ Recolecta datos estructurados para análisis  
✅ URL parameters para testing manual  

### Capabilidades NO ACTIVAS (Para Paso 1-3)
❌ Rutas completamente separadas por rol  
❌ Predicción de cierre ("Closure Value Score")  
❌ Dashboard de inteligencia interna  
❌ Optimización automática de CTA por rol  
❌ A/B testing de mensajes  

### Por qué parar aquí
1. **Sistema actual es estable**: No hay bugs operativos
2. **Datos insuficientes**: Necesitas 2-3 semanas de datos reales
3. **Riesgo de over-optimization**: No optimizar basado en suposiciones
4. **Principio de Consolidación**: "Move fast, but consolidate before scaling"

---

## 4. PRÓXIMOS PASOS (RECOMENDACIÓN)

### Semanas 1-2: Observación Pura
- ✅ Sistema ya recolecta datos
- ✅ Monitorea Formspree por patrones
- NO hagas cambios
- Documenta: ¿Qué roles convierten? ¿En qué punto abandonan?

### Semana 3: Análisis & Decisión
Con datos reales, decide:

**Opción A**: Patrón claro (ej: directores 70% conversión vs operadores 20%)
→ Ejecuta PASO 1 (rutas separadas)

**Opción B**: Patrones contradictorios
→ Agrega más señales antes de Paso 1
→ Posiblemente un pequeño role selector en UI

**Opción C**: Conversion está bien como está
→ Termina el proyecto
→ Sistema actual ya optimizó lo que podía

### Semana 4+: Paso 1 (si aplica)
Implementar 3 rutas:
- Ejecutiva (skip tech, direct to MOP-H)
- Técnica (full observatory, deep explore)  
- Enganche (degraded, email-gate heavy)

---

## 5. MÉTRICAS CLAVE A MONITOREAR

Observa estos números durante 2-3 semanas:

```
Conversión por Score:
- Score < 10: _ % → email
- Score 10-20: _ % → email  
- Score > 20: _ % → moph_complete

Conversión por Priority:
- priority=normal: _ %
- priority=high: _ %

Abandono por Session Duration:
- < 1min: _ %
- 1-5min: _ %
- > 5min: _ %

Roles vistos (si URL parameter usado):
- operator: _ %
- manager: _ %
- director: _ %
- founder: _ %
```

---

## 6. LÍMITE DE CONSOLIDACIÓN

**Estado congelado hasta validación:**

El siguiente cambio estructural SOLO se ejecuta después de:
1. Mínimo 300 eventos capturados
2. Patrón claro visible (80%+ confianza)
3. Decisión explícita del usuario

**Por qué no auto-optimizar:**
- Sistema que cambia solo tiende a sobre-ajustarse
- Ruido en datos tempranos puede llevar a decisiones malas
- Mejor cambios deliberados basados en datos sólidos

---

## 7. RESUMEN TÉCNICO

### Files Modificados
- `js/core.js`: +120 líneas (scoring, history, detection)
- `js/gate.js`: +20 líneas (priority detection)
- `observatorio.html`: Lógica de degradación actualizada
- `mop-h-form.html`: tracking en MOPH eventos

### Nueva Funcionalidad
- `updateUserScore()`: Calcula score con multiplicadores de rol
- `logEventHistory()`: Mantiene historial JSON en localStorage
- `track()`: Envía payload completo a Formspree
- Detección de "valuable silent user"
- Detección de "explorer pattern"
- Double threshold logic

### Storage Keys
```
sf_score      → numeric score acumulado
sf_role       → operator|manager|director|founder
sf_priority   → normal|high
sf_history    → JSON array de eventos
sf_email      → email capturado
sf_profile    → technical|executive|engaged
```

---

## 8. CIERRE

El sistema ahora:
- ✅ **Observa** comportamiento de usuarios
- ✅ **Recuerda** interacciones entre sesiones  
- ✅ **Clasifica** usuarios por valor real
- ✅ **Adapta** contenido según clasificación
- ✅ **Genera datos** para optimización futura

**No es un filtro estático. Es un clasificador inteligente con memoria.**

Siguiente mejora: esperar datos reales.

---

**Redactado**: Sistema Friction Intelligence Layer  
**Responsabilidad**: Alineación estratégica con capacidad técnica de implementación  
**Consolidación**: ESTABLECIDA - Sin cambios estructurales hasta Semana 3
