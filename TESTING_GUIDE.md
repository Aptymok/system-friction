# System Friction - Testing & Validation Guide

## CÓMO VERIFICAR QUE TODO FUNCIONA

### Prueba 1: Score Acumulación
```
1. Abre DevTools → Console
2. Ejecuta: localStorage.getItem("sf_score")
3. Resultado esperado: "0" (primera visita)

4. Click en cualquier link/CTA
5. Espera 1 segundo
6. Ejecuta: localStorage.getItem("sf_score") 
7. Resultado esperado: > 0 (debe haber aumentado)
```

### Prueba 2: Role Weighted Scoring
```
1. URL normal: visitors.html
   → localStorage["sf_role"] = "operator"
   → Click CTA → score += 3

2. Con parámetro: visitors.html?role=director
   → localStorage["sf_role"] = "director"  
   → Script carga automáticamente
   → Click CTA → score += 6 (3 × 2.0)

3. Verificar multiplicador funciona:
   localStorage.getItem("sf_role") 
   → debe mostrar "director"
```

### Prueba 3: Priority Detection (Usuario Valioso Silencioso)
```
1. Ingresa en Observatorio o MOP-H → Email gate
2. Escribe: user@mycompany.com (dominio corporativo)
3. Click OK para confirmar
4. Console: localStorage.getItem("sf_priority")
5. Resultado esperado: "high"

6. Intenta new incognito → vuelve a probar con gmail@gmail.com
7. Console: localStorage.getItem("sf_priority")  
8. Resultado esperado: "normal"
```

### Prueba 4: Double Threshold (Acceso a Observatory)
```
Escenario A: Sin email, bajo score
1. Abre Observatorio 
2. Console: localStorage.getItem("sf_score") 
3. Si < 10, verás solo 2 nodos (preview)
4. Click "Mostrar Sistema" → aparecen 2 nodos en canvas

Escenario B: Con email corporativo (priority=high)
1. Deja Email con dominio corporativo
2. Abre Observatorio
3. Deberías ver 18 nodos (full access) aunque score sea bajo
4. Canvas muestra sistema completo

Escenario C: Score alto (>25)
1. Interactúa mucho en site (múltiples páginas, eventos)
2. Abre Observatorio  
3. Verás todos los 18 nodos
```

### Prueba 5: Event History Logging
```
1. Navega por varias páginas
2. Haz múltiples clicks
3. Console: 
   let history = JSON.parse(localStorage.getItem("sf_history"))
   history.length
4. Resultado esperado: número > 0 (eventos registrados)

5. Inspect history:
   history.forEach(e => console.log(e.event))
6. Deberías ver: page_view, cta_click, etc.
```

### Prueba 6: Track Payload Verification
```
1. Abre Network tab en DevTools
2. Filter: "formspree.io"
3. Haz una acción (click, ingresa email)
4. Verifica en Network que se envíe POST a formspree
5. Click en el request → Preview
6. Deberías ver JSON con: event, role, score, priority, email
```

### Prueba 7: Low Quality Session Detection
```
1. Abre página
2. Espera < 3 segundos
3. Recarga página (simula salida rápida)
4. Si score < 5 AND priority != "high":
   → Debería trackear "low_quality_session"
5. Network → formspree debería mostrar ese evento
```

---

## CHECKLIST DE VALIDACIÓN

### Sistema de Scoring
- [ ] Score inicia en 0
- [ ] Score aumenta con eventos
- [ ] Role multiplica score (director 2x vs operator 1x)
- [ ] Score persiste entre páginas
- [ ] Score se guarda en localStorage

### Priority Detection
- [ ] Email corporativo → priority=high
- [ ] Gmail/yahoo → priority=normal
- [ ] High priority bypass de restricciones
- [ ] Priority persiste en localStorage

### Data Degradation  
- [ ] Sin email / score<10 → 2 nodos + connections filtradas
- [ ] Score 10-24 → 5 nodos + connections
- [ ] Score>25 OR priority=high → 18 nodos + todas connections

### Tracking
- [ ] Cada evento crea entry en sf_history
- [ ] Payload enviado a Formspree contiene: event, role, score, priority
- [ ] Email quality detectado (low_intent vs high_intent)
- [ ] Session duration tracked on page exit

### URL Parameters
- [ ] ?role=director → carga correctamente
- [ ] ?role=invalid → ignora (no rompe)
- [ ] Sin parámetro → default "unknown"

---

## DEBUGGING RÁPIDO

### Si score no aumenta
```javascript
// En console:
track("test_event")
localStorage.getItem("sf_score")
// Debería mostrar valor > anterior
```

### Si priority no se detecta
```javascript
// Simula:
localStorage.setItem("sf_email", "test@company.com")
track("email_captured")
localStorage.getItem("sf_priority")
// Debería mostrar "high"
```

### Si degradation no funciona
```javascript
localStorage.removeItem("sf_score")
localStorage.setItem("sf_score", "5")
// Recarga observatorio.html
// Deberías ver 2 nodos máximo
```

### Si Formspree no recibe eventos
```javascript
// Verifica endpoint en core.js:
// fetch("https://formspree.io/f/xgopjkop", ...)
// Debería estar correcto

// Chequea Network tab:
// POST a formspree debería tener status 200
```

---

## DATOS ESPERADOS DESPUÉS DE 1 SEMANA

```
Evento Analytics:
- page_view: ~100-200 (depende de tráfico)
- cta_click: ~30-50
- email_captured: ~10-20  
- moph_start: ~5-10
- moph_complete: ~1-5

Score Distribution:
- 0-10: ~40% (visitors de corta duración)
- 10-20: ~35% (exploradores)
- 20-50: ~20% (usuarios comprometidos)
- 50+: ~5% (power users)

Role Signals (si URL param usado):
- priority=normal: ~80%
- priority=high: ~20%

Session Quality:
- low_quality_session: ~15-25% (bounce)
- session_end: ~75-85% (engagement)
```

---

## CÓMO ACCEDER A DATOS EN FORMSPREE

1. Login a Formspree.io
2. Ir a form xgopjkop
3. Submissions → verás todos los eventos enviados
4. Puedes exportar CSV para análisis en Excel/Google Sheets

---

## AHORA: CONSOLIDACIÓN

✅ Sistema está pronto para observación pasiva
✅ No hacer cambios por 2-3 semanas
✅ Recolectar datos naturales
✅ En semana 3: analizar y decidir próximo paso
