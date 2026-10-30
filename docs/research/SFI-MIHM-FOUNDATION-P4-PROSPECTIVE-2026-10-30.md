# MIHM Foundation · P4 — Predicción preregistrada y contraste prospectivo

**Fecha:** 2026-10-30. **Programa padre:** SFI-MIHM-FOUNDATION-001. **Estado real:** `P4_EVALUATOR_IMPLEMENTED / PROSPECTIVE_EVIDENCE_NOT_OBSERVED`. **Contrato:** `SFI-MIHM-FOUNDATION-P4-FORECAST-CONTRAST-0.1`.

## 1. Reconstrucción T0→T1 y condición de verdad

El P3 integrado en `main` demostró que diferentes corredores descriptivos (±10%, ±20%, ±30%) producen lecturas inestables de reingreso después de cuatro episodios NWS históricos. No estableció restricciones normativas, resultados operativos independientes, eficacia predictiva ni homeostasis. Su fuente original carece de las versiones publicadas efectivamente disponibles en las fechas históricas. Ninguna ejecución P4 puede convertir ese retrospectivo en una predicción emitida antes del hecho.

P4 utiliza el **registro existente** `sfi_prediction_entries` y las **verificaciones existentes** `sfi_prediction_verifications`, sin tablas nuevas, agentes, relojes, autoridad o cambios a fórmulas. `src/lib/mihm/foundationProspectiveScoring.ts` es únicamente un adaptador **puro de lectura y puntuación**; no crea ni cierra predicciones, no escribe en Case Platform y no genera RETURN.

## 2. Condiciones antes de conocer el resultado (T0)

Una predicción numérica específica de MIHM se puede depositar en el campo existente `prediccion_explicita` como JSON tipado `SFI-MIHM-FOUNDATION-P4-FORECAST-CONTRAST-0.1` mediante la interfaz gobernada **ya existente** y con una identificación de caso e hipótesis. Se rechaza cualquier predicción narrativa sin este contrato, sin IDs originales o registrada después de la fecha objetivo.

Se fijan en ese mismo recibo, ANTES del objetivo: versión del método, territorio, observable, unidad, fecha objetivo y pérdidas `MAE`, así como una pareja M0 (modelo convencional) y MIHM con valores numéricos y bandas del 90%. Ambos modelos usan **la misma lista de fuentes y presupuesto informacional**. Esto no demuestra igualdad de costo computacional; requiere medición separada.

Cada fuente usada tiene `observedAt`, `availableAt`, `capturedAt`, referencia y SHA-256. Para ser admisible debe cumplirse

[
 observedAt \le availableAt \le capturedAt \le issuedAt < targetAt.
]

La prueba no crea esos comprobantes: deben existir en la superficie de procedencia autorizada. La fecha de observación no sustituye a la disponibilidad comprobada. El antiguo campo `is_predictive_evidence=true` **nunca es suficiente por sí solo**.

## 3. Condiciones de contraste T1

Se utiliza la verificación hija existente del registro de predicción; no se cambia el estado de una verificación sin autoridad. La verificación debe ser CLOSED, tener resultado adjudicado, fuente de calidad suficiente, verificador identificado, hash de captura, regla observable y consulta predeclaradas y valor numérico medido con la unidad y territorio coherentes.

El resultado debe respetar los relojes `targetAt \le outcomeObservedAt \le outcomeAvailableAt \le outcomeCapturedAt \le sourceCheckedAt`. Una fuente ausente, un resultado ambiguo, una discrepancia entre hashes, un cierre DISPUTED o dos verificaciones vigentes bloquean la puntuación, nunca se imputan como cero ni se transforman en éxito.

Los errores se calculan por parejas del mismo día y unidad:

[
 MAE_{M0}=n^{-1}\sum_i |y_i-\hat y_{M0,i}|,\quad
 MAE_{MIHM}=n^{-1}\sum_i |y_i-\hat y_{MIHM,i}|.
]

[
 \Delta MAE=MAE_{M0}-MAE_{MIHM}.
]

También se informa cobertura empírica de las bandas nominales del 90%, cantidad de registros bloqueados y pendientes. Una ganancia positiva es una mejora descriptiva de MAE; **no demuestra por sí sola superioridad estadística, perturbación causal, atractor, viabilidad o homeostasis**. Se declaran por adelantado al menos 30 parejas verificadas para habilitar una revisión descriptiva. No hay promoción canónica automática incluso con 30.

## 4. Comparadores y refutación

- M0: baseline clásico con la misma información congelada, mismo observable, territorio y fecha objetivo.
- M1: estimador MIHM explícitamente versionado, sin acceso a fuentes adicionales al momento de emisión.
- Rechazo de la hipótesis de mejora: `MAE_{MIHM} >= MAE_{M0}`, inestabilidad entre ventanas, cobertura insuficiente, evidencia tardía o datos no homologables. Estos casos deben conservarse.
- Se recomienda reportar intervalos de incertidumbre por bloques temporales y gastos del cómputo en evaluación posterior; no se han medido todavía.
- Los comparadores de P2 y P3 son antecedentes adversos, **no observaciones prospectivas**.

## 5. Capacidad instalada frente a operación comprobada

| Capacidad | Estado |
| --- | --- |
| P3 archivado y contrastado | OBSERVADO en GitHub |
| Registro de predicciones y servicio de verificación existente | OBSERVADO en el código SFI; operación en producción NO EVALUADA en esta tarea |
| Evaluador puro de P4 y guardias de cronología, fuente, unidad, empate y pérdida | IMPLEMENTADO EN PR; sujeto a CI |
| Salida P4 con las fuentes originales P3 | BLOQUEADA legítimamente |
| Nueva predicción registrada antes de un T0 futuro | NO OBSERVADO |
| Registros reales admisibles y evaluados de T1 | NO OBSERVADO |
| Validación científica / homeostasis / RETURN | NO DEMOSTRADO |

**Importante:** la adaptación permite evaluar datos **cuando existan** en las tablas existentes; no asegura que esas tablas incluyan predicciones numéricas en el formato P4. El registro no se consultó en el replay offline. Las muestras numéricas artificiales de los tests son únicamente pruebas aritméticas del código, nunca recibos institucionales.

## 6. Ejecución reproducible sin nuevas escrituras

```bash
node --import tsx --test src/lib/mihm/foundationProspectiveScoring.test.ts
node --import tsx scripts/research/mihm-foundation-p4-readiness.ts
```

Ambas operaciones se incorporan a los workflows existentes de MIHM y SFI; los tests no modifican el contenido de P3 ni las tablas. El reporte de readiness se deriva directamente de la evidencia P3 y declara `prospectiveRegistryQueried=false`.

## 7. Próximo hecho que puede cambiar el estado

Usar un caso existente de Case Platform con identidad y autorización operativa verificadas. Al momento de una observación futura, **emitir y persistir** una predicción cuantitativa en el registro existente junto a sus fuentes disponibles en T0. Después del objetivo, la verificación humana o gobernada registra los valores del proveedor y su evidencia mediante su mecanismo actual. Solo entonces P4 puede demostrar cuántas predicciones se verificaron y comparar el desempeño; el mero diseño no produce esos RETURN.

El siguiente paso **no exige nuevas herramientas, nuevas tablas ni elegir a mano los coeficientes 0.35/0.5**. Tampoco autoriza modificar producción, gates de acceso, gobernanza, canon ni clientes. Si las fuentes necesarias no tienen disponibilidad real anterior al objetivo, se abstiene.
