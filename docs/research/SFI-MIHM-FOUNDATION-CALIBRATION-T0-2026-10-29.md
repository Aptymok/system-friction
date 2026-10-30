# MIHM · P0 / T0 — calibración empírica documental inicial (diagnóstico)

**Programa padre:** `SFI-MIHM-FOUNDATION-001`. **Instrumento:** `SFI-MIHM-HISTORICAL-VARIATION-CALIBRATION-0.1`. **Estado:** `DERIVED_RETROSPECTIVE_DIAGNOSTIC / NOT_SCIENTIFICALLY_VALIDATED`. **Fecha de inicio:** 2026-10-29 (México).

## Pregunta y decisión de diseño

¿Podemos ajustar reproduciblemente un umbral descriptivo de variación observada, preservar valores cero y faltantes, y medir su comportamiento fuera de la ventana de entrenamiento sin afirmar falsamente causalidad, viabilidad o homeostasis? Esta es la primera **calibración metrológica descriptiva**. No sustituye los límites de viabilidad declarados por expertos ni calibra una ley dinámica.

El programa fundacional mantiene nueve familias de campos tipados y cinco familias de Φ canónicas independientes. Este ensayo no crea una nueva familia de Φ, no cambia escalas, no modifica `REDUCED_KERNEL_CONTINUITY` ni altera producción.

## Cohorte documental y reloj

Se reutiliza el archivo `docs/research/evidence/MIHM-MANHATTAN-365D-2025-10-2026-09.json`, de 365 fechas diarias (1-oct-2025 a 30-sep-2026). Las series se mantienen **separadas**, sin sumar unidades o áreas distintas:

- NYC311: solicitudes diarias para Manhattan.
- FDNY: despachos diarios para Manhattan.
- CBD Entries: entradas vehiculares de un perímetro geográfico anidado.
- CRZ Entries: entradas vehiculares de una zona diferente/anidada; no es otra medición del mismo denominador que Manhattan.

El archivo contiene identificadores de respuestas públicas y huellas SHA-256 declaradas; `originalT0SourceAvailability = NOT_VERIFIED`. La cohorte fue obtenida retrospectivamente. Los SHA registrados no demuestran por sí solos disponibilidad del dato **en** cada T0 histórico ni corroboran nuevamente las respuestas originales.

## Regla fijada y reproducibilidad

Por serie, para el día `t` calculamos:

`variation(t) = abs(observed(t) - observed(t-7 calendar days))`.

El lag de 7 días constituye un comparador estacional simple. El umbral es el **percentil empírico 90 de los errores absolutos de entrenamiento** (nearest rank). Los empates con el umbral no se cuentan como excedencia. El umbral **no** utiliza observaciones de validación ni del bloque posterior ya inspeccionado.

- Entrenamiento: 8-oct-2025 a 30-abr-2026; 205 diferencias semanales por serie.
- Validación documental separada: 1-may-2026 a 30-jun-2026; 61 diferencias.
- Auditoría histórica: 1-jul-2026 a 30-sep-2026; 92 diferencias **ya expuestas en investigaciones anteriores**, no un holdout nuevo independiente.

El código rechaza fechas inválidas, huecos, duplicados, unidades mezcladas, valores no medidos, simulados, no finitos o negativos, material sin identificación de fuente y cohortes cortas. **Cero medido** se conserva como cero; `null` no se imputa.

## Resultado reproducible P0

| Serie y unidad | Umbral P90 de variación semanal | Excedencias entrenamiento /205 | Excedencias validación /61 | Auditoría histórica expuesta /92 |
| --- | ---: | ---: | ---: | ---: |
| 311, solicitudes/día | 728 | 20 | 3 (4.92%) | 0 |
| FDNY, despachos/día | 109 | 18 | 10 (16.39%) | 10 |
| CBD, vehículos/día | 92,943 | 20 | 3 (4.92%) | 5 |
| CRZ, vehículos/día | 80,164 | 20 | 4 (6.56%) | 6 |

**Interpretación:** la frecuencia FDNY en validación excede el 10% nominal del entrenamiento. Esta desviación puede provenir de cambios de distribución, estacionalidad u otras causas; **no prueba** deterioro institucional, anomalías reales, interacción causal entre nodos ni que el MIHM detecte antes que un baseline. Ninguno de los umbrales constituye por sí solo una restricción de viabilidad.

Las cifras son `DERIVED` desde un archivo declarado como datos públicos históricos y se recalculan en CI. El archivo reproducible de resultados está en `docs/research/evidence/MIHM-FOUNDATION-T0-CALIBRATION-2026-10-29.json`, con test contra fuente y valores esperados. Se mantiene separada la huella del archivo de la disponibilidad real de la observación en su tiempo.

## Puertas P1–P5 (no declararlas completas)

1. **P1 — metrología:** verificar versiones originales de fuentes, granularidad, cobertura, denominador, área y disponibilidad en T0. Clasificar ausencia de registro distinta de cero.
2. **P2 — dinámica:** estimar coeficientes de transiciones y retardos a partir de series temporales por nodo con datos admitidos; sin inferir causalidad por covariación.
3. **P3 — homeostasis:** predeclarar límites de viabilidad con unidades, perturbación identificable y recuperación observada, contrastando baselines convencionales y un modelo sin relaciones (ablación).
4. **P4 — calibración prospectiva:** congelar parámetros, ventanas y criterio de éxito **antes** de nuevas observaciones; puntuar falsas alarmas, abstención, costos, pérdida y desempeño con intervalos y pruebas negativas.
5. **P5 — evidencia externa:** contrastar decisiones y RETURN independientes, persistir recibos gobernados y publicar resultados positivos **y negativos** sin reetiquetar el retrospectivo como predicción.

## Límites operativos

- No hay operación sobre Supabase, Neon, Case Platform, agentes, clientes, cron ni permisos.
- No se modifica Φ_H, Φ_S, Φ_F, Φ_W, Φ_SFI, canon ni la fórmula histórica firmada IHG; el defecto legado IHG v2 sigue documentado.
- `calibrateMihmHistoricalVariationEnvelope` es una función pura en el núcleo existente, no otra autoridad ni motor paralelo.
- El `sourceResponseSha256` declara el artefacto de origen; la procedencia independiente y el as-of original no se certifican mediante el cálculo.
- **No se afirma `MIHM_CALIBRATED`, `HOMEOSTASIS_ESTABLISHED` ni `RETURN_VERIFIED`.**

Reproducción de la cohorte desde la raíz del repositorio:

```bash
node --import tsx scripts/research/mihm-foundation-calibration-t0.ts
node --import tsx --test packages/mihm-core/src/integrated.test.ts
```

**Criterio para salir de P0:** recibo reproducible sobre archivo congelado, cero fuga de validación hacia entrenamiento, abstención ante datos inválidos y CI exitoso. **Criterio para declarar MIHM científicamente calibrado:** sigue pendiente del P4–P5 prospectivo y externo.
