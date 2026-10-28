# MIHM fundacional — Instrumento adaptativo de viabilidad multinodo (propuesta de investigación)

**Fecha:** 2026-10-26  
**Programa existente:** SFI-MIHM-FOUNDATION-001  
**Estado:** HIPÓTESIS DE INGENIERÍA / NO VALIDADO  
**No es:** MIHM-T, una nueva familia Phi, un método canónico, una ejecución material ni un RETURN.

## 1. Punto de partida y distinción de instrumentos

MIHM fundacional representa sistemas acotados con nodos, dimensiones, relaciones, flujos, restricciones, estados parcialmente observados, perturbaciones y evidencia con procedencia. MIHM-T es una extensión **opcional** para dependencias temporales; no define ni sustituye al modelo padre. MOP-H, ScoreFriction, PPOI, World Vector y SFI institucional siguen sus propios objetos y Phi canónicos. El `REDUCED_KERNEL_CONTINUITY` de `packages/mihm-core` no es Phi canónico.

Cadena existente que debe reutilizarse: `src/core/contracts/system.ts` (definición) → `src/lib/mihm/foundationResearchContract.ts` (admisibilidad) → `packages/mihm-core` y `src/lib/mihm/fieldScientificReading.ts` (instrumentación) → `packages/sfi-kernel/src/cycle.ts` (caller) → Method Lab / Reality Chain / Cognitive Spine (investigación, procedencia, persistencia y autoridad) → recibos de acción/RETURN y contraste. La existencia de componentes no demuestra cierre empírico de la cadena.

## 2. Condición inicial real T0 y vía de menor fricción

**Sistema piloto:** la propia operación programada de SFI, antes de buscar un cliente externo. Hay trazas originales en GitHub Actions y recibos institucionales; el costo incremental de observación puede mantenerse bajo al reutilizar los datos existentes.

**Observación T0 verificable (GitHub Actions, 2026-10-26 19:18 UTC):** en `SFI Continuity Hourly` run `40385560700`, el wakeup respondió `shouldRun=true` por `ACTIONABLE_CONTINUITY_WORK`, con propuesta activa, caso activo y ciclo universal abierto. La llamada siguiente devolvió `EGRESS_RESTRICTED`, `runId=null`, `dataPlane=null`, `laneStatus={}`, sin resultado de continuación universal. Esto demuestra un bloqueo de la vía de ejecución, **no** un estado homeostático ni un RETURN. La siguiente ejecución programada `40390536051` quedó `skipped`; no debe interpretarse como recuperación.

**Observación T0 del instrumento:** el núcleo reducido imputa cero cuando `value` o `nti` son `null`, y devuelve números incluso para listas vacías. G1 ya caracteriza este defecto de observabilidad. El auditor propuesto en este PR distingue cero medido de ausencia y conserva abstención cuando faltan observaciones, sin modificar el cálculo heredado.

**Límite:** los recibos de GitHub no prueban el estado interno de los 21 agentes ni autorizan inferir `RETURN`; se requiere lectura autenticada de SFI_ROOT para completar la cohorte. Un fallo de egress puede impedir ejecutar y a la vez preservar una restricción válida de costo/autoridad.

## 3. Propuesta científica: viabilidad adaptativa con procedencia

MIHM podría convertirse en un **instrumento que aprende qué observar y qué perturbación reversible recomendar para mantener o recuperar restricciones de viabilidad en un sistema multinodo**, conservando evidencia, incertidumbre y autoridad. No basta con calcular un índice agregado ni producir una explicación narrativa.

Propuesta operativa, no ley universal:

1. **Observar:** delimitar sistema, nodos y relaciones con evidencia disponible al corte; distinguir valor medido, cero, ausencia, inferencia y simulación.
2. **Identificar viabilidad:** declarar por anticipado restricciones comprobables por nodo y a nivel sistema; no asumir un óptimo global ni equiparar estabilidad con ausencia de daño.
3. **Diagnosticar:** detectar degradación, propagación y pérdida de opciones alcanzables; confrontar explicaciones rivales (fallo local, cuello de botella, observación insuficiente, política protectora).
4. **Elegir observación:** cuando dos hipótesis expliquen los mismos registros, solicitar la siguiente medición de mayor valor discriminativo por costo, antes de recomendar actuar.
5. **Proponer perturbación mínima:** evaluar acciones reversibles dentro de autoridad vigente, prediciendo efectos, riesgo, costo y restricciones; **no ejecutar** desde el modelo sin gobernanza.
6. **Contrastar:** registrar la decisión, ejecución autorizada, resultado independiente y cambio observado; recalibrar con datos posteriores sin reescribir el T0.

**Candidato a contribución diferencial:** decisión conjunta de *qué medir* y *qué acción mínima proponer* bajo restricciones multinodo, incertidumbre, procedencia y retorno verificable. Cada componente tiene antecedentes en control predictivo, gemelos digitales, aprendizaje activo, inferencia activa y observabilidad; la novedad de su combinación y desempeño **debe demostrarse**, no presumirse.

## 4. Rivales y condiciones para superar

- **M0-A:** alertas y reglas operativas existentes, con el mismo acceso a datos y restricciones.
- **M0-B:** detector temporal o modelo de espacio de estados competente, con la misma evidencia y presupuesto.
- **M0-C:** análisis convencional de incidentes/teoría de control o gemelo digital adaptativo, según el dominio.
- **M1-A:** MIHM sin relaciones entre nodos (ablación).
- **M1-B:** MIHM fundacional completo con restricciones y procedencia.
- **M1-C:** MIHM + selección activa de observación, solo si existen preguntas rivales y costos medibles.
- **MIHM-T:** brazo aparte y solo cuando el experimento requiera hipótesis explícitas de retardo/transferencia temporal.

Medir en cortes cronológicos no vistos: falsas alarmas, detección anticipada, Brier si existen probabilidades y resultados adjudicados, abstención, costo de observación, decisiones evitadas, recuperación después de perturbación, persistencia de restricciones y carga computacional. El criterio de mejora práctica, tamaño de cohorte y márgenes de seguridad se fijan antes del holdout. Un resultado negativo identifica la capacidad a rediseñar, no permite mover retrospectivamente la meta.

## 5. Ingeniería incremental y retorno requerido

**G1 completado como diagnóstico:** null versus cero del núcleo reducido. **G1b (este PR):** auditor puro de cobertura y calidad de entradas, sin mutar el kernel, con pruebas unitarias. **G2 pendiente:** cohorte real de observaciones y resultados de SFI, separada por disponibilidad temporal. **G3 pendiente:** baselines y ablaciones. **G4 pendiente:** congelación de métricas. **G5 pendiente:** contraste prospectivo y RETURN.

Una primera aplicación útil y legítima sería que MIHM distinga `SFI no ejecutó por política` de `SFI ejecutó y falló` y de `SFI ejecutó, recuperó y produjo RETURN`, sin inferir estados sanos a partir de campos vacíos. Si este criterio mejora las decisiones de observación frente a M0, se probaría después en otros dominios y organizaciones.

**Límites de autoridad:** sin modificar producción, gastos, permisos, bases, canon ni ejecutar acciones externas. No se agrega reloj, agente o sistema paralelo.

## 6. Fuentes primarias para comparación tecnológica (no prueba de novedad)

- OpenTelemetry, especificación de trazas/métricas/logs: https://opentelemetry.io/docs/specs/otel/
- NIST AI Risk Management Framework, medición/evaluación/validación: https://airc.nist.gov/
- Chen et al., *Uncertainty-Aware Digital Twins: Robust MPC* (2025): https://arxiv.org/abs/2501.10337
- IEEE WSC, *Dynamic Calibration Framework for Digital Twins Using Active Learning and Conformal Prediction* (2025/2026): https://ieeexplore.ieee.org/document/11338975
- Waade et al., *As One and Many: Individual and Group-Level Generative Models in Active Inference* (2025): https://pubmed.ncbi.nlm.nih.gov/40003140/
- Wolf et al., *Interpretable and Efficient Data-Driven Discovery and Control of Distributed Systems* (2025): https://doi.org/10.1017/dce.2025.10027

Estas fuentes muestran que calibración adaptativa, control con incertidumbre, observabilidad y coordinación multinodo **ya existen**. La hipótesis defendible para MIHM es valor incremental reproducible de su combinación bajo restricciones de evidencia y autoridad, no la invención aislada de esos conceptos.

## 7. Verificación de integración y preflight institucional (2026-10-26)

La primera ejecución de `SFI Verify` del PR #848 (`40399608257`) **falló**, aunque `MIHM Contract Validation` (`40399608239`) aprobó. Los logs de `Verify SFI boundaries and build` localizaron el fallo en el control arquitectónico `P17_PR_PREFLIGHT_REQUIRED`: el PR incorpora dos archivos estructurales nuevos y su descripción no incluía los 13 campos de preflight exigidos por `scripts/qa-canonical-architecture.mjs`. No se observó en ese intento un fallo de la fórmula MIHM; la verificación general se detuvo antes de las fases restantes.

**Corrección aplicada:** se incorporó al cuerpo del PR #848 el bloque `SFI PRECHECK` con propietario, reutilización de capacidades, escritor, persistencia, cambios front/back/DB, redundancia, límites ROOT, reversión y verificación. Se conserva el carácter borrador; no se alteran fórmulas, canon, producción, base de datos ni permisos. Este registro diferencia un fallo de cumplimiento arquitectónico de un fallo científico del instrumento y permite comprobar de nuevo CI tras sincronizar la rama. La aprobación completa de CI solo podrá afirmarse después de observar el resultado de la nueva ejecución.

## 8. Contraste operacional observado T1 — 26 octubre 2026, 22:41 UTC

**Propósito:** cerrar una observación real para el instrumento fundacional de viabilidad multinodo, no ejecutar MIHM-T ni declarar un RETURN. Se reutilizaron exclusivamente los recibos existentes de GitHub Actions. No se consultaron ni modificaron bases de datos ni se creó un nuevo ciclo.

**Cohorte auditada:** 20 ejecuciones más recientes de `SFI Continuity Hourly` presentes en los primeros 100 registros de `GET /repos/Aptymok/system-friction/actions/runs?per_page=100` al cierre de esta observación, desde 2026-10-25 19:34:18 UTC hasta 2026-10-26 22:41:11 UTC. Incluye **eventos programados y eventos derivados `workflow_run`**; no equivale a 20 horas ni a 20 oportunidades independientes. Resultado de GitHub: **7 failure, 11 skipped, 2 success**. Se inspeccionaron los logs de los siete fallos y los dos éxitos.

- **7/7 fallos:** respuesta explícita `EGRESS_RESTRICTED`, sin `runId`, con `dataPlane=null` y `laneStatus={}`. El mensaje de CI `CORE_HEARTBEAT_FAIL: runtimeStatus=None` es una clasificación secundaria engañosa del mismo bloqueo; el PR existente #847 propone distinguirlo, pero no está desplegado. Recibo reciente: [40414326893](https://github.com/Aptymok/system-friction/actions/runs/40414326893), 22:41 UTC; wakeup `shouldRun=true`, `activeProposal=true`, `activeCase=true`, `openUniversalCycle=true`. No es un error de hipótesis MIHM ni evidencia de recuperación.
- **2/2 éxitos de workflow:** [40232835980](https://github.com/Aptymok/system-friction/actions/runs/40232835980) y [40237113462](https://github.com/Aptymok/system-friction/actions/runs/40237113462), ambos 25 de octubre, devolvieron `COMPLETED` pero `dataPlane=NEON`, diagnóstico `physical_primary_healthy_recovery_pending`, `universal.availability=DEFERRED`, `universal.processed=0` y `empirical.processed=0`; todas las vías materiales principales estaban `DEFERRED_PRIMARY_WRITE_REQUIRED`. Éxito del workflow ≠ ciclo universal completo.
- **11/20 `skipped`:** omisión de workflow, no medición del estado homeostático del sistema.

**Contraste multinodo adicional, mismo día:** [World + Institutional Observation Cycle 40411942545](https://github.com/Aptymok/system-friction/actions/runs/40411942545) sí produjo una instantánea WorldSpect real con `observedAt=2026-10-26T22:22:56.589Z` y respuesta de medición/persistencia satisfactoria, pero su etapa de hipótesis terminó `HYPOTHESIS_STAGE_STILL_PARTIAL`: **156 señales consideradas, 12 grupos, 0 hipótesis creadas**, con límites de tasa, cuota y fallos transitorios de proveedores; se suprimió el fallback sintético. [World Vector Agents 40414290175](https://github.com/Aptymok/system-friction/actions/runs/40414290175) completó la tarea y reportó una lectura nueva en memoria, pero su recibo de persistencia diaria indicó `existing=true` y `observed_at=2026-10-26T03:39:06.712Z`, anterior a la nueva instantánea de 22:22 UTC. Esto puede ser deduplicación diaria intencional; **no** atribuir una nueva persistencia de la lectura de 22:22 sin verificar su política y registro.

**Diagnóstico MIHM fundacional DERIVED, no causal:** el estado observado se divide al menos en (a) trabajo elegible pero ejecución bloqueada por política, (b) heartbeat completado sin trabajo de continuación por falta de escritura primaria, (c) medición externa persistida pero hipótesis no generada por disponibilidad de modelos y (d) ejecución de agente exitosa con reutilización de registro previo. Colapsar estos estados en un único indicador de `health=0` o `health=1` perdería información decisiva. Tampoco puede calcularse Phi o homeostasis a partir de estos recibos por sí solos.

**Hipótesis rival falsable para la siguiente intervención, sin cambiar producción:** una clasificación multinodo basada en estados de observabilidad, autoridad y disponibilidad de recursos discriminará mejor los cuellos de botella y la próxima observación útil que un semáforo binario de éxito/fallo. Comparadores: reglas convencionales basadas en `conclusion`, y clasificación convencional por código de error y etapa con la **misma información**. Definir antes del holdout: criterio de utilidad (localización correcta del bloqueo y decisión de observación), costo de revisión, tasa de falsos diagnósticos, conjunto de recibos no vistos, tiempo de disponibilidad y validación por fuente. Si la clasificación convencional por etapas iguala a MIHM con menor costo, no hay valor incremental demostrado. Este contraste es **exploratorio**, sin muestras independientes suficientes ni resultados de predicción sellados.

**Estado de la contribución previa:** [SFI Verify 40408310463](https://github.com/Aptymok/system-friction/actions/runs/40408310463) concluyó `success` el 26 de octubre a las 21:58:55 UTC para el commit `0ad6cc0bf6f61d37e3acec35ba23527e3ac3316f`, antes de este apéndice. Los checks de este nuevo commit deben verificarse por separado. SFI_ROOT requiere autenticación interactiva en este entorno: no hubo envío de cápsula cognitiva ni hipótesis persistida allí.
