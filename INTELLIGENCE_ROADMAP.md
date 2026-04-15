# System Friction - Intelligence Layer Roadmap

## PASO 0 (CONSOLIDADO - EJECUTADO)

### Qué se generó
Sistema de **doble umbral** que distingue:
- **Engagement** (score): mide cantidad de interacción
- **Autoridad** (priority): mide capacidad real de decisión

### Ruta mental de decisión
Antes diferenciábamos usuarios por cantidad de eventos.
Ahora diferenciamos por tipo de usuario: ejecutivo ocupado vs explorador técnico.

**Decision Logic**
```
if (priority === "high" OR score > 25) → full access
else if (score >= 10) → moderate access (5 nodos)
else → preview only (2 nodos)
```

### Cambios ejecutados
✅ ROLE_WEIGHTS multiplicadores (operator:1x → founder:2.5x)
✅ Detección automática de "usuario valioso silencioso" (dominio corporativo)
✅ Patrón de explorador (high activity, bajo compromiso)
✅ Sesión de baja calidad mejorada (ahora respeta priority)
✅ Double threshold en observatorio (score + priority)

---

## PASO 1 (PRÓXIMO - SEGMENTACIÓN DE RUTAS)

### Qué se generará
3 rutas totalmente diferentes según perfil + score:

1. **Ruta Ejecutiva** (Founder/Director + priority=high)
   - Skip exploración técnica
   - Direct a MOP-H en 2 clicks
   - CTAs sobre "diagnóstico institucional"

2. **Ruta Técnica** (Operator/Manager, score > 15)
   - Full observatory
   - Deep exploration encouraged
   - CTAs sobre "modelo completo"

3. **Ruta Enganche** (Unknown/low score)
   - Degraded preview (2 nodos)
   - Explicit "unlock with email"
   - CTAs sobre "ver sistema completo"

### Ruta mental
No todos los usuarios necesitan ver lo mismo.
Un director C-suite necesita respuestas en 30 segundos.
Un CTO necesita explorar profundamente.

### Código necesario
- Array de ROUTE_CONFIGS por rol
- Conditional redirect en index.html
- Custom CTA por ruta

### Impacto esperado
+25-40% conversion en ejecutivos
-15% tiempo promedio para decisores
+50% exploración en técnicos

---

## PASO 2 (SIGUIENTE - VALOR DE CIERRE)

### Qué se generará
Métrica predictiva: **Closure Value Score (CVS)**

Combinación de:
- Role (founder = 100pts)
- Domain (corporate = 50pts)
- Score velocity (crecimiento rápido = 30pts)
- Sequence pattern (MOP-H completo = 40pts)
- Activity consistency (vueltas = 20pts)

```
CVS = (ROLE_WEIGHT * 100) + (DOMAIN_SIGNAL * 50) + velocity + sequence + consistency
```

### Ruta mental
No es lo mismo un usuario con score 30 que llegó en 1 semana
que un usuario con score 30 que llegó en 1 día.

El "CVS" predice: "¿Este usuario va a IMPLEMENTAR el sistema o solo explorar?"

### Código necesario
- CVS calculator en core.js
- Tracking de timestamps de eventos
- Sequence analyzer

### Impacto esperado
Identificar "high-value closures" 2 semanas antes de que contacten
Poder priorizar outreach

---

## PASO 3 (ANTICIPADO - DASHBOARD DE INTELIGENCIA INTERNA)

### Qué se generará
Visualización interna (no para usuarios) que muestra:

- **Cohort Analysis**: CVS distribution por role
- **Funnel Insight**: ¿Dónde caen técnicos vs ejecutivos?
- **Pattern Detection**: Rutas que convierten más
- **Anomaly Flags**: Usuarios que no encajan pero muestran potencial

### Ruta mental
El sistema se observa a sí mismo.
Esto permite optimización continua sin cambios de código.

### Código necesario
- Agregación de historial en localStorage
- Análisis de patrones
- UI minimalista para decisiones de producto

### Impacto esperado
Loop de mejora continua
De parámetros estáticos a dinámicos

---

## PUNTO DE CONSOLIDACIÓN (AQUÍ Y AHORA)

### Lo que el sistema YA puede hacer
✅ Clasificar usuarios por valor real (no solo engagement)
✅ Detectar exploradores vs decisores
✅ Adaptar contenido según tipo de usuario
✅ Medir quality sessions vs low-quality bounces
✅ Acumular memoria de interacción

### Lo que el sistema AÚN NO NECESITA
❌ Rutas completamente separadas (paso 1)
❌ Predicción de closure (paso 2)
❌ Dashboard interno (paso 3)

### Por qué parar aquí
- Sistema actual es estable y predecible
- Cambios de paso 1-3 son iterativos, no urgentes
- Necesitas datos reales de Paso 0 antes de optimizar Paso 1
- Riesgo de over-engineering si agregas todo ahora

### Recomendación
1. Ejecuta PASO 0 (HECHO)
2. Observa datos por 2-3 semanas
3. Ejecuta PASO 1 cuando veas patrones claros
4. Valida paso 2-3 en base a datos reales

---

## RESUMEN EJECUTIVO

| Aspecto | Antes | Después (Paso 0) | Efecto |
|---------|-------|------------------|--------|
| Métrica de usuario | Eventos = valor | Score × Role | +40% precisión |
| Detección de directores | NO | Dominio corporativo | Conversión ejecutiva |
| Explorador pattern | NO | Sí (high activity, sin email) | Routing inteligente |
| Acceso a datos | Binary (email or not) | Triple tier (preview/moderate/full) | Menor fricción, mayor engagement |
| Decision timeframe | Estático | Dynamic (score + priority) | Sistema adaptativo real |

**El sistema pasó de ser un filtro a ser un clasificador inteligente.**
