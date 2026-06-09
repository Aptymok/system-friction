# ScoreFriction Operating Guide

ScoreFriction observa senales culturales como evidencia imperfecta. No califica si una cancion es buena o mala: lee friccion, cobertura, persistencia y posibilidad de protoatractor.

## Estado

`live` significa que el scope tiene al menos una observacion real conectada y puede mostrar una lectura cultural visible. Sigue siendo una lectura con incertidumbre: depende de cobertura, fuente y vectores disponibles.

`degraded` significa que el contrato responde, pero falta evidencia suficiente, faltan vectores, falta bitacora o no hay acceso server-side para leer la fuente viva. En ese estado no se debe declarar regimen cultural fuerte.

## Source Coverage

`sourceCoverage` indica cuanta cobertura aporta la evidencia disponible. Cobertura baja no niega la senal; solo dice que la lectura es inicial y necesita mas fuentes, mas observaciones o validacion.

## Protoatractor

Un protoatractor es una forma cultural candidata: patron, gesto, sonido, narrativa o acoplamiento que podria repetirse y sostener produccion. Puede estar ausente, latente, emergente o insuficiente. No debe declararse emergente si la evidencia es manual, degradada o sin cobertura.

## Manual Test

`scorefriction_manual_test_not_regime_evidence` significa que la evidencia prueba el circuito tecnico, pero no sostiene regimen cultural fuerte. Puede servir para validar que el pipeline funciona; no debe alimentar conclusiones de campo.

## Evaluador

En `/scorefriction`, el boton `Evaluar senal` toma la ultima lectura viva cuando existe y llama `POST /api/scorefriction/evaluate`. Si no hay `latestReading`, la pantalla debe decir: `No hay senal suficiente. Registra evidencia primero.`

La tarjeta del evaluador muestra friccion, coherencia, disonancia, protoatractor, riesgo de saturacion, persistencia y ruta sugerida. Es observacion cultural, no juicio estetico.

## Wave

`/scorefriction/wave` observa persistencia temporal. Si solo existe una observacion, todavia no hay tendencia longitudinal. Con varias observaciones, se revisa primera observacion, ultima observacion, cobertura y si hay evidencia para decir que la senal crece, se degrada o sigue insuficiente.

## Wide

`/scorefriction/wide` observa campo cultural amplio, no solo una cancion. Debe mostrar casos, fuentes, cobertura, eventos y prototypes/clusters si existen. Si solo hay un caso, el campo amplio es insuficiente y debe decirlo de forma honesta.

## JSON Tecnico

El JSON tecnico queda disponible para auditoria, pero no debe ser la experiencia principal. La lectura principal debe responder en lenguaje humano: que se observa, que tan fuerte es la friccion, si hay protoatractor y que ruta de observacion conviene seguir.
