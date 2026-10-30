# MIHM Foundation P3 — Viabilidad, perturbaciones y reingreso observacional

**Programa padre:** `SFI-MIHM-FOUNDATION-001`. **Contrato:** `SFI-MIHM-FOUNDATION-P3-PROXY-RECOVERY-0.1`. **Fecha:** 30-oct-2026. **Estado:** `RETROSPECTIVE_PROXY_ONLY__VIABILITY_NOT_ADMITTED`. Este experimento **NO** establece homeostasis, recuperación institucional, propagación causal, límite normativo de viabilidad, desempeño predictivo, RETURN ni éxito científico de MIHM.

## 1. Pregunta falsable e instrumentos reutilizados

¿El examen simultáneo de tres series con unidades y fronteras tipadas altera la lectura descriptiva de un reingreso estadístico después de un episodio meteorológico observado, respecto a una lectura convencional de tráfico únicamente? Sí puede contrastarse la **coincidencia de indicadores**; no puede todavía derivarse de estos datos una restricción real de viabilidad ni su mecanismo causal.

El P3 consume los mismos archivos inmutables P0/P1/P2, con metrología P1 obligatoria antes de calcularse. No ajusta ni reemplaza el núcleo canónico `packages/mihm-core`, ni el `projectMihmDynamics` histórico, ni las familias Phi, ni los límites institucionales, ni la interfaz visual. Es un lector funcional de investigación, no un motor de decisiones.

**Panel:** `docs/research/evidence/MIHM-MANHATTAN-365D-2025-10-2026-09.json`. SHA-256 `41e384e3199ca8d6878b39cdca51425b82e01a4d5fec6121d6494d53c5ceacc5`. **Perturbaciones preexistentes:** `docs/research/evidence/MIHM-MANHATTAN-FOUR-NWS-EVENT-CONTRAST-2026-10-25.json` (Git blob `e0d3ce098c6ccb261e25511369589b5d8788792e`). El NWS documenta la meteorología externa, **no demuestra qué produjo la desviación en las series ni el estado operativo institucional**.

## 2. Cuatro perturbaciones y el control espacial

| Episodio | Fecha de referencia | Evidencia meteorológica externa | Interpretación y guardia |
| --- | --- | --- | --- |
| Tormenta significativa de Manhattan | 25-ene-2026 | [NWS 25–26 enero](https://www.weather.gov/okx/20260125_26) | Evento local meteorológico; sin deducir causa institucional ni fecha de publicación de los recuentos |
| Frío/nevadas leves en Manhattan | 6-feb-2026 | [NWS 6–8 febrero](https://www.weather.gov/okx/20260206_08) | Episodio más tenue; sin convertir la ausencia de señal en estabilidad sistémica |
| Ventisca con restricciones de tránsito | 22-feb-2026 | [NWS 22–23 febrero](https://www.weather.gov/okx/20260222_23) | Nieve y restricciones coocurren; no se identifica por separado el efecto causal de cada una |
| Inundación metropolitana predominantemente fuera de Manhattan | 20-may-2026 | [NWS 20 mayo](https://www.weather.gov/okx/20260520) | **Control espacial negativo**; Brooklyn y Queens concentraron la precipitación y no se presume el mismo impacto en Manhattan |

Los cuatro episodios ya estaban descritos antes de P3, pero el panel completo y sus resultados habían sido vistos. La reutilización y la elección de umbrales **no son una selección preregistrada ni una réplica externa independiente**.

## 3. Protocolo P3 de reingreso a la banda, sin declarar viabilidad

Se leen tres series **no sumables**: entradas estimadas CBD (`estimated_vehicle_entries/day`), registros de solicitudes 311 (`service_request_records/day`) y filas de despachos FDNY (`fire_incident_dispatch_rows/day`). CRZ está anidada dentro de CBD y queda excluida del recuento de nodos independientes. Tampoco se afirma que 311 o FDNY midan capacidad institucional o bienestar ciudadano.

Para cada evento `e` se congelan los **56 días completos anteriores** a su fecha `t0`. Para cada día `t` dentro de `[t0,t0+14]`:

```text
baseline_e,k(t) = median(8 valores anteriores a t0 del mismo día de la semana)
delta_e,k(t)    = observed_e,k(t) / baseline_e,k(t) - 1
proxy_deviation = |delta_e,k(t)| > ancho_ilustrativo
```

La banda inicial se fija a **±20%** únicamente para mostrar el funcionamiento matemático. Se ejecutan además **±10% y ±30%** como análisis de sensibilidad (elección post hoc, no rango clínico, legal, de capacidad ni de viabilidad).

- **M0 (convencional univariado):** señal si CBD está fuera de la banda.
- **M1 (tres indicadores):** señal si *cualquiera* de CBD, 311 o FDNY está fuera de su banda. Se trata de una regla OR que requiere más información; no posee un presupuesto de complejidad pareado ni permite alegar superioridad predictiva.
- **Ventana de inicio:** únicamente los primeros tres días `t0..t0+2`; un movimiento posterior no se atribuye automáticamente al episodio.
- **Reingreso descriptivo:** primer día **posterior a una señal inicial** a partir del cual hay al menos **dos días consecutivos dentro de la banda**. Si no hubo señal inicial, el resultado es `NO_ONSET_DEPARTURE`, no “recuperación instantánea”.
- **Durabilidad observada:** registrar si hubo otra desviación después de los dos días; un reingreso de dos días **no equivale a recuperación permanente**, resiliencia ni homeostasis.
- **Censura:** fuera de 14 días no se inventan eventos ni resultados. Una falta de observación provoca abstención de la corrida en lugar de imputar cero.

Las referencias quedan congeladas en `t0`; ninguna observación posterior alimenta el umbral usado para evaluar días futuros. Ello evita fuga mecánica de información **dentro de la fórmula**, pero no demuestra disponibilidad en tiempo real de los agregados originales ni preregistro del procedimiento.

## 4. Hallazgos descriptivos del corredor ±20% (no normativo)

| Episodio | M0: primer reingreso de tráfico | M1: primer reingreso de 3 indicadores | Identificación |
| --- | --- | --- | --- |
| 25-ene | 28-ene (3 días desde primera desviación) | 5-feb (11 días desde primera desviación) | Reingreso tardío de alguna variable; no prueba recuperación institucional |
| 6-feb | Sin desviación inicial en tráfico | Señal posterior en FDNY/311; reingreso descriptivo 12-feb | **No** equiparar actividad FDNY o 311 con falla de capacidad |
| 22-feb | 25-feb (3 días) | 26-feb (4 días) | Nieve y restricción de viajes son causas potencialmente confundidas |
| 20-may | Sin señal inicial | Sin señal inicial | Control geográfico: no adjudicar perturbación remota a Manhattan |

Las fechas derivadas dependen de la **regla OR**, la banda y las ventanas elegidas; no son estimaciones de `RETURN`, `recovery time` institucional real ni cumplimiento de SLA. Un criterio físico de viabilidad requeriría documento normativo, frontera, valor mínimo/máximo admisible, unidades, versión, vigencia anterior al evento, resultados evaluados independientemente y las acciones/sistemas intervinientes.

## 5. Puertas de evidencia obligatorias

El código no produce resultados P3 si la metrología P1 rechaza un archivo; comprueba las huellas del conjunto original y del reporte NWS archivado, las cuatro fechas/áreas y la prohibición de reetiquetar eventos meteorológicos como `institutionalReturnConfirmed`. Los indicadores tienen que ser enteros no negativos con su fuente y fecha; un `null` nunca es cero.

Al terminar cualquier corrida, **siempre**:

```text
eligibleNormativeConstraints = 0
eligibleIndependentOutcomeLabels = 0
independentProviderSourceVintagesVerified = false
historicalEventsIndependentlyPreregistered = false
historicalAuditIndependent = false
causalPropagationEstablished = false
canonicalPhiCalculated = false
homeostasisEstablished = false
returnVerified = false
productionPromotionAllowed = false
```

No se crea ni se altera ninguna escritura, evento institucional, plan de ejecución, agente, cron, base de datos, reporte autorizado de Case Platform o parámetro operativo. P3 no establece equilibrio a 2030 ni una “ley MIHM”.

## 6. Resultado, comparación y criterio para pasar a P4

El producto de P3 es una evaluación real, **reproducible y adversarial** del comportamiento de indicadores bajo una definición ilustrativa de excursion/reingreso. Se publican los cuatro episodios y los tres corredores, incluidas las observaciones sin alerta y cualquier recaída.

El resultado es científico-descriptivo de ingeniería: evidencia que una vista multinodo puede conservar desajustes que oculta un único indicador, pero **no** muestra que esa vista prediga mejor, cause recuperación o aprenda a mantener viable un sistema. M1 incorpora más fuentes que M0; para probar ventaja futura necesita comparadores de igual presupuesto, falsos positivos, costo, valores históricos disponibles en T0 y un evento realmente nuevo.

**Puerta P4:** captar nuevas observaciones con `observedAt`, `publishedAt/availableAt`, `capturedAt`, `sourceSHA256`; documentar límites normativos previos al incidente, adjudicar resultado externo y preregistrar criterios/costos antes del siguiente episodio. P3 retrospectivo no puede satisfacer esa puerta por sí mismo.

Reproducción de la fuente y los resultados:

```bash
node --import tsx --test src/lib/mihm/foundationViabilityRecovery.test.ts
node --import tsx scripts/research/mihm-foundation-p3-viability-recovery.ts
```

**Recibo versionado y reproduccible:** `docs/research/evidence/MIHM-FOUNDATION-P3-VIABILITY-RECOVERY-2026-10-30.json`. El script ahora compara por igualdad profunda los doce resultados y las observaciones de inicio, rechazando cualquier deriva de archivo, método o valor.

## 7. Resultado de sensibilidad y hallazgo adverso

| Episodio | ±10%: M0 / M1 días desde la desviación inicial | ±20%: M0 / M1 | ±30%: M0 / M1 |
| --- | --- | --- | --- |
| 25-ene | 6 / **sin reingreso de dos días dentro del horizonte** | 3 / 11 | 2 / 9 |
| 6-feb | sin señal / **sin reingreso** | sin señal / 4 | sin señal / 4 |
| 22-feb | 3 / 6 | 3 / 4 | 1 / 1 |
| 20-may, control espacial | sin señal / 5 | sin señal / sin señal | sin señal / sin señal |

Los días se calculan desde la **primera desviación observada dentro de los tres primeros días** del episodio. «Sin señal» significa que el detector concreto no registró inicio en esa ventana; NO significa que el sistema hubiera estado sano. «Sin reingreso» significa censura al horizonte de 14 días; NO prueba daño permanente.

**Inestabilidad de umbral:** para el 25 de enero, el modelo de tres indicadores no encuentra dos días seguidos en la banda ±10%, sí los encuentra con ±20% después de 11 días —pero detecta una nueva desviación antes del final de seguimiento— y con ±30% después de 9 días. Para la ventisca de febrero el tiempo multinodo pasa de 6 a 4 y a 1 días según la banda. Es imposible presentar un «tiempo homeostático» estable con estos parámetros post hoc.

**Control espacial:** el episodio de lluvia del 20 de mayo, centrado principalmente fuera de Manhattan, provoca señal multinodo ilustrativa con ±10%, aunque **no** con ±20% ni ±30%. No sabemos si se trata de un falso positivo en sentido operacional porque no hay etiquetas de estado institucional independiente. Sí es una advertencia contra declarar toda divergencia como respuesta a un fenómeno de ámbito geográfico distinto.

**Persistencia:** la primera reentrada en dos días no prueba que no haya recaídas. El recibo conserva el campo `rebreachAfterReentry` para ambas lecturas. En particular, el reingreso multinodo del 25-ene con ±20% muestra una nueva desviación dentro del horizonte. No se emitió ningún RETURN institucional.

**Decisión:** P3 produjo una prueba funcional y adversa de medición, cobertura y recuperación descriptiva; no produjo una restricción admisible de viabilidad. La siguiente fase necesita criterios normativos fechados y un resultado externo independiente para que el número represente realmente viabilidad y no simple retorno a un corredor elegido retrospectivamente.
