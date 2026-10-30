# MIHM Foundation P2 · Contraste de dinámica retrospectiva con controles

**Inicio:** 30-oct-2026. **Padre:** `SFI-MIHM-FOUNDATION-001`. **Contrato:** `SFI-MIHM-FOUNDATION-P2-LAGGED-CONTRAST-0.1`. **Alcance:** experimento descriptivo, sin nuevas observaciones, sin predicciones emitidas y sin promoción operativa. **Dependencia:** P1 metrología `DOCUMENTARY_STRUCTURE_VALID_WITH_VINTAGE_BLOCKED` y archivo documental P0 (SHA-256 `41e384e3199ca8d6878b39cdca51425b82e01a4d5fec6121d6494d53c5ceacc5`).

## 1. Antecedente adverso y propósito

La evaluación retrospectiva G2B-LAG2 preservada en `docs/research/evidence/MIHM-MANHATTAN-G2B-LAG2-RETROSPECTIVE-2026-10-28.json` mostró **cero victorias de M2 en tres objetivos** frente a los mejores controles disponibles. No se permite reetiquetar el resultado ni pretender que se descubrió una dinámica general de MIHM.

P2 propone un **contraste adicional, no preregistrado ni independiente**, con regla simple y costo computacional explícito: comparar capacidad descriptiva de un retardo de otra serie con la de su propia historia, una referencia estacional trivial y un control desplazado temporalmente del **mismo tamaño de features**. No afirma haber encontrado transferencia, perturbación causal, estados atractores ni homeostasis.

## 2. Unidad y fronteras

Tres preguntas interdominio y un control de dependencia estructural, fijados en código antes de ejecutar el contraste:

| Salida (unidad) | Serie retardada auxiliar (unidad) | Calificación |
| --- | --- | --- |
| `service311` solicitudes/día | `fdnyCount` filas de despacho/día | Hipótesis documental; fuente FDNY publica anualmente |
| `fdnyCount` filas de despacho/día | `service311` solicitudes/día | Hipótesis documental; sin deduplicación independiente |
| `cbdEntries` entradas estimadas/día | `service311` solicitudes/día | Hipótesis documental; soporte espacial diferente |
| `crzEntries` entradas estimadas/día | `cbdEntries` entradas estimadas/día | **Control negativo de independencia**: la CRZ está anidada en el CBD |

Se preservan unidades nativas para las pérdidas; no sumar las series, no confundir CRZ con Manhattan completo ni inferir una relación causal de la inclusión territorial.

## 3. Fórmula y cronología fija

Para una salida diaria `y(t)`, sea el pronóstico estacional clásico `b(t)=y(t-7)`; ajustamos, solo con entrenamiento, el residuo `r(t)=y(t)-b(t)`.

`OWN_LAG` utiliza exclusivamente `y(t-2)-y(t-9)`. `CROSS_LAG2` agrega `x(t-2)-x(t-9)` de otra serie. `AGE_SHIFT_PLACEBO` agrega, con el mismo número de regresores, `x(t-16)-x(t-23)`. Todos los cortes utilizan valores anteriores a `t`; esto evita fuga directa de resultados futuros, **pero NO demuestra que el proveedor los hubiera publicado antes de `t`**. La diferencia `t-2` es una hipótesis temporal, no una confirmación de reloj.

Los tres regresores utilizan regresión lineal con estandarización de columnas **solo del entrenamiento** y regularización cuadrática fija `ridgeAlpha=25`; la predicción se limita inferiormente a cero. El placebo y el candidato tienen dos regresores cada uno; `OWN_LAG` tiene uno, y la referencia `WEEKLY_NAIVE` no ajusta parámetros. El hiperparámetro fue **seleccionado después de haber visto resultados históricos de MIHM**; por lo tanto este estudio es una prueba de ingeniería y no una confirmación independiente.

- Datos originales: 365 fechas diarias 2025-10-01 — 2026-09-30.
- Entrenamiento: 2025-10-24 — 2026-04-30 (189 fechas por salida).
- Ventana descriptiva de validación: 2026-05-01 — 2026-06-30 (61 fechas).
- Auditoría histórica **ya inspeccionada en G2B**: 2026-07-01 — 2026-09-30 (92 fechas). Se muestran los resultados adversos y favorables, pero esta auditoría **no puede funcionar como un nuevo holdout independiente**.

Los cuatro modelos y las cuatro salidas se reportan completos, aun cuando el candidato falle. Criterio informativo básico: ganancia en MAE `OWN_LAG − CROSS_LAG2` y `AGE_SHIFT_PLACEBO − CROSS_LAG2`; para reclamar valor predictivo exigiría ganancias fuera de muestra y superiores al placebo con datos T0 genuinos, controles de complejidad y validación independiente **futura**. En este estudio no se hacen tales reclamaciones.

## 4. Puertas técnicas de admisión y falsación

P2 invoca el auditor P1 antes de estimar cualquier coeficiente. Rechaza fuentes, fechas, unidades, áreas y niveles de disponibilidad documental contradichos, conteos faltantes, valores negativos o datos no conservados. Las pruebas incluyen:

- Cambiar mayo-septiembre 2026 **no puede cambiar los coeficientes aprendidos** con octubre-abril.
- Cuatro salidas y todos los controles deben reportarse; no existe elección del resultado ganador para publicación.
- `AGE_SHIFT_PLACEBO` y `CROSS_LAG2` tienen el mismo número de características.
- En el control anidado `CBD→CRZ`, incluso una mejora elevada no habilita `independentCrossSystemEffectEstablished`.
- El código y la documentación dejan `originalAsOfVerified`, `causalPropagationEstablished`, `canonicalPhiCalculated`, `homeostasisEstablished`, `externalReturnRecorded` y `productionPromotionAllowed` en **false**.

## 5. Operación

Implementación: `src/lib/mihm/foundationLaggedDynamics.ts` como auditor/adaptador puro sobre `foundationSourceMetrology.ts`. Sin rutas nuevas, sin permisos, sin agentes, sin cron, sin escritura a Case Platform o bases de datos, sin modificación de fórmulas de Φ, NTI, IHG o del núcleo de dinámica hipotética `projectMihmDynamics`.

```bash
node --import tsx --test src/lib/mihm/foundationLaggedDynamics.test.ts
node --import tsx scripts/research/mihm-foundation-p2-lagged-dynamics.ts
```

**Destino:** `docs/research/evidence/MIHM-FOUNDATION-P2-LAGGED-DYNAMICS-2026-10-30.json` cuando los valores reales recalculados se registren desde CI. **Estado de P2:** dinámica descriptiva calibrada *sobre archivo retrospectivo*; por verificar versión histórica real, transporte, perturbaciones y recuperación. El marco homeostático y las proyecciones causales siguen en investigación.

## 6. Decisión científica previa a P3/P4

Hasta obtener datos capturados en vivo con recibos firmados o verificables de `observedAt`, `availableAt`, `capturedAt` y `issuedAt`, cualquier señal de relación retardada queda en `HYPOTHESIS / DERIVED_RETROSPECTIVE`; nunca promoverla a `OBSERVED_CAUSAL` ni recomendar un cambio operativo basándose en esta evidencia. Los umbrales P0 se conservan como variación estacional, **no límites de viabilidad**.
